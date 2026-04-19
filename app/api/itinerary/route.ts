import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export type ItineraryType = 'summary' | 'day-1' | 'day-2';

export interface ItineraryItem {
  id: number;
  itinerary_type: ItineraryType;
  datetime: string;
  text: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

const VALID_TYPES: ItineraryType[] = ['summary', 'day-1', 'day-2'];

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToItem(r: Record<string, unknown>): ItineraryItem {
  return {
    id: r.id as number,
    itinerary_type: r.itinerary_type as ItineraryType,
    datetime: r.datetime as string,
    text: r.text as string,
    emoji: r.emoji as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const type = request.nextUrl.searchParams.get('type');

  if (!type || !VALID_TYPES.includes(type as ItineraryType)) {
    return NextResponse.json(
      { error: `type query param is required and must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, itinerary_type, datetime, text, emoji, created_at, updated_at
      FROM itinerary_items
      WHERE itinerary_type = ${type}
      ORDER BY datetime ASC
    `;
    return NextResponse.json(rows.map(rowToItem), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching itinerary items:', error);
    return NextResponse.json({ error: 'Failed to fetch itinerary items' }, { status: 500 });
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

  const { itinerary_type, datetime, text, emoji } = body as {
    itinerary_type?: unknown;
    datetime?: unknown;
    text?: unknown;
    emoji?: unknown;
  };

  if (typeof itinerary_type !== 'string' || !VALID_TYPES.includes(itinerary_type as ItineraryType)) {
    return NextResponse.json(
      { error: `itinerary_type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  if (typeof datetime !== 'string' || isNaN(Date.parse(datetime))) {
    return NextResponse.json({ error: 'datetime must be a valid ISO date string' }, { status: 400 });
  }

  if (typeof text !== 'string' || text.length < 1 || text.length > 300) {
    return NextResponse.json({ error: 'text is required and must be 1–300 characters' }, { status: 400 });
  }

  const emojiValue =
    emoji != null && typeof emoji === 'string' && emoji.length > 0
      ? emoji.slice(0, 10)
      : '📅';

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO itinerary_items (itinerary_type, datetime, text, emoji)
      VALUES (${itinerary_type}, ${datetime}, ${text}, ${emojiValue})
      RETURNING id, itinerary_type, datetime, text, emoji, created_at, updated_at
    `;
    return NextResponse.json(rowToItem(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating itinerary item:', error);
    return NextResponse.json({ error: 'Failed to create itinerary item' }, { status: 500 });
  }
}
