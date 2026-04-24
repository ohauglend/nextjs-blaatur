import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';
import type { VoteSession, VotePresetType } from '@/types/voting';

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);
const HOST_IDS = Object.values(PARTICIPANTS).filter(p => p.role === 'host').map(p => p.id);
const VALID_PRESET_TYPES: (VotePresetType | null)[] = ['closest_destination', null];

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

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ sessions: [] });
  }

  const sessionDay = request.nextUrl.searchParams.get('session_day');

  try {
    const sql = getDb();
    let rows;

    if (sessionDay) {
      const day = parseInt(sessionDay, 10);
      if (day !== 1 && day !== 2) {
        return NextResponse.json({ error: 'session_day must be 1 or 2' }, { status: 400 });
      }
      rows = await sql`
        SELECT id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
        FROM vote_sessions
        WHERE session_day = ${day}
        ORDER BY created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
        FROM vote_sessions
        ORDER BY created_at ASC
      `;
    }

    return NextResponse.json({ sessions: rows.map(rowToVoteSession) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching vote sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch vote sessions' }, { status: 500 });
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

  const { session_day, title, preset_type, points_tally, created_by } = body as {
    session_day?: unknown;
    title?: unknown;
    preset_type?: unknown;
    points_tally?: unknown;
    created_by?: unknown;
  };

  if (session_day !== 1 && session_day !== 2) {
    return NextResponse.json({ error: 'session_day must be 1 or 2' }, { status: 400 });
  }

  if (typeof title !== 'string' || title.length < 1 || title.length > 200) {
    return NextResponse.json({ error: 'title is required and must be 1–200 characters' }, { status: 400 });
  }

  const presetValue = preset_type === undefined ? null : preset_type;
  if (!VALID_PRESET_TYPES.includes(presetValue as VotePresetType | null)) {
    return NextResponse.json({ error: 'preset_type must be null or "closest_destination"' }, { status: 400 });
  }

  if (presetValue === 'closest_destination' && session_day !== 1) {
    return NextResponse.json({ error: 'closest_destination preset is only allowed for session_day 1' }, { status: 400 });
  }

  const tally = points_tally ?? 1;
  if (typeof tally !== 'number' || !Number.isInteger(tally) || tally < 0) {
    return NextResponse.json({ error: 'points_tally must be a non-negative integer' }, { status: 400 });
  }

  if (typeof created_by !== 'string' || !HOST_IDS.includes(created_by)) {
    return NextResponse.json({ error: `created_by must be one of: ${HOST_IDS.join(', ')}` }, { status: 400 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO vote_sessions (session_day, title, preset_type, points_tally, created_by)
      VALUES (${session_day}, ${title}, ${presetValue}, ${tally}, ${created_by})
      RETURNING id, session_day, title, preset_type, points_tally, is_active, created_by, created_at
    `;
    return NextResponse.json(rowToVoteSession(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating vote session:', error);
    return NextResponse.json({ error: 'Failed to create vote session' }, { status: 500 });
  }
}
