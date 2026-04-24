import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PARTICIPANTS } from '@/data/participants';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await params;
  if (!PARTICIPANTS[id]) {
    return new NextResponse('Unknown participant', { status: 404 });
  }
  // Prevent path traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return new NextResponse('Invalid filename', { status: 400 });
  }
  const ext = path.extname(filename).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    return new NextResponse('Unsupported file type', { status: 415 });
  }

  const filePath = path.join(process.cwd(), 'data', 'participants', id, filename);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
