import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { distanceMeters } from '@/utils/zoneUtils';
import { isValidParticipant } from '@/utils/participantUtils';
import type { TeamColor, GamePhase } from '@/types/zones';

// Hardcoded mock challenge returned when DATABASE_URL is absent
const MOCK_CHALLENGE = {
  id: 0,
  text: '[Mock] Take a team photo at this zone. Bonus points for dramatic poses.',
  type: 'geography',
  zone_name: 'Mock Zone',
};

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

  const { participant_id, team_color, phase, lat, lng } = body as {
    participant_id?: unknown;
    team_color?: unknown;
    phase?: unknown;
    lat?: unknown;
    lng?: unknown;
  };

  // Field validation
  if (
    typeof participant_id !== 'string' ||
    typeof team_color !== 'string' ||
    typeof phase !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: participant_id, team_color, phase, lat, lng are required' },
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
    return NextResponse.json({
      success: true,
      challenge: { ...MOCK_CHALLENGE, zone_name: `Zone ${zoneId}` },
    });
  }

  try {
    // 1. Zone exists
    const zone = await ZoneService.getZoneById(zoneId);
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // 2. Proximity check (skipped when SKIP_LOCATION_CHECK=true)
    if (process.env.SKIP_LOCATION_CHECK !== 'true') {
      const distance = distanceMeters(lat, lng, zone.center_lat, zone.center_lng);
      if (distance > zone.radius_m) {
        return NextResponse.json(
          { error: 'too_far', distance_m: Math.round(distance * 10) / 10 },
          { status: 400 },
        );
      }
    }

    // 3. Already claimed for this zone+phase?
    const existing = await ZoneService.getClaimForZonePhase(zoneId, phase as GamePhase);
    if (existing) {
      return NextResponse.json(
        { error: 'already_claimed', team_color: existing.team_color },
        { status: 409 },
      );
    }

    // 4. Insert claim
    const { challenge } = await ZoneService.claimZone(
      zoneId,
      participant_id,
      team_color as TeamColor,
      phase as GamePhase,
    );

    return NextResponse.json({
      success: true,
      challenge: challenge
        ? {
            id: challenge.id,
            text: challenge.text,
            type: challenge.type,
            zone_name: zone.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Error claiming zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
