-- Database schema for destination guesses
-- Run this in your Vercel Postgres dashboard

-- Clear existing data (run this FIRST if updating existing table)
-- DELETE FROM destination_guesses;

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
);

-- Index for faster queries by participant
CREATE INDEX IF NOT EXISTS idx_destination_guesses_participant 
ON destination_guesses(participant_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_destination_guesses_created_at 
ON destination_guesses(created_at DESC);

-- Index for active guesses
CREATE INDEX IF NOT EXISTS idx_destination_guesses_active 
ON destination_guesses(participant_id, is_active);

-- Index for correct destination
CREATE INDEX IF NOT EXISTS idx_destination_guesses_correct 
ON destination_guesses(is_correct_destination);