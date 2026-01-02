import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * Test endpoint to verify database connection and table structure
 * GET /api/destination-guesses/test
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: []
  };

  try {
    // Check 1: Environment variable
    results.checks.push({
      name: 'DATABASE_URL exists',
      status: !!process.env.DATABASE_URL ? 'PASS' : 'FAIL',
      message: process.env.DATABASE_URL ? 'Environment variable is set' : 'DATABASE_URL not found'
    });

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(results, { status: 500 });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check 2: Database connection
    try {
      await sql`SELECT 1 as test`;
      results.checks.push({
        name: 'Database connection',
        status: 'PASS',
        message: 'Successfully connected to database'
      });
    } catch (error) {
      results.checks.push({
        name: 'Database connection',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Connection failed'
      });
      return NextResponse.json(results, { status: 500 });
    }

    // Check 3: Table exists
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'destination_guesses'
        ) as table_exists
      `;
      
      const exists = tableCheck[0].table_exists;
      results.checks.push({
        name: 'Table exists',
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'destination_guesses table found' : 'Table does not exist'
      });

      if (!exists) {
        return NextResponse.json(results, { status: 500 });
      }
    } catch (error) {
      results.checks.push({
        name: 'Table exists',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Check failed'
      });
      return NextResponse.json(results, { status: 500 });
    }

    // Check 4: Table structure
    try {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'destination_guesses'
        ORDER BY ordinal_position
      `;
      
      results.checks.push({
        name: 'Table structure',
        status: 'PASS',
        message: 'Retrieved table schema',
        details: columns
      });
    } catch (error) {
      results.checks.push({
        name: 'Table structure',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Check failed'
      });
    }

    // Check 5: Row count
    try {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM destination_guesses
      `;
      
      results.checks.push({
        name: 'Row count',
        status: 'PASS',
        message: `Table has ${countResult[0].count} rows`
      });
    } catch (error) {
      results.checks.push({
        name: 'Row count',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Check failed'
      });
    }

    // Check 6: Test insert/delete
    try {
      const testInsert = await sql`
        INSERT INTO destination_guesses (
          participant_id, 
          city_name, 
          country, 
          latitude, 
          longitude, 
          is_active,
          is_correct_destination
        )
        VALUES (
          'test_user', 
          'Test City', 
          'Test Country', 
          0.0, 
          0.0, 
          false,
          false
        )
        RETURNING id
      `;
      
      const testId = testInsert[0].id;
      
      await sql`
        DELETE FROM destination_guesses WHERE id = ${testId}
      `;
      
      results.checks.push({
        name: 'Insert/Delete test',
        status: 'PASS',
        message: 'Successfully tested write operations'
      });
    } catch (error) {
      results.checks.push({
        name: 'Insert/Delete test',
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Check failed',
        error: error instanceof Error ? error.stack : undefined
      });
    }

    const allPassed = results.checks.every((check: any) => check.status === 'PASS');
    
    return NextResponse.json(results, { 
      status: allPassed ? 200 : 500 
    });

  } catch (error) {
    results.checks.push({
      name: 'Overall test',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(results, { status: 500 });
  }
}
