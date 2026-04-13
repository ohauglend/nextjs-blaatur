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

  const { text, category, emoji_override, participant_id } = body as {
    text?: unknown;
    category?: unknown;
    emoji_override?: unknown;
    participant_id?: unknown;
  };

  // Build SET clauses dynamically
  const updates: string[] = [];
  const values: unknown[] = [];

  if (text !== undefined) {
    if (typeof text !== 'string' || text.length < 1 || text.length > 200) {
      return NextResponse.json({ error: 'text must be 1–200 characters' }, { status: 400 });
    }
    updates.push('text');
    values.push(text);
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as PackingCategory)) {
      return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    updates.push('category');
    values.push(category);
  }

  if (emoji_override !== undefined) {
    const emojiVal = emoji_override != null && typeof emoji_override === 'string' && emoji_override.length > 0
      ? emoji_override.slice(0, 10)
      : null;
    updates.push('emoji_override');
    values.push(emojiVal);
  }

  if (participant_id !== undefined) {
    if (typeof participant_id !== 'string' || !VALID_PARTICIPANTS.includes(participant_id)) {
      return NextResponse.json({ error: `participant_id must be one of: ${VALID_PARTICIPANTS.join(', ')}` }, { status: 400 });
    }
    updates.push('participant_id');
    values.push(participant_id);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const sql = getDb();

    // Build the update. For emoji_override, we need to distinguish between
    // "not provided" (keep existing) and "explicitly set to null" (clear it).
    const hasText = updates.includes('text');
    const hasCategory = updates.includes('category');
    const hasEmoji = updates.includes('emoji_override');
    const hasParticipant = updates.includes('participant_id');

    const newText = hasText ? values[updates.indexOf('text')] as string : null;
    const newCategory = hasCategory ? values[updates.indexOf('category')] as string : null;
    const newEmojiVal = hasEmoji ? (values[updates.indexOf('emoji_override')] as string | null) : null;
    const newParticipant = hasParticipant ? values[updates.indexOf('participant_id')] as string : null;

    const rows = await sql`
      UPDATE packing_items
      SET
        text = COALESCE(${newText}, text),
        category = COALESCE(${newCategory}, category),
        emoji_override = CASE WHEN ${hasEmoji} THEN ${newEmojiVal} ELSE emoji_override END,
        participant_id = COALESCE(${newParticipant}, participant_id),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, text, category, emoji_override, participant_id, created_at, updated_at
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Packing item not found' }, { status: 404 });
    }

    return NextResponse.json(rowToPackingItem(rows[0]), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error updating packing item:', error);
    return NextResponse.json({ error: 'Failed to update packing item' }, { status: 500 });
  }
}

export async function DELETE(
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

  try {
    const sql = getDb();
    const rows = await sql`
      DELETE FROM packing_items WHERE id = ${id} RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Packing item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting packing item:', error);
    return NextResponse.json({ error: 'Failed to delete packing item' }, { status: 500 });
  }
}
