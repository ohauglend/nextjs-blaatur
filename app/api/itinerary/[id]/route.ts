import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { ItineraryItem, ItineraryType } from '../route';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { datetime, text, emoji } = body as {
    datetime?: unknown;
    text?: unknown;
    emoji?: unknown;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (datetime !== undefined) {
    if (typeof datetime !== 'string' || isNaN(Date.parse(datetime))) {
      return NextResponse.json({ error: 'datetime must be a valid ISO date string' }, { status: 400 });
    }
    updates.push('datetime');
    values.push(datetime);
  }

  if (text !== undefined) {
    if (typeof text !== 'string' || text.length < 1 || text.length > 300) {
      return NextResponse.json({ error: 'text must be 1–300 characters' }, { status: 400 });
    }
    updates.push('text');
    values.push(text);
  }

  if (emoji !== undefined) {
    const emojiVal =
      emoji != null && typeof emoji === 'string' && emoji.length > 0
        ? emoji.slice(0, 10)
        : '📅';
    updates.push('emoji');
    values.push(emojiVal);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const sql = getDb();

    const hasDatetime = updates.includes('datetime');
    const hasText = updates.includes('text');
    const hasEmoji = updates.includes('emoji');

    const dtVal = hasDatetime ? values[updates.indexOf('datetime')] : null;
    const txtVal = hasText ? values[updates.indexOf('text')] : null;
    const emojiVal = hasEmoji ? values[updates.indexOf('emoji')] : null;

    const rows = await sql`
      UPDATE itinerary_items
      SET
        datetime   = CASE WHEN ${hasDatetime} THEN ${dtVal}::timestamptz ELSE datetime END,
        text       = CASE WHEN ${hasText}     THEN ${txtVal}::text       ELSE text END,
        emoji      = CASE WHEN ${hasEmoji}    THEN ${emojiVal}::varchar  ELSE emoji END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, itinerary_type, datetime, text, emoji, created_at, updated_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(rowToItem(rows[0]));
  } catch (error) {
    console.error('Error updating itinerary item:', error);
    return NextResponse.json({ error: 'Failed to update itinerary item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
  }

  try {
    const sql = getDb();
    const rows = await sql`
      DELETE FROM itinerary_items WHERE id = ${id} RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting itinerary item:', error);
    return NextResponse.json({ error: 'Failed to delete itinerary item' }, { status: 500 });
  }
}
