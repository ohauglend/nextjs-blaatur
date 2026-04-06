import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid challenge id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text } = body as { text?: unknown };

  if (typeof text !== 'string' || text.length < 1 || text.length > 300) {
    return NextResponse.json(
      { error: 'text is required and must be 1–300 characters' },
      { status: 400 },
    );
  }

  try {
    const updated = await ZoneService.updateChallenge(id, text);
    if (!updated) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 });
  }
}
