import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const claims = await ZoneService.getCompletedClaims();
    return NextResponse.json(claims);
  } catch (error) {
    console.error('Error fetching completed claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
