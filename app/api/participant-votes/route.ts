import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';
import type { ParticipantVote } from '@/types/voting';

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToVote(r: Record<string, unknown>): ParticipantVote {
  return {
    id: r.id as string,
    vote_session_id: r.vote_session_id as string,
    voter_name: r.voter_name as string,
    voted_for: r.voted_for as string,
    voted_at: r.voted_at as string,
  };
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ votes: [] });
  }

  const voteSessionId = request.nextUrl.searchParams.get('vote_session_id');
  const voterName = request.nextUrl.searchParams.get('voter_name');

  if (!voteSessionId) {
    return NextResponse.json({ error: 'vote_session_id is required' }, { status: 400 });
  }

  try {
    const sql = getDb();
    let rows;

    if (voterName) {
      rows = await sql`
        SELECT id, vote_session_id, voter_name, voted_for, voted_at
        FROM participant_votes
        WHERE vote_session_id = ${voteSessionId} AND voter_name = ${voterName}
        ORDER BY voted_at ASC
      `;
    } else {
      rows = await sql`
        SELECT id, vote_session_id, voter_name, voted_for, voted_at
        FROM participant_votes
        WHERE vote_session_id = ${voteSessionId}
        ORDER BY voted_at ASC
      `;
    }

    return NextResponse.json({ votes: rows.map(rowToVote) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching participant votes:', error);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
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

  const { vote_session_id, voter_name, voted_for } = body as {
    vote_session_id?: unknown;
    voter_name?: unknown;
    voted_for?: unknown;
  };

  if (typeof vote_session_id !== 'string' || vote_session_id.length === 0) {
    return NextResponse.json({ error: 'vote_session_id is required' }, { status: 400 });
  }

  if (typeof voter_name !== 'string' || !VALID_PARTICIPANTS.includes(voter_name)) {
    return NextResponse.json({ error: 'voter_name must be a valid participant ID' }, { status: 400 });
  }

  if (typeof voted_for !== 'string' || !VALID_PARTICIPANTS.includes(voted_for)) {
    return NextResponse.json({ error: 'voted_for must be a valid participant ID' }, { status: 400 });
  }

  try {
    const sql = getDb();

    // Verify session exists and is active
    const sessionCheck = await sql`
      SELECT id, is_active FROM vote_sessions WHERE id = ${vote_session_id}
    `;
    if (sessionCheck.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }
    if (!sessionCheck[0].is_active) {
      return NextResponse.json({ error: 'Vote session is not active' }, { status: 400 });
    }

    // Verify voted_for is an eligible participant in this session
    const eligibleCheck = await sql`
      SELECT id FROM vote_session_participants
      WHERE vote_session_id = ${vote_session_id} AND participant_id = ${voted_for}
    `;
    if (eligibleCheck.length === 0) {
      return NextResponse.json({ error: 'voted_for is not an eligible participant in this session' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO participant_votes (vote_session_id, voter_name, voted_for)
      VALUES (${vote_session_id}, ${voter_name}, ${voted_for})
      RETURNING id, vote_session_id, voter_name, voted_for, voted_at
    `;

    return NextResponse.json({ success: true, vote: rowToVote(rows[0]) }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('unique')) {
      return NextResponse.json({ error: 'You have already voted in this session' }, { status: 409 });
    }
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }
}
