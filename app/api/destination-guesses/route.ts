import { NextRequest, NextResponse } from 'next/server';
import { DestinationGuessService } from '@/lib/db';
import { isValidParticipant } from '@/utils/participantUtils';

export async function POST(request: NextRequest) {
  // For local development, simulate success without database
  if (process.env.NODE_ENV === 'development') {
    const body = await request.json();
    const { participantId, guess } = body;

    // Validate required fields
    if (!participantId || !guess) {
      return NextResponse.json(
        { error: 'Participant ID and guess are required' },
        { status: 400 }
      );
    }

    // Simulate successful response for local testing
    return NextResponse.json({
      success: true,
      message: 'Local development mode - guess would be saved in production',
      guess: {
        id: Math.floor(Math.random() * 1000),
        participant_id: participantId,
        guess: guess,
        created_at: new Date().toISOString()
      }
    });
  }

  // Check if we have database connection
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not yet configured. This feature will work after deployment to Vercel.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { participantId, guess } = body;

    // Validate required fields
    if (!participantId || !guess) {
      return NextResponse.json(
        { error: 'Participant ID and guess are required' },
        { status: 400 }
      );
    }

    // Validate participant exists in our system
    if (!isValidParticipant(participantId)) {
      return NextResponse.json(
        { error: 'Invalid participant' },
        { status: 400 }
      );
    }

    const destinationGuess = await DestinationGuessService.createGuess(participantId, guess);
    
    return NextResponse.json({
      success: true,
      guess: destinationGuess
    });

  } catch (error) {
    console.error('Error creating guess:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For local development, return sample data
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      success: true,
      message: 'Local development mode - showing sample data',
      guesses: [
        {
          id: 1,
          participant_id: 'emilie',
          guess: 'Prague',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          participant_id: 'mathias',
          guess: 'Barcelona',
          created_at: new Date().toISOString()
        }
      ]
    });
  }

  // Check if we have database connection
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not yet configured. This feature will work after deployment to Vercel.' },
      { status: 503 }
    );
  }

  try {
    const guesses = await DestinationGuessService.getAllGuesses();
    
    return NextResponse.json({
      success: true,
      guesses
    });

  } catch (error) {
    console.error('Error fetching guesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}