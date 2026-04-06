import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { isHostToken } from '@/utils/hostAccess';

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('x-host-token') ?? '';
  if (!isHostToken(token)) {
    return NextResponse.json({ error: 'Host access required' }, { status: 403 });
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
