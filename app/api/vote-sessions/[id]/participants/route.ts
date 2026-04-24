import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';
import type { VoteSessionParticipant } from '@/types/voting';

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToParticipant(r: Record<string, unknown>): VoteSessionParticipant {
  return {
    id: r.id as string,
    vote_session_id: r.vote_session_id as string,
    participant_id: r.participant_id as string,
    photo_url: (r.photo_url as string) ?? null,
    added_at: r.added_at as string,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ participants: [] });
  }

  const { id } = await params;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, vote_session_id, participant_id, photo_url, added_at
      FROM vote_session_participants WHERE vote_session_id = ${id}
      ORDER BY added_at ASC
    `;
    return NextResponse.json({ participants: rows.map(rowToParticipant) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching vote session participants:', error);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id, photo_url } = body as {
    participant_id?: unknown;
    photo_url?: unknown;
  };

  if (typeof participant_id !== 'string' || !VALID_PARTICIPANTS.includes(participant_id)) {
    return NextResponse.json({ error: `participant_id must be one of: ${VALID_PARTICIPANTS.join(', ')}` }, { status: 400 });
  }

  const photoValue = photo_url != null && typeof photo_url === 'string' && photo_url.length > 0
    ? photo_url
    : null;

  try {
    const sql = getDb();

    // Verify the session exists
    const sessionCheck = await sql`SELECT id FROM vote_sessions WHERE id = ${id}`;
    if (sessionCheck.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    const rows = await sql`
      INSERT INTO vote_session_participants (vote_session_id, participant_id, photo_url)
      VALUES (${id}, ${participant_id}, ${photoValue})
      RETURNING id, vote_session_id, participant_id, photo_url, added_at
    `;
    return NextResponse.json(rowToParticipant(rows[0]), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('unique')) {
      return NextResponse.json({ error: 'Participant already added to this session' }, { status: 409 });
    }
    console.error('Error adding participant to vote session:', error);
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 });
  }
}
