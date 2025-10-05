import { NextRequest, NextResponse } from 'next/server';
import { DestinationGuessService } from '@/lib/db';
import { isValidParticipant } from '@/utils/participantUtils';

export async function POST(request: NextRequest) {
  // Check if we have database connection
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up Vercel Postgres.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { participantId, guess } = body;

    // Validation
    if (!participantId || !guess) {
      return NextResponse.json(
        { error: 'participantId and guess are required' },
        { status: 400 }
      );
    }

    if (typeof participantId !== 'string' || typeof guess !== 'string') {
      return NextResponse.json(
        { error: 'participantId and guess must be strings' },
        { status: 400 }
      );
    }

    // Validate participant exists
    if (!isValidParticipant(participantId)) {
      return NextResponse.json(
        { error: 'Invalid participant ID' },
        { status: 400 }
      );
    }

    // Sanitize guess (trim whitespace, limit length)
    const sanitizedGuess = guess.trim();
    if (sanitizedGuess.length === 0) {
      return NextResponse.json(
        { error: 'Guess cannot be empty' },
        { status: 400 }
      );
    }

    if (sanitizedGuess.length > 500) {
      return NextResponse.json(
        { error: 'Guess is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Create the guess
    const newGuess = await DestinationGuessService.createGuess(participantId, sanitizedGuess);

    return NextResponse.json({
      success: true,
      data: newGuess
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/destination-guesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if we have database connection
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up Vercel Postgres.' },
      { status: 503 }
    );
  }

  try {
    const guesses = await DestinationGuessService.getAllGuesses();
    
    return NextResponse.json({
      success: true,
      data: guesses
    });

  } catch (error) {
    console.error('Error in GET /api/destination-guesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}