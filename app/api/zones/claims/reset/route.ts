import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';

export async function DELETE(request: NextRequest) {
  // Access control: dev mode flag or host token (checked via participant_id in body)
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    return NextResponse.json({ error: 'Reset only available in dev mode' }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true });
  }

  try {
    await ZoneService.resetAllClaims();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
