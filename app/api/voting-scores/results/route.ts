import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Legacy question keys (kept for backward compatibility with existing voting_scores table)
const VOTING_QUESTION_KEYS = ['most_drunk', 'closest_destination'];

export async function GET(request: NextRequest) {
  const question_key = request.nextUrl.searchParams.get('question_key');

  if (!question_key || !VOTING_QUESTION_KEYS.includes(question_key)) {
    return NextResponse.json({ error: 'Invalid question_key' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ results: [] });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT target_id,
             AVG(score)::float AS avg_score,
             COUNT(*)::int     AS voter_count
      FROM voting_scores
      WHERE question_key = ${question_key}
      GROUP BY target_id
    `;
    return NextResponse.json({
      results: rows.map((r) => ({
        target_id: r.target_id as string,
        avg_score: Number(r.avg_score),
        voter_count: Number(r.voter_count),
      })),
    });
  } catch (error) {
    console.error('Error fetching voting results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
