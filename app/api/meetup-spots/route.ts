import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const VALID_PARTICIPANTS = ['oskar', 'odd', 'aasmund', 'emilie', 'mathias', 'brage', 'sara', 'johanna'];

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

interface MeetupSpotRow {
  id: number;
  participant_id: string;
  address: string | null;
  meetup_time: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMeetupSpot(r: Record<string, unknown>): MeetupSpotRow {
  return {
    id: r.id as number,
    participant_id: r.participant_id as string,
    address: (r.address as string) ?? null,
    meetup_time: (r.meetup_time as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }

  const participant = request.nextUrl.searchParams.get('participant');

  try {
    const sql = getDb();

    if (participant) {
      if (!VALID_PARTICIPANTS.includes(participant)) {
        return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
      }
      const rows = await sql`
        SELECT id, participant_id, address, meetup_time, created_at, updated_at
        FROM meetup_spots
        WHERE participant_id = ${participant}
      `;
      if (rows.length === 0) {
        return NextResponse.json({ participant_id: participant, address: null, meetup_time: null }, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
      return NextResponse.json(rowToMeetupSpot(rows[0]), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    // No participant filter — return all rows (host use)
    const rows = await sql`
      SELECT id, participant_id, address, meetup_time, created_at, updated_at
      FROM meetup_spots
      ORDER BY participant_id ASC
    `;
    return NextResponse.json(rows.map(rowToMeetupSpot), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching meetup spots:', error);
    return NextResponse.json({ error: 'Failed to fetch meetup spots' }, { status: 500 });
  }
}
