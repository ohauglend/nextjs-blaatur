import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';

const VALID_PARTICIPANTS = Object.keys(PARTICIPANTS);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const { participantId } = await params;

  if (!VALID_PARTICIPANTS.includes(participantId)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT count FROM beer_counts WHERE participant_id = ${participantId}
    `;
    return NextResponse.json({ count: rows.length > 0 ? Number(rows[0].count) : 0 }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching beer count:', error);
    return NextResponse.json({ error: 'Failed to fetch beer count' }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const { participantId } = await params;

  if (!VALID_PARTICIPANTS.includes(participantId)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 404 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO beer_counts (participant_id, count, updated_at)
      VALUES (${participantId}, 1, NOW())
      ON CONFLICT (participant_id) DO UPDATE
        SET count = beer_counts.count + 1,
            updated_at = NOW()
      RETURNING count
    `;
    return NextResponse.json({ count: Number(rows[0].count) });
  } catch (error) {
    console.error('Error incrementing beer count:', error);
    return NextResponse.json({ error: 'Failed to increment beer count' }, { status: 500 });
  }
}
