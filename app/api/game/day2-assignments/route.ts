import { NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function GET() {
  // No database: return empty assignments
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ assignments: [] });
  }

  try {
    const assignments = await ZoneService.getDay2Assignments();
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching Day 2 assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch Day 2 assignments' }, { status: 500 });
  }
}
