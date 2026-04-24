import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { VoteSessionResults } from '@/types/voting';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const sql = getDb();

    // Fetch the session to determine type
    const sessionRows = await sql`
      SELECT id, preset_type FROM vote_sessions WHERE id = ${id}
    `;
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    const presetType = sessionRows[0].preset_type as string | null;

    // Get eligible participants for this session
    const eligibleRows = await sql`
      SELECT participant_id FROM vote_session_participants WHERE vote_session_id = ${id}
    `;
    const eligibleCount = eligibleRows.length;

    if (presetType === 'closest_destination') {
      return await handleClosestDestination(sql, id, eligibleRows, eligibleCount);
    }

    return await handleRegularVote(sql, id, eligibleCount);
  } catch (error) {
    console.error('Error fetching vote session results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

async function handleRegularVote(
  sql: ReturnType<typeof neon>,
  sessionId: string,
  eligibleCount: number,
): Promise<NextResponse> {
  // Get all votes for this session
  const voteRows = await sql`
    SELECT voted_for, COUNT(*) as vote_count
    FROM participant_votes WHERE vote_session_id = ${sessionId}
    GROUP BY voted_for
    ORDER BY vote_count DESC, voted_for ASC
  `;

  const totalVotersRows = await sql`
    SELECT COUNT(DISTINCT voter_name) as count
    FROM participant_votes WHERE vote_session_id = ${sessionId}
  `;
  const totalVoters = Number(totalVotersRows[0].count);

  const tally = voteRows.map(r => ({
    participant_id: r.voted_for as string,
    vote_count: Number(r.vote_count),
  }));

  const isComplete = totalVoters >= eligibleCount && eligibleCount > 0;

  // Determine winners: all with the highest vote count
  let winnerIds: string[] = [];
  if (tally.length > 0) {
    const maxVotes = tally[0].vote_count;
    winnerIds = tally
      .filter(t => t.vote_count === maxVotes)
      .map(t => t.participant_id)
      .sort();
  }

  const result: VoteSessionResults = {
    vote_session_id: sessionId,
    tally,
    winner_ids: winnerIds,
    total_voters: totalVoters,
    eligible_voter_count: eligibleCount,
    is_complete: isComplete,
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function handleClosestDestination(
  sql: ReturnType<typeof neon>,
  sessionId: string,
  eligibleRows: Record<string, unknown>[],
  eligibleCount: number,
): Promise<NextResponse> {
  const eligibleIds = eligibleRows.map(r => r.participant_id as string);

  if (eligibleIds.length === 0) {
    const result: VoteSessionResults = {
      vote_session_id: sessionId,
      tally: [],
      winner_ids: [],
      total_voters: 0,
      eligible_voter_count: 0,
      is_complete: true,
    };
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Get destination guesses for eligible participants, ordered by distance
  const guessRows = await sql`
    SELECT participant_id, distance_km
    FROM destination_guesses
    WHERE is_active = true AND participant_id = ANY(${eligibleIds})
    ORDER BY distance_km ASC NULLS LAST, participant_id ASC
  `;

  const tally = guessRows.map(r => ({
    participant_id: r.participant_id as string,
    vote_count: 0,
  }));

  // Winners: all with the minimum distance
  let winnerIds: string[] = [];
  if (guessRows.length > 0 && guessRows[0].distance_km != null) {
    const minDistance = Number(guessRows[0].distance_km);
    winnerIds = guessRows
      .filter(r => r.distance_km != null && Number(r.distance_km) === minDistance)
      .map(r => r.participant_id as string)
      .sort();
  }

  const result: VoteSessionResults = {
    vote_session_id: sessionId,
    tally,
    winner_ids: winnerIds,
    total_voters: 0,
    eligible_voter_count: eligibleCount,
    is_complete: true,
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
