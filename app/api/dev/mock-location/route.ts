import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Key used in the dev_settings table
const FLAG_KEY = 'mock_gps_active';

// Fallback for local dev without a database
let localFallback = false;

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

async function readFlag(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return localFallback;
  try {
    const rows = await sql`SELECT value FROM dev_settings WHERE key = ${FLAG_KEY}`;
    console.log('[mock-location] readFlag rows:', rows);
    return rows[0]?.value === 'true';
  } catch (err) {
    console.error('[mock-location] readFlag error (dev_settings table may not exist):', err);
    return false;
  }
}

async function toggleFlag(): Promise<boolean> {
  const sql = getDb();
  if (!sql) {
    localFallback = !localFallback;
    console.log('[mock-location] toggleFlag (no DB), localFallback =', localFallback);
    return localFallback;
  }
  try {
    const current = await readFlag();
    const next = !current;
    await sql`
      INSERT INTO dev_settings (key, value)
      VALUES (${FLAG_KEY}, ${String(next)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    console.log('[mock-location] toggleFlag DB:', current, '->', next);
    return next;
  } catch (err) {
    console.error('[mock-location] toggleFlag error:', err);
    return false;
  }
}

export async function GET() {
  const active = await readFlag();
  console.log('[mock-location] GET active:', active);
  return NextResponse.json({ active });
}

export async function POST() {
  const active = await toggleFlag();
  console.log('[mock-location] POST toggled to:', active);
  return NextResponse.json({ active });
}
