import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { VoteSession, VoteSessionParticipant, VotePresetType } from '@/types/voting';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToVoteSession(r: Record<string, unknown>): VoteSession {
  return {
    id: r.id as string,
    session_day: r.session_day as 1 | 2,
    title: r.title as string,
    preset_type: (r.preset_type as VotePresetType) ?? null,
    points_tally: r.points_tally as number,
    is_active: r.is_active as boolean,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
  };
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { id } = await params;

  try {
    const sql = getDb();
    const sessionRows = await sql`
      SELECT id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      FROM vote_sessions WHERE id = ${id}
    `;

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    const participantRows = await sql`
      SELECT id, vote_session_id, participant_id, photo_url, added_at
      FROM vote_session_participants WHERE vote_session_id = ${id}
      ORDER BY added_at ASC
    `;

    return NextResponse.json({
      session: rowToVoteSession(sessionRows[0]),
      participants: participantRows.map(rowToParticipant),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching vote session:', error);
    return NextResponse.json({ error: 'Failed to fetch vote session' }, { status: 500 });
  }
}

export async function PUT(
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

  const { title, points_tally, is_active } = body as {
    title?: unknown;
    points_tally?: unknown;
    is_active?: unknown;
  };

  if (title !== undefined && (typeof title !== 'string' || title.length < 1 || title.length > 200)) {
    return NextResponse.json({ error: 'title must be 1–200 characters' }, { status: 400 });
  }

  if (points_tally !== undefined && (typeof points_tally !== 'number' || !Number.isInteger(points_tally) || points_tally < 0)) {
    return NextResponse.json({ error: 'points_tally must be a non-negative integer' }, { status: 400 });
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
  }

  try {
    const sql = getDb();

    // Build SET clauses dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { updates.push('title'); values.push(title); }
    if (points_tally !== undefined) { updates.push('points_tally'); values.push(points_tally); }
    if (is_active !== undefined) { updates.push('is_active'); values.push(is_active); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Use individual queries based on which fields are provided
    let rows;
    if (title !== undefined && points_tally !== undefined && is_active !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET title = ${title}, points_tally = ${points_tally}, is_active = ${is_active}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else if (title !== undefined && points_tally !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET title = ${title}, points_tally = ${points_tally}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else if (title !== undefined && is_active !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET title = ${title}, is_active = ${is_active}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else if (points_tally !== undefined && is_active !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET points_tally = ${points_tally}, is_active = ${is_active}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else if (title !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET title = ${title}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else if (points_tally !== undefined) {
      rows = await sql`
        UPDATE vote_sessions SET points_tally = ${points_tally}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    } else {
      rows = await sql`
        UPDATE vote_sessions SET is_active = ${is_active}
        WHERE id = ${id}
        RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    return NextResponse.json(rowToVoteSession(rows[0]));
  } catch (error) {
    console.error('Error updating vote session:', error);
    return NextResponse.json({ error: 'Failed to update vote session' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const sql = getDb();

    // Check if any votes have been cast
    const voteCheck = await sql`
      SELECT COUNT(*) as count FROM participant_votes WHERE vote_session_id = ${id}
    `;
    if (Number(voteCheck[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete session with existing votes. Deactivate it instead.' },
        { status: 409 },
      );
    }

    const rows = await sql`DELETE FROM vote_sessions WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote session:', error);
    return NextResponse.json({ error: 'Failed to delete vote session' }, { status: 500 });
  }
}
