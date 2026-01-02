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
      // First, deactivate any existing active guesses for this participant
      await sql`
        UPDATE destination_guesses
        SET is_active = false
        WHERE participant_id = ${participantId} AND is_active = true
      `;
      
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
      
      return result[0] as DestinationGuess;
    } catch (error) {
      console.error('Error creating destination guess:', error);
      throw new Error('Failed to create destination guess');
    }
  }

  /**
   * Get all destination guesses
   */
  static async getAllGuesses(): Promise<DestinationGuess[]> {
    try {
      const result = await sql`
        SELECT *
        FROM destination_guesses
        ORDER BY created_at DESC
      `;
      
      return result as DestinationGuess[];
    } catch (error) {
      console.error('Error fetching all destination guesses:', error);
      throw new Error('Failed to fetch destination guesses');
    }
  }

  /**
   * Get all guesses for a specific participant
   */
  static async getGuessesByParticipant(participantId: string): Promise<DestinationGuess[]> {
    try {
      const result = await sql`
        SELECT *
        FROM destination_guesses
        WHERE participant_id = ${participantId}
        ORDER BY created_at DESC
      `;
      
      return result as DestinationGuess[];
    } catch (error) {
      console.error('Error fetching participant guesses:', error);
      throw new Error('Failed to fetch participant guesses');
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