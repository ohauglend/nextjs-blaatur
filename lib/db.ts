import { neon } from '@neondatabase/serverless';

export interface DestinationGuess {
  id: number;
  participant_id: string;
  guess: string | null;
  city_name: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  distance_km: number | null;
  is_correct_destination: boolean;
  created_at: string;
}

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
}

// Initialize the Neon connection
const sql = neon(process.env.DATABASE_URL!);

export class DestinationGuessService {
  
  /**
   * Create a new destination guess with city data
   */
  static async createGuess(
    participantId: string, 
    cityName: string,
    country: string,
    latitude: number,
    longitude: number,
    guess?: string
  ): Promise<DestinationGuess> {
    try {
      console.log('DB: Deactivating existing guesses for participant:', participantId);
      
      // First, deactivate any existing active guesses for this participant
      const updateResult = await sql`
        UPDATE destination_guesses
        SET is_active = false
        WHERE participant_id = ${participantId} AND is_active = true
      `;
      
      console.log('DB: Deactivated guesses, now inserting new guess');
      
      // Then insert the new guess as active
      const result = await sql`
        INSERT INTO destination_guesses (
          participant_id, 
          guess, 
          city_name, 
          country, 
          latitude, 
          longitude, 
          is_active,
          is_correct_destination
        )
        VALUES (
          ${participantId}, 
          ${guess || null}, 
          ${cityName}, 
          ${country}, 
          ${latitude}, 
          ${longitude}, 
          true,
          false
        )
        RETURNING *
      `;
      
      if (!result || result.length === 0) {
        console.error('DB: No result returned from INSERT query');
        throw new Error('No result returned from database insert');
      }
      
      console.log('DB: Successfully inserted guess with id:', result[0].id);
      
      return result[0] as DestinationGuess;
    } catch (error) {
      console.error('DB: Error creating destination guess:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        participantId,
        cityName,
        country,
        latitude,
        longitude
      });
      throw error;
    }
  }

  /**
   * Get all destination guesses
   */
  static async getAllGuesses(): Promise<DestinationGuess[]> {
    try {
      console.log('DB: Fetching all destination guesses');
      const result = await sql`
        SELECT *
        FROM destination_guesses
        ORDER BY created_at DESC
      `;
      
      console.log('DB: Fetched', result.length, 'guesses');
      return result as DestinationGuess[];
    } catch (error) {
      console.error('DB: Error fetching all destination guesses:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Get all guesses for a specific participant
   */
  static async getGuessesByParticipant(participantId: string): Promise<DestinationGuess[]> {
    try {
      console.log('DB: Fetching guesses for participant:', participantId);
      const result = await sql`
        SELECT *
        FROM destination_guesses
        WHERE participant_id = ${participantId}
        ORDER BY created_at DESC
      `;
      
      console.log('DB: Fetched', result.length, 'guesses for participant:', participantId);
      return result as DestinationGuess[];
    } catch (error) {
      console.error('DB: Error fetching participant guesses:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        participantId
      });
      throw error;
    }
  }

  /**
   * Initialize database table (for development)
   */
  static async initializeTable(): Promise<void> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS destination_guesses (
          id SERIAL PRIMARY KEY,
          participant_id VARCHAR(50) NOT NULL,
          guess TEXT,
          city_name TEXT,
          country TEXT,
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          is_active BOOLEAN DEFAULT true,
          distance_km DECIMAL(10,2),
          is_correct_destination BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_destination_guesses_participant 
        ON destination_guesses(participant_id)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_destination_guesses_created_at 
        ON destination_guesses(created_at DESC)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_destination_guesses_active 
        ON destination_guesses(participant_id, is_active)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_destination_guesses_correct 
        ON destination_guesses(is_correct_destination)
      `;
      
      console.log('Database table initialized successfully');
    } catch (error) {
      console.error('Error initializing database table:', error);
      throw new Error('Failed to initialize database table');
    }
  }
}