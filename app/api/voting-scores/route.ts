import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';

// Legacy question keys (kept for backward compatibility with existing voting_scores table)
const VOTING_QUESTION_KEYS = ['most_drunk', 'closest_destination'];

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

// In-memory dev store (used when no DATABASE_URL)
type DevKey = string; // `${voter}|${question}|${target}`
const devScores = new Map<DevKey, number>();

export async function GET(request: NextRequest) {
  const voter_id = request.nextUrl.searchParams.get('voter_id');
  const question_key = request.nextUrl.searchParams.get('question_key');

  if (!voter_id || !VALID_PARTICIPANTS.includes(voter_id)) {
    return NextResponse.json({ error: 'Invalid voter_id' }, { status: 400 });
  }
  if (!question_key || !VOTING_QUESTION_KEYS.includes(question_key)) {
    return NextResponse.json({ error: 'Invalid question_key' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    const scores: { target_id: string; score: number }[] = [];
    for (const [k, v] of devScores) {
      const [v_id, q_key, t_id] = k.split('|');
      if (v_id === voter_id && q_key === question_key) {
        scores.push({ target_id: t_id, score: v });
      }
    }
    return NextResponse.json({ scores });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT target_id, score
      FROM voting_scores
      WHERE voter_id = ${voter_id} AND question_key = ${question_key}
    `;
    return NextResponse.json({
      scores: rows.map((r) => ({ target_id: r.target_id as string, score: Number(r.score) })),
    });
  } catch (error) {
    console.error('Error fetching voting scores:', error);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { voter_id, question_key, scores } = body as {
    voter_id?: unknown;
    question_key?: unknown;
    scores?: unknown;
  };

  if (typeof voter_id !== 'string' || !VALID_PARTICIPANTS.includes(voter_id)) {
    return NextResponse.json({ error: 'Invalid voter_id' }, { status: 400 });
  }
  if (typeof question_key !== 'string' || !VOTING_QUESTION_KEYS.includes(question_key)) {
    return NextResponse.json({ error: 'Invalid question_key' }, { status: 400 });
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json({ error: 'scores must be a non-empty array' }, { status: 400 });
  }

  const normalized: { target_id: string; score: number }[] = [];
  for (const s of scores) {
    if (!s || typeof s !== 'object') {
      return NextResponse.json({ error: 'Invalid score entry' }, { status: 400 });
    }
    const { target_id, score } = s as { target_id?: unknown; score?: unknown };
    if (typeof target_id !== 'string' || !VALID_PARTICIPANTS.includes(target_id)) {
      return NextResponse.json({ error: `Invalid target_id: ${String(target_id)}` }, { status: 400 });
    }
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: `Invalid score for ${target_id}` }, { status: 400 });
    }
    normalized.push({ target_id, score: Math.round(score) });
  }

  if (!process.env.DATABASE_URL) {
    for (const { target_id, score } of normalized) {
      devScores.set(`${voter_id}|${question_key}|${target_id}`, score);
    }
    return NextResponse.json({ success: true, count: normalized.length });
  }

  try {
    const sql = getDb();
    for (const { target_id, score } of normalized) {
      await sql`
        INSERT INTO voting_scores (voter_id, question_key, target_id, score)
        VALUES (${voter_id}, ${question_key}, ${target_id}, ${score})
        ON CONFLICT (voter_id, question_key, target_id)
        DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
      `;
    }
    return NextResponse.json({ success: true, count: normalized.length });
  } catch (error) {
    console.error('Error upserting voting scores:', error);
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
  }
}
