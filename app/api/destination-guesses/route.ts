import { NextRequest, NextResponse } from 'next/server';
import { DestinationGuessService } from '@/lib/db';
import { isValidParticipant } from '@/utils/participantUtils';

export async function POST(request: NextRequest) {
  // No database: simulate success
  if (!process.env.DATABASE_URL) {
    const body = await request.json();
    const { participantId, cityName, country, latitude, longitude } = body;

    // Validate required fields
    if (!participantId || !cityName || !country || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Participant ID, city name, country, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      guess: {
        id: Math.floor(Math.random() * 1000),
        participant_id: participantId,
        guess: null,
        city_name: cityName,
        country: country,
        latitude: latitude,
        longitude: longitude,
        is_active: true,
        distance_km: null,
        is_correct_destination: false,
        created_at: new Date().toISOString()
      }
    });
  }

  try {
    const body = await request.json();
    const { participantId, cityName, country, latitude, longitude } = body;

    // Validate required fields
    if (!participantId || !cityName || !country || latitude === undefined || longitude === undefined) {
      console.error('Validation error - missing required fields:', { participantId, cityName, country, latitude, longitude });
      return NextResponse.json(
        { error: 'Participant ID, city name, country, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Validate participant exists in our system
    if (!isValidParticipant(participantId)) {
      console.error('Invalid participant:', participantId);
      return NextResponse.json(
        { error: 'Invalid participant' },
        { status: 400 }
      );
    }

    console.log('Creating destination guess for participant:', participantId, { cityName, country, latitude, longitude });
    
    const destinationGuess = await DestinationGuessService.createGuess(
      participantId, 
      cityName, 
      country, 
      latitude, 
      longitude
    );
    
    console.log('Successfully created destination guess:', destinationGuess.id);
    
    return NextResponse.json({
      success: true,
      guess: destinationGuess
    });

  } catch (error) {
    // Enhanced error logging for production debugging
    console.error('Error creating guess - Full error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // No database: return empty list
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true, guesses: [] });
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