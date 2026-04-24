import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';
import type { ScoreAdjustment } from '@/types/voting';

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);
const HOST_IDS = Object.values(PARTICIPANTS).filter(p => p.role === 'host').map(p => p.id);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToAdjustment(r: Record<string, unknown>): ScoreAdjustment {
  return {
    id: r.id as string,
    participant_id: r.participant_id as string,
    delta: r.delta as number,
    reason: (r.reason as string) ?? null,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
  };
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ adjustments: [] });
  }

  const participantId = request.nextUrl.searchParams.get('participant_id');

  try {
    const sql = getDb();
    let rows;

    if (participantId) {
      rows = await sql`
        SELECT id, participant_id, delta, reason, created_by, created_at
        FROM score_adjustments
        WHERE participant_id = ${participantId}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, participant_id, delta, reason, created_by, created_at
        FROM score_adjustments
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ adjustments: rows.map(rowToAdjustment) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching score adjustments:', error);
    return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id, delta, reason, created_by } = body as {
    participant_id?: unknown;
    delta?: unknown;
    reason?: unknown;
    created_by?: unknown;
  };

  if (typeof participant_id !== 'string' || !VALID_PARTICIPANTS.includes(participant_id)) {
    return NextResponse.json({ error: `participant_id must be one of: ${VALID_PARTICIPANTS.join(', ')}` }, { status: 400 });
  }

  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be a non-zero integer' }, { status: 400 });
  }

  if (typeof created_by !== 'string' || !HOST_IDS.includes(created_by)) {
    return NextResponse.json({ error: `created_by must be one of: ${HOST_IDS.join(', ')}` }, { status: 400 });
  }

  const reasonValue = reason != null && typeof reason === 'string' && reason.length > 0
    ? reason.slice(0, 500)
    : null;

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO score_adjustments (participant_id, delta, reason, created_by)
      VALUES (${participant_id}, ${delta}, ${reasonValue}, ${created_by})
      RETURNING id, participant_id, delta, reason, created_by, created_at
    `;
    return NextResponse.json(rowToAdjustment(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating score adjustment:', error);
    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 });
  }
}
