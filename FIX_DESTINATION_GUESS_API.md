# Destination Guess API Fix

## Issue
Getting 500 error when submitting destination guesses on the production deployment.

## Root Cause Analysis
The 500 error was likely caused by one or more of the following:

1. **Insufficient error logging** - Original code wasn't logging detailed error information, making it impossible to debug in production
2. **Database connection issues** - Potential issues with DATABASE_URL environment variable in Vercel
3. **Table structure mismatch** - If the database table wasn't properly migrated with all the new columns

## Fixes Applied

### 1. Enhanced Error Logging
- Added detailed console.error logging throughout the API route and database service
- Logs now include full error details (message, stack trace, context)
- Development mode now returns detailed error information in the response

### 2. Improved Database Service
- Added logging at each step of the database operations
- Better error propagation (throws original error instead of wrapping it)
- Added validation that INSERT returns results

### 3. Database Connection Validation
- Added check for DATABASE_URL at module initialization
- Improved error handling for connection issues

### 4. Test Endpoint
Created `/api/destination-guesses/test` endpoint that checks:
- DATABASE_URL environment variable exists
- Database connection works
- Table exists
- Table structure is correct
- Row count
- Insert/Delete operations work

## Deployment Steps

### 1. Deploy the Updated Code
```bash
git add .
git commit -m "fix: improve destination guessing API error handling and logging"
git push
```

### 2. Verify Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Ensure `DATABASE_URL` is set with your Neon database connection string:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### 3. Run the Test Endpoint
After deployment, visit:
```
https://nextjs-blaatur.vercel.app/api/destination-guesses/test
```

This will show you exactly what's working and what's not.

### 4. Check Vercel Logs
Go to Vercel Dashboard → Your Project → Deployments → [Latest] → Functions

Look for logs from the destination-guesses function. The enhanced logging will show you exactly where the error occurs.

## Database Schema Verification

Ensure your Neon database has the correct schema:

```sql
-- Check if table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'destination_guesses'
ORDER BY ordinal_position;
```

Expected columns:
- id (integer, not null)
- participant_id (character varying, not null)
- guess (text, nullable)
- city_name (text, nullable)
- country (text, nullable)
- latitude (numeric, nullable)
- longitude (numeric, nullable)
- is_active (boolean, nullable)
- distance_km (numeric, nullable)
- is_correct_destination (boolean, nullable)
- created_at (timestamp with time zone, nullable)

## Testing

### Test Request
```bash
curl -X POST https://nextjs-blaatur.vercel.app/api/destination-guesses \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "emilie",
    "cityName": "Oslo",
    "country": "Norway",
    "latitude": 59.91273,
    "longitude": 10.74609
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "guess": {
    "id": 1,
    "participant_id": "emilie",
    "guess": null,
    "city_name": "Oslo",
    "country": "Norway",
    "latitude": 59.91273,
    "longitude": 10.74609,
    "is_active": true,
    "distance_km": null,
    "is_correct_destination": false,
    "created_at": "2026-01-02T20:19:29.000Z"
  }
}
```

## Next Steps

1. Deploy the changes
2. Run the test endpoint to verify everything works
3. Check Vercel logs for any remaining errors
4. Test the actual guess submission from the UI
5. If still failing, the detailed logs will show exactly what's wrong

## Common Issues

### DATABASE_URL not set in Vercel
**Solution:** Add it in Vercel Dashboard → Settings → Environment Variables

### Table doesn't exist
**Solution:** Run the schema from `lib/schema.sql` in your Neon database console

### Permission issues
**Solution:** Ensure the database user has INSERT, UPDATE, SELECT permissions on the destination_guesses table

### SSL/TLS issues
**Solution:** Ensure your DATABASE_URL includes `?sslmode=require`
