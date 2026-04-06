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

    // 3. Phase-specific claim logic
    if (phase === 'day1') {
      // Day 1: simple claim — reject if already taken
      const existing = await ZoneService.getClaimForZonePhase(zoneId, 'day1');
      if (existing) {
        return NextResponse.json(
          { error: 'already_claimed', team_color: existing.team_color },
          { status: 409 },
        );
      }

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

    // --- Day 2 logic: fresh claim OR steal ---

    // Look up the participant's Day 2 team assignment
    const day2Assignments = await ZoneService.getDay2Assignments();
    const myAssignment = day2Assignments.find((a) => a.participant_id === participant_id);
    if (!myAssignment) {
      return NextResponse.json(
        { error: 'Day 2 transition has not occurred yet, or participant has no assignment' },
        { status: 400 },
      );
    }
    const myDay2Color = myAssignment.day2_team_color as TeamColor;

    // Check for existing day2 claim on this zone
    const existingDay2 = await ZoneService.getClaimForZonePhase(zoneId, 'day2');

    if (!existingDay2) {
      // Also check if there is a day1 claim that could be a steal target.
      // Day 1 claims are in a separate phase row. In Day 2, if the zone has
      // no day2 claim yet, it is available for a fresh day2 claim.
      const { challenge } = await ZoneService.claimZone(
        zoneId,
        participant_id,
        myDay2Color,
        'day2',
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

    // There IS an existing day2 claim — evaluate steal conditions

    // Map the existing claim's team_color to its Day 2 merged color
    const claimDay2Color =
      day2Assignments.find((a) => a.day1_team_color === existingDay2.team_color)?.day2_team_color
      ?? existingDay2.team_color;

    // Own team cannot steal from itself
    if (claimDay2Color === myDay2Color) {
      return NextResponse.json(
        { error: 'own_team', team_color: existingDay2.team_color },
        { status: 409 },
      );
    }

    // Completed zones are immune
    if (existingDay2.completed) {
      return NextResponse.json(
        { error: 'completed_immune', team_color: existingDay2.team_color },
        { status: 409 },
      );
    }

    // Already stolen once — permanently locked
    if (existingDay2.steal_locked) {
      return NextResponse.json(
        { error: 'steal_locked', team_color: existingDay2.team_color },
        { status: 409 },
      );
    }

    // All checks pass — perform the steal
    const { challenge: stealChallenge } = await ZoneService.stealZone(
      zoneId,
      existingDay2,
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
