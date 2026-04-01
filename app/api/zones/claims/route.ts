import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Seed data for local development (mirrors schema.sql zone inserts)
const MOCK_ZONES = [
  { id: 1,  name: 'Freedom Monument',          center_lat: 56.95151, center_lng: 24.11338, radius_m: 50 },
  { id: 2,  name: 'Doma Cathedral',            center_lat: 56.94910, center_lng: 24.10477, radius_m: 60 },
  { id: 3,  name: "St. Peter's Church",        center_lat: 56.94752, center_lng: 24.10931, radius_m: 50 },
  { id: 4,  name: 'Riga Castle',               center_lat: 56.95097, center_lng: 24.10115, radius_m: 70 },
  { id: 5,  name: 'Three Brothers',            center_lat: 56.95035, center_lng: 24.10429, radius_m: 40 },
  { id: 6,  name: 'Swedish Gate',              center_lat: 56.95145, center_lng: 24.10638, radius_m: 40 },
  { id: 7,  name: 'Powder Tower',              center_lat: 56.95122, center_lng: 24.10868, radius_m: 40 },
  { id: 8,  name: 'Laima Clock',               center_lat: 56.95044, center_lng: 24.11198, radius_m: 40 },
  { id: 9,  name: 'Livu Square',               center_lat: 56.94944, center_lng: 24.10930, radius_m: 60 },
  { id: 10, name: 'Bastejkalns Park',          center_lat: 56.95155, center_lng: 24.11112, radius_m: 80 },
  { id: 11, name: 'National Opera',            center_lat: 56.94933, center_lng: 24.11437, radius_m: 60 },
  { id: 12, name: 'Black Magic Bar',           center_lat: 56.94866, center_lng: 24.10892, radius_m: 40 },
  { id: 13, name: 'Riga Central Market',       center_lat: 56.94396, center_lng: 24.11673, radius_m: 100 },
  { id: 14, name: 'Vansu Bridge Viewpoint',    center_lat: 56.95200, center_lng: 24.10050, radius_m: 50 },
  { id: 15, name: 'Mentzendorff House',        center_lat: 56.94677, center_lng: 24.10825, radius_m: 40 },
  { id: 16, name: 'Cat House',                 center_lat: 56.95018, center_lng: 24.10854, radius_m: 40 },
  { id: 17, name: 'Konventa Seta',             center_lat: 56.94824, center_lng: 24.11033, radius_m: 50 },
  { id: 18, name: 'Riga Art Nouveau District', center_lat: 56.95961, center_lng: 24.10852, radius_m: 80 },
  { id: 19, name: 'Esplanade Park',            center_lat: 56.95428, center_lng: 24.11338, radius_m: 80 },
  { id: 20, name: 'Daugava Riverbank',         center_lat: 56.94680, center_lng: 24.10200, radius_m: 80 },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') ?? 'day1';

  if (phase !== 'day1' && phase !== 'day2') {
    return NextResponse.json({ error: 'Invalid phase. Must be day1 or day2.' }, { status: 400 });
  }

  // No database: return zones with no claims (works in dev and production-without-DB)
  if (!process.env.DATABASE_URL) {
    const zonesWithClaims = MOCK_ZONES.map((zone) => ({
      ...zone,
      polygon_geojson: null,
      claim: null,
      challenge: null,
    }));
    return NextResponse.json(zonesWithClaims);
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT
        z.id,
        z.name,
        z.center_lat,
        z.center_lng,
        z.radius_m,
        z.polygon_geojson,
        zc.id          AS claim_id,
        zc.zone_id     AS claim_zone_id,
        zc.team_color  AS claim_team_color,
        zc.phase       AS claim_phase,
        zc.claimed_by_participant AS claim_claimed_by,
        zc.claimed_at  AS claim_claimed_at,
        zc.completed   AS claim_completed,
        zc.completed_at AS claim_completed_at,
        zc.steal_locked AS claim_steal_locked,
        zc.points_awarded AS claim_points_awarded,
        ch.id          AS challenge_id,
        ch.zone_id     AS challenge_zone_id,
        ch.phase       AS challenge_phase,
        ch.text        AS challenge_text,
        ch.type        AS challenge_type,
        ch.participant_scope AS challenge_participant_scope
      FROM zones z
      LEFT JOIN zone_claims zc ON zc.zone_id = z.id AND zc.phase = ${phase}
      LEFT JOIN challenges ch ON ch.zone_id = z.id AND ch.phase = ${phase}
      ORDER BY z.id
    `;

    const zonesWithClaims = rows.map((row) => ({
      id: row.id,
      name: row.name,
      center_lat: Number(row.center_lat),
      center_lng: Number(row.center_lng),
      radius_m: row.radius_m,
      polygon_geojson: row.polygon_geojson ?? null,
      claim: row.claim_id
        ? {
            id: row.claim_id,
            zone_id: row.claim_zone_id,
            team_color: row.claim_team_color,
            phase: row.claim_phase,
            claimed_by_participant: row.claim_claimed_by,
            claimed_at: row.claim_claimed_at,
            completed: row.claim_completed,
            completed_at: row.claim_completed_at,
            steal_locked: row.claim_steal_locked,
            points_awarded: row.claim_points_awarded,
          }
        : null,
      challenge: row.challenge_id
        ? {
            id: row.challenge_id,
            zone_id: row.challenge_zone_id,
            phase: row.challenge_phase,
            text: row.challenge_text,
            type: row.challenge_type,
            participant_scope: row.challenge_participant_scope,
          }
        : null,
    }));

    return NextResponse.json(zonesWithClaims);
  } catch (error) {
    console.error('Error fetching zones with claims:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
