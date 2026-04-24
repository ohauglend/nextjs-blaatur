import { NextResponse } from 'next/server';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PARTICIPANTS } from '@/data/participants';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!PARTICIPANTS[id]) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 404 });
  }

  const dir = path.join(process.cwd(), 'data', 'participants', id);
  try {
    const files = await readdir(dir);
    const photos = files
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .sort();
    return NextResponse.json({ photos });
  } catch (err) {
    console.error(`Failed to list photos for ${id}:`, err);
    return NextResponse.json({ photos: [] });
  }
}
