import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { MOCK_ZONES } from '@/utils/zoneUtils';
import type { Challenge } from '@/types/zones';

// Mock after-lunch (day2) challenges per zone id for dev testing
const MOCK_AFTER_LUNCH_CHALLENGES: Record<number, Challenge> = {
  2: { id: 901, zone_id: 2, phase: 'day2', text: '[Mock] Find and photograph the organ inside Doma Cathedral.', type: 'geography', participant_scope: 'team' },
  5: { id: 902, zone_id: 5, phase: 'day2', text: '[Mock] Recreate the pose of the Three Brothers buildings.', type: 'geography', participant_scope: 'team' },
  9: { id: 903, zone_id: 9, phase: 'day2', text: '[Mock] Buy a local snack from Livu Square and share it with the team.', type: 'generic', participant_scope: 'one' },
};

export async function GET() {
  // No database: return zones with mock day1 claims + after-lunch challenges
  if (!process.env.DATABASE_URL) {
    const zonesWithClaims = MOCK_ZONES.map((zone) => ({
      ...zone,
      polygon_geojson: null,
      claim: null,
      challenge: null,
      afterLunchChallenge: MOCK_AFTER_LUNCH_CHALLENGES[zone.id] ?? null,
    }));
    return NextResponse.json(zonesWithClaims);
  }

  try {
    const zonesWithClaims = await ZoneService.getZonesWithClaims();
    return NextResponse.json(zonesWithClaims);
  } catch (error) {
    console.error('Error fetching zones with claims:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
