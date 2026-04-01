import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { MOCK_ZONES } from '@/utils/zoneUtils';
import type { GamePhase } from '@/types/zones';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') ?? 'day1';

  if (phase !== 'day1' && phase !== 'day2') {
    return NextResponse.json({ error: 'Invalid phase. Must be day1 or day2.' }, { status: 400 });
  }

  // No database: return zones with no claims (works in dev and production-without-DB)
  if (!process.env.DATABASE_URL) {
    const zonesWithClaims = MOCK_ZONES.map((zone) => ({
      ...zone,
      polygon_geojson: null,
      claim: null,
      challenge: null,
    }));
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
