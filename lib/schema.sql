-- Database schema for destination guesses
-- Run this in your Vercel Postgres dashboard

CREATE TABLE IF NOT EXISTS destination_guesses (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    guess TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries by participant
CREATE INDEX IF NOT EXISTS idx_destination_guesses_participant 
ON destination_guesses(participant_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_destination_guesses_created_at 
ON destination_guesses(created_at DESC);