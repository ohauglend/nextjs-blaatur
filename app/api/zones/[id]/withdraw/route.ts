import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { isValidParticipant, getParticipant } from '@/utils/participantUtils';
import type { GamePhase } from '@/types/zones';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const zoneId = Number(idParam);
  if (Number.isNaN(zoneId) || zoneId <= 0) {
    return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id, phase } = body as { participant_id?: unknown; phase?: unknown };

  if (typeof participant_id !== 'string') {
    return NextResponse.json({ error: 'Missing participant_id' }, { status: 400 });
  }
  if (!isValidParticipant(participant_id)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 400 });
  }

  const participant = getParticipant(participant_id);
  if (participant.role !== 'host') {
    return NextResponse.json({ error: 'Only hosts can withdraw points' }, { status: 403 });
  }

  if (phase !== 'day1' && phase !== 'day2') {
    return NextResponse.json({ error: 'phase must be day1 or day2' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true });
  }

  try {
    const deleted = await ZoneService.withdrawZoneClaim(zoneId, phase as GamePhase);
    if (!deleted) {
      return NextResponse.json({ error: 'No active claim found for this zone and phase' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error withdrawing zone claim:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
