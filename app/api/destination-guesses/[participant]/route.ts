import { NextRequest, NextResponse } from 'next/server';
import { DestinationGuessService } from '@/lib/db';
import { isValidParticipant } from '@/utils/participantUtils';

interface RouteContext {
  params: Promise<{
    participant: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // For local development, return sample data for the participant
  if (process.env.NODE_ENV === 'development') {
    const { participant } = await context.params;
    
    return NextResponse.json({
      success: true,
      message: 'Local development mode - showing sample data for participant',
      data: [
        {
          id: 1,
          participant_id: participant,
          guess: null,
          city_name: 'Prague',
          country: 'Czech Republic',
          latitude: 50.0755,
          longitude: 14.4378,
          is_active: true,
          distance_km: null,
          is_correct_destination: false,
          created_at: new Date().toISOString()
        }
      ]
    });
  }

  // Check if we have database connection
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up DATABASE_URL environment variable.' },
      { status: 503 }
    );
  }

  try {
    const { participant } = await context.params;

    // Validate participant exists
    if (!isValidParticipant(participant)) {
      return NextResponse.json(
        { error: 'Invalid participant ID' },
        { status: 400 }
      );
    }

    // Get guesses for this participant
    const guesses = await DestinationGuessService.getGuessesByParticipant(participant);

    return NextResponse.json({
      success: true,
      data: guesses,
      participantId: participant
    });

  } catch (error) {
    console.error(`Error in GET /api/destination-guesses/${context.params}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}