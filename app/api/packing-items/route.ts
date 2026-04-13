import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { PackingItem, PackingCategory } from '@/types/packing';

const VALID_CATEGORIES: PackingCategory[] = ['clothing', 'electronics', 'personal', 'documents', 'special'];
const VALID_PARTICIPANTS = ['oskar', 'odd', 'aasmund', 'emilie', 'mathias', 'brage', 'sara', 'johanna', 'everyone'];

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

function rowToPackingItem(r: Record<string, unknown>): PackingItem {
  return {
    id: r.id as number,
    text: r.text as string,
    category: r.category as PackingCategory,
    emoji_override: (r.emoji_override as string) ?? null,
    participant_id: r.participant_id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const participant = request.nextUrl.searchParams.get('participant');

  try {
    const sql = getDb();
    let rows;

    if (participant) {
      if (!VALID_PARTICIPANTS.includes(participant) || participant === 'everyone') {
        return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
      }
      rows = await sql`
        SELECT id, text, category, emoji_override, participant_id, created_at, updated_at
        FROM packing_items
        WHERE participant_id = ${participant} OR participant_id = 'everyone'
        ORDER BY created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT id, text, category, emoji_override, participant_id, created_at, updated_at
        FROM packing_items
        ORDER BY created_at ASC
      `;
    }

    return NextResponse.json(rows.map(rowToPackingItem), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching packing items:', error);
    return NextResponse.json({ error: 'Failed to fetch packing items' }, { status: 500 });
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

  const { text, category, emoji_override, participant_id } = body as {
    text?: unknown;
    category?: unknown;
    emoji_override?: unknown;
    participant_id?: unknown;
  };

  if (typeof text !== 'string' || text.length < 1 || text.length > 200) {
    return NextResponse.json({ error: 'text is required and must be 1–200 characters' }, { status: 400 });
  }

  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as PackingCategory)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
  }

  if (typeof participant_id !== 'string' || !VALID_PARTICIPANTS.includes(participant_id)) {
    return NextResponse.json({ error: `participant_id must be one of: ${VALID_PARTICIPANTS.join(', ')}` }, { status: 400 });
  }

  const emojiOverride = emoji_override != null && typeof emoji_override === 'string' && emoji_override.length > 0
    ? emoji_override.slice(0, 10)
    : null;

  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO packing_items (text, category, emoji_override, participant_id)
      VALUES (${text}, ${category}, ${emojiOverride}, ${participant_id})
      RETURNING id, text, category, emoji_override, participant_id, created_at, updated_at
    `;
    return NextResponse.json(rowToPackingItem(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating packing item:', error);
    return NextResponse.json({ error: 'Failed to create packing item' }, { status: 500 });
  }
}
