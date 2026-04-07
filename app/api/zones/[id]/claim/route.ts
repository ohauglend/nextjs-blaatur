import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { distanceMeters, MOCK_ZONES } from '@/utils/zoneUtils';
import { isValidParticipant } from '@/utils/participantUtils';
import type { TeamColor, GamePhase } from '@/types/zones';

// Hardcoded mock challenge returned when DATABASE_URL is absent
const MOCK_CHALLENGE = {
  id: 0,
  text: '[Mock] Take a team photo at this zone. Bonus points for dramatic poses.',
  type: 'geography',
  participant_scope: 'team',
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

  const { participant_id, team_color, after_lunch, lat, lng } = body as {
    participant_id?: unknown;
    team_color?: unknown;
    after_lunch?: unknown;
    lat?: unknown;
    lng?: unknown;
  };

  // Field validation
  if (
    typeof participant_id !== 'string' ||
    typeof team_color !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: participant_id, team_color, lat, lng are required' },
      { status: 400 },
    );
  }

  const afterLunch = after_lunch === true;

  if (!isValidParticipant(participant_id)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 400 });
  }

  if (!['red', 'yellow', 'blue', 'green'].includes(team_color)) {
    return NextResponse.json({ error: 'Invalid team_color' }, { status: 400 });
  }

  // No database: run proximity check against mock zone data, then return mock success
  if (!process.env.DATABASE_URL) {
    const mockZone = MOCK_ZONES.find((z) => z.id === zoneId);
    if (!mockZone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    if (process.env.SKIP_LOCATION_CHECK !== 'true') {
      const distance = distanceMeters(lat, lng, mockZone.center_lat, mockZone.center_lng);
      if (distance > mockZone.radius_m) {
        return NextResponse.json(
          { error: 'too_far', distance_m: Math.round(distance * 10) / 10 },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      challenge: { ...MOCK_CHALLENGE, zone_name: mockZone.name },
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

    // 3. Claim logic — always operates on day1 rows
    const existing = await ZoneService.getClaimForZonePhase(zoneId, 'day1');

    if (!existing) {
      // No existing claim — fresh claim for any phase
      const { challenge } = await ZoneService.claimZone(
        zoneId,
        participant_id,
        team_color as TeamColor,
        'day1',
      );

      return NextResponse.json({
        success: true,
        challenge: challenge
          ? {
              id: challenge.id,
              text: challenge.text,
              type: challenge.type,
              participant_scope: challenge.participant_scope,
              zone_name: zone.name,
            }
          : null,
      });
    }

    if (!afterLunch) {
      // Before lunch: zone already claimed, reject
      return NextResponse.json(
        { error: 'already_claimed', team_color: existing.team_color },
        { status: 409 },
      );
    }

    // --- After lunch: steal logic against day1 rows ---

    const day2Assignments = await ZoneService.getDay2Assignments();
    const myAssignment = day2Assignments.find((a) => a.participant_id === participant_id);
    if (!myAssignment) {
      return NextResponse.json(
        { error: 'After-lunch transition has not occurred yet, or participant has no assignment' },
        { status: 400 },
      );
    }
    const myDay2Color = myAssignment.day2_team_color as TeamColor;

    // Map existing claim's team to its merged day2 color
    const claimDay2Color =
      day2Assignments.find((a) => a.day1_team_color === existing.team_color)?.day2_team_color
      ?? existing.team_color;

    if (claimDay2Color === myDay2Color) {
      return NextResponse.json(
        { error: 'own_team', team_color: existing.team_color },
        { status: 409 },
      );
    }

    if (existing.steal_locked) {
      return NextResponse.json(
        { error: 'steal_locked', team_color: existing.team_color },
        { status: 409 },
      );
    }

    // All checks pass — perform the steal on the day1 row
    const { challenge: stealChallenge } = await ZoneService.stealZone(
      zoneId,
      existing,
      participant_id,
      myDay2Color,
    );

    return NextResponse.json({
      success: true,
      stolen: true,
      challenge: stealChallenge
        ? {
            id: stealChallenge.id,
            text: stealChallenge.text,
            type: stealChallenge.type,
            participant_scope: stealChallenge.participant_scope,
            zone_name: zone.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Error claiming zone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
