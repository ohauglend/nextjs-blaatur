import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function GET() {
  // No database: return zeroed scores
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      day1: { red: 0, yellow: 0, blue: 0, green: 0 },
      day2: { red: 0, yellow: 0, blue: 0, green: 0 },
    });
  }

  try {
    const scores = await ZoneService.getScores();
    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}
