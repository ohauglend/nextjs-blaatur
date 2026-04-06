import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const challenges = await ZoneService.getAllChallengesWithZoneNames();
    return NextResponse.json(challenges, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}
