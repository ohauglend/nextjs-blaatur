import { sql } from '@vercel/postgres';

export interface DestinationGuess {
  id: number;
  participant_id: string;
  guess: string;
  created_at: string;
}

export class DestinationGuessService {
  
  /**
   * Create a new destination guess
   */
  static async createGuess(participantId: string, guess: string): Promise<DestinationGuess> {
    try {
      const result = await sql`
        INSERT INTO destination_guesses (participant_id, guess)
        VALUES (${participantId}, ${guess})
        RETURNING id, participant_id, guess, created_at
      `;
      
      return result.rows[0] as DestinationGuess;
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
        SELECT id, participant_id, guess, created_at
        FROM destination_guesses
        ORDER BY created_at DESC
      `;
      
      return result.rows as DestinationGuess[];
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
        SELECT id, participant_id, guess, created_at
        FROM destination_guesses
        WHERE participant_id = ${participantId}
        ORDER BY created_at DESC
      `;
      
      return result.rows as DestinationGuess[];
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
          guess TEXT NOT NULL,
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
      
      console.log('Database table initialized successfully');
    } catch (error) {
      console.error('Error initializing database table:', error);
      throw new Error('Failed to initialize database table');
    }
  }
}