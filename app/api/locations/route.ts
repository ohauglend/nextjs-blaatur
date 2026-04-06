import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { isValidParticipant } from '@/utils/participantUtils';
import type { TeamColor } from '@/types/zones';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id, team_color, lat, lng, accuracy } = body as {
    participant_id?: unknown;
    team_color?: unknown;
    lat?: unknown;
    lng?: unknown;
    accuracy?: unknown;
  };

  if (
    typeof participant_id !== 'string' ||
    typeof team_color !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: participant_id, team_color, lat, lng are required' },
      { status: 400 },
    );
  }

  if (!isValidParticipant(participant_id)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 400 });
  }

  if (!['red', 'yellow', 'blue', 'green'].includes(team_color)) {
    return NextResponse.json({ error: 'Invalid team_color' }, { status: 400 });
  }

  const accuracyValue = typeof accuracy === 'number' ? accuracy : null;

  // No database: silently accept
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true });
  }

  try {
    const location = await ZoneService.upsertLocation(
      participant_id,
      team_color as TeamColor,
      lat,
      lng,
      accuracyValue,
    );
    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Error upserting location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  // No database: return empty list
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const locations = await ZoneService.getAllLocations();
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
