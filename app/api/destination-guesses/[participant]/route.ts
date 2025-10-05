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
  // Check if we have database connection
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up Vercel Postgres.' },
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