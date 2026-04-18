import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const VALID_PARTICIPANTS = ['oskar', 'odd', 'aasmund', 'emilie', 'mathias', 'brage', 'sara', 'johanna'];

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ participant: string }> }
) {
  const { participant: participantParam } = await params;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const participant = participantParam;

  if (!VALID_PARTICIPANTS.includes(participant)) {
    return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { address, meetup_time } = body as {
    address?: unknown;
    meetup_time?: unknown;
  };

  // Validate address
  if (address !== undefined && address !== null) {
    if (typeof address !== 'string' || address.length > 300) {
      return NextResponse.json({ error: 'address must be a string of at most 300 characters' }, { status: 400 });
    }
  }

  // Validate meetup_time
  let parsedTime: string | null = null;
  if (meetup_time !== undefined && meetup_time !== null) {
    if (typeof meetup_time !== 'string') {
      return NextResponse.json({ error: 'meetup_time must be a valid ISO 8601 datetime string' }, { status: 400 });
    }
    const d = new Date(meetup_time);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'meetup_time must be a valid ISO 8601 datetime string' }, { status: 400 });
    }
    parsedTime = d.toISOString();
  }

  const addressValue = (address as string) ?? null;

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO meetup_spots (participant_id, address, meetup_time, updated_at)
      VALUES (${participant}, ${addressValue}, ${parsedTime}, NOW())
      ON CONFLICT (participant_id) DO UPDATE SET
        address = ${addressValue},
        meetup_time = ${parsedTime},
        updated_at = NOW()
      RETURNING id, participant_id, address, meetup_time, created_at, updated_at
    `;

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error upserting meetup spot:', error);
    return NextResponse.json({ error: 'Failed to save meetup spot' }, { status: 500 });
  }
}
