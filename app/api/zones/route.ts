import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { MOCK_ZONES } from '@/utils/zoneUtils';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(MOCK_ZONES);
  }

  try {
    const zones = await ZoneService.getAllZones();
    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
