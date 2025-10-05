# Backend Implementation Guide

This guide walks you through setting up the simple backend for destination guessing and future voting features.

## Overview

The backend uses:
- **Vercel Postgres** - Serverless PostgreSQL database
- **Next.js API Routes** - Serverless functions for API endpoints
- **Simple schema** - One table for destination guesses

## Setup Instructions

### 1. Add Vercel Postgres to Your Project

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (run in project root)
vercel link

# Add Postgres database
vercel storage create postgres
```

### 2. Environment Variables

After creating the Postgres database, Vercel will automatically set the environment variables in your project. Pull them locally:

```bash
vercel env pull .env.local
```

### 3. Initialize Database

The database table will be created automatically on first API call, but you can also run the SQL manually in the Vercel dashboard:

```sql
-- Copy and run this in Vercel Postgres Query tab
CREATE TABLE IF NOT EXISTS destination_guesses (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    guess TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_guesses_participant 
ON destination_guesses(participant_id);
```

### 4. Deploy

```bash
# Commit your changes
git add .
git commit -m "Add backend for destination guesses"

# Deploy to Vercel
vercel --prod
```

## API Endpoints

### POST /api/destination-guesses
Submit a new destination guess.

**Request Body:**
```json
{
  "participantId": "emilie",
  "guess": "Paris, France"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "participant_id": "emilie",
    "guess": "Paris, France", 
    "created_at": "2025-01-05T10:30:00Z"
  }
}
```

### GET /api/destination-guesses
Get all destination guesses (for hosts to view all submissions).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "participant_id": "emilie",
      "guess": "Paris, France",
      "created_at": "2025-01-05T10:30:00Z"
    }
  ]
}
```

### GET /api/destination-guesses/[participant]
Get all guesses for a specific participant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "participant_id": "emilie", 
      "guess": "Paris, France",
      "created_at": "2025-01-05T10:30:00Z"
    }
  ],
  "participantId": "emilie"
}
```

## Viewing Database Contents

### Option 1: Vercel Dashboard (Easiest)
1. Go to [vercel.com](https://vercel.com) → Your Project → Storage → Postgres
2. Click "Query" tab 
3. Run SQL queries directly in browser:
```sql
-- View all destination guesses
SELECT * FROM destination_guesses ORDER BY created_at DESC;

-- Count guesses by participant
SELECT participant_id, COUNT(*) as guess_count 
FROM destination_guesses 
GROUP BY participant_id;
```

### Option 2: DBeaver (Recommended GUI Tool)
1. Download [DBeaver](https://dbeaver.io/download/) (free)
2. Create new PostgreSQL connection
3. Use connection details from Vercel dashboard or `.env.local`
4. Browse tables visually with full SQL support

### Option 3: VS Code Extension
1. Install "PostgreSQL" extension in VS Code
2. Add database connection using your `POSTGRES_URL`
3. Query directly from VS Code

### Option 4: Command Line (psql)
```bash
# Install PostgreSQL client tools first
# Then connect using your POSTGRES_URL
psql "postgresql://username:password@host:port/database"
```

**Note**: SSMS (SQL Server Management Studio) won't work since we're using PostgreSQL, not SQL Server.

## Testing the API

You can test the API endpoints using the browser, curl, or Postman:

```bash
# Test POST endpoint
curl -X POST http://localhost:3000/api/destination-guesses \
  -H "Content-Type: application/json" \
  -d '{"participantId": "emilie", "guess": "Tokyo"}'

# Test GET all guesses
curl http://localhost:3000/api/destination-guesses

# Test GET participant guesses
curl http://localhost:3000/api/destination-guesses/emilie
```

## Security & Validation

- **Input validation** on all endpoints
- **Participant validation** using existing participant system
- **SQL injection protection** via parameterized queries
- **Rate limiting** can be added if needed
- **CORS** handled automatically by Vercel

## Future Enhancements

This simple backend can easily be extended for:
- **Voting system** (similar table structure)
- **Real-time features** (with Vercel's Edge Functions)
- **Admin dashboard** for hosts to view all submissions
- **Export functionality** for trip data

## Costs

- **Vercel Postgres**: Free tier includes 60 hours of compute time per month
- **Vercel Functions**: 100GB-hours free per month  
- **More than sufficient** for your trip app usage

The setup is designed to be **zero-maintenance** and **auto-scaling**.