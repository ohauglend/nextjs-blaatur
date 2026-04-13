import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { TripState, TRIP_STATES } from '@/data/states';

/**
 * GET /api/state
 * Returns the current trip state
 */
export async function GET() {
  // For local development without database
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      state_id: 'pre-trip-packing',
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const result = await sql`
      SELECT state_id, updated_at, updated_by
      FROM trip_state
      WHERE id = 1
    `;

    if (result.length === 0) {
      // If no state exists, return default
      return NextResponse.json({
        state_id: 'pre-trip',
        updated_at: new Date().toISOString(),
        updated_by: 'system'
      });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching trip state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip state' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/state
 * Updates the current trip state (host only)
 */
export async function PUT(request: NextRequest) {
  // For local development without database
  if (!process.env.DATABASE_URL) {
    const body = await request.json();
    const { state_id, updated_by } = body;

    // Validate state_id
    if (!state_id || !TRIP_STATES[state_id as TripState]) {
      return NextResponse.json(
        { error: 'Invalid state_id' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Local development mode - state would be updated in production',
      state: {
        state_id,
        updated_at: new Date().toISOString(),
        updated_by: updated_by || 'unknown'
      }
    });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const body = await request.json();
    const { state_id, updated_by } = body;

    // Validate required fields
    if (!state_id) {
      return NextResponse.json(
        { error: 'state_id is required' },
        { status: 400 }
      );
    }

    // Validate state_id is a valid TripState
    if (!TRIP_STATES[state_id as TripState]) {
      return NextResponse.json(
        { error: `Invalid state_id: ${state_id}. Must be one of: ${Object.keys(TRIP_STATES).join(', ')}` },
        { status: 400 }
      );
    }

    // Update the state in the database
    const result = await sql`
      UPDATE trip_state
      SET 
        state_id = ${state_id},
        updated_at = NOW(),
        updated_by = ${updated_by || 'unknown'}
      WHERE id = 1
      RETURNING state_id, updated_at, updated_by
    `;

    if (result.length === 0) {
      // If no row exists, insert one (shouldn't happen with schema, but failsafe)
      const insertResult = await sql`
        INSERT INTO trip_state (id, state_id, updated_by)
        VALUES (1, ${state_id}, ${updated_by || 'unknown'})
        RETURNING state_id, updated_at, updated_by
      `;
      
      return NextResponse.json({
        success: true,
        state: insertResult[0]
      });
    }

    return NextResponse.json({
      success: true,
      state: result[0]
    });
  } catch (error) {
    console.error('Error updating trip state:', error);
    return NextResponse.json(
      { error: 'Failed to update trip state' },
      { status: 500 }
    );
  }
}
