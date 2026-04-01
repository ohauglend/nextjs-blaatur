import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { isValidParticipant } from '@/utils/participantUtils';
import type { TeamColor, GamePhase } from '@/types/zones';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const zoneId = Number(idParam);

  if (isNaN(zoneId) || zoneId <= 0) {
    return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id, team_color, phase } = body as {
    participant_id?: unknown;
    team_color?: unknown;
    phase?: unknown;
  };

  // Field validation
  if (
    typeof participant_id !== 'string' ||
    typeof team_color !== 'string' ||
    typeof phase !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: participant_id, team_color, phase are required' },
      { status: 400 },
    );
  }

  if (!isValidParticipant(participant_id)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 400 });
  }

  if (!['red', 'yellow', 'blue', 'green'].includes(team_color)) {
    return NextResponse.json({ error: 'Invalid team_color' }, { status: 400 });
  }

  if (phase !== 'day1' && phase !== 'day2') {
    return NextResponse.json({ error: 'Invalid phase. Must be day1 or day2.' }, { status: 400 });
  }

  // No database: return mock success
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true, team_total_points: 1 });
  }

  try {
    const result = await ZoneService.completeZone(
      zoneId,
      team_color as TeamColor,
      phase as GamePhase,
    );

    if (!result) {
      // Either the claim doesn't exist for this team, or it's already completed
      const existing = await ZoneService.getClaimForZonePhase(zoneId, phase as GamePhase);
      if (!existing || existing.team_color !== team_color) {
        return NextResponse.json(
          { error: 'No active claim for this zone and team' },
          { status: 404 },
        );
      }
      // Claim exists but already completed
      return NextResponse.json(
        { error: 'already_completed' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      team_total_points: result.teamTotalPoints,
    });
  } catch (error) {
    console.error('Error completing zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
