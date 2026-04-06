import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { MOCK_ZONES } from '@/utils/zoneUtils';
import type { GamePhase, ZoneClaim, Challenge } from '@/types/zones';

// Mock Day 2 pre-claimed zones for dev testing (3 zones claimed by rival "red" team)
const MOCK_DAY2_CLAIMS: Record<number, { claim: ZoneClaim; challenge: Challenge }> = {
  2: {
    claim: {
      id: 901, zone_id: 2, team_color: 'red', phase: 'day2',
      claimed_by_participant: 'emilie', claimed_at: '2026-04-01T10:00:00Z',
      completed: false, completed_at: null, steal_locked: false, points_awarded: false,
    },
    challenge: {
      id: 901, zone_id: 2, phase: 'day2',
      text: '[Mock] Find and photograph the organ inside Doma Cathedral.',
      type: 'geography', participant_scope: 'team',
    },
  },
  5: {
    claim: {
      id: 902, zone_id: 5, team_color: 'red', phase: 'day2',
      claimed_by_participant: 'mathias', claimed_at: '2026-04-01T10:05:00Z',
      completed: true, completed_at: '2026-04-01T10:30:00Z', steal_locked: true, points_awarded: true,
    },
    challenge: {
      id: 902, zone_id: 5, phase: 'day2',
      text: '[Mock] Recreate the pose of the Three Brothers buildings.',
      type: 'geography', participant_scope: 'team',
    },
  },
  9: {
    claim: {
      id: 903, zone_id: 9, team_color: 'red', phase: 'day2',
      claimed_by_participant: 'brage', claimed_at: '2026-04-01T11:00:00Z',
      completed: false, completed_at: null, steal_locked: false, points_awarded: false,
    },
    challenge: {
      id: 903, zone_id: 9, phase: 'day2',
      text: '[Mock] Buy a local snack from Livu Square and share it with the team.',
      type: 'generic', participant_scope: 'one',
    },
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') ?? 'day1';

  if (phase !== 'day1' && phase !== 'day2') {
    return NextResponse.json({ error: 'Invalid phase. Must be day1 or day2.' }, { status: 400 });
  }

  // No database: return zones with mock claims for dev testing
  if (!process.env.DATABASE_URL) {
    const mockClaims = phase === 'day2' ? MOCK_DAY2_CLAIMS : {};
    const zonesWithClaims = MOCK_ZONES.map((zone) => {
      const mock = mockClaims[zone.id as keyof typeof mockClaims];
      return {
        ...zone,
        polygon_geojson: null,
        claim: mock?.claim ?? null,
        challenge: mock?.challenge ?? null,
      };
    });
    return NextResponse.json(zonesWithClaims);
  }

  try {
    const zonesWithClaims = await ZoneService.getZonesWithClaims(phase as GamePhase);
    return NextResponse.json(zonesWithClaims);
  } catch (error) {
    console.error('Error fetching zones with claims:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
