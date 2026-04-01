import { neon } from '@neondatabase/serverless';
import type {
  Zone,
  ZoneClaim,
  ZoneWithClaim,
  Challenge,
  ParticipantLocation,
  TeamColor,
  GamePhase,
} from '@/types/zones';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export class ZoneService {
  /**
   * Return all zone definitions (no claim data).
   */
  static async getAllZones(): Promise<Zone[]> {
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, center_lat, center_lng, radius_m, polygon_geojson
      FROM zones
      ORDER BY id
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      center_lat: Number(r.center_lat),
      center_lng: Number(r.center_lng),
      radius_m: r.radius_m,
      polygon_geojson: r.polygon_geojson ?? null,
    }));
  }

  /**
   * Return a single zone by id, or null if not found.
   */
  static async getZoneById(id: number): Promise<Zone | null> {
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, center_lat, center_lng, radius_m, polygon_geojson
      FROM zones
      WHERE id = ${id}
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      center_lat: Number(r.center_lat),
      center_lng: Number(r.center_lng),
      radius_m: r.radius_m,
      polygon_geojson: r.polygon_geojson ?? null,
    };
  }

  /**
   * Return all zones joined with their current claim and challenge for a given phase.
   */
  static async getZonesWithClaims(phase: GamePhase): Promise<ZoneWithClaim[]> {
    const sql = getDb();
    const rows = await sql`
      SELECT
        z.id,
        z.name,
        z.center_lat,
        z.center_lng,
        z.radius_m,
        z.polygon_geojson,
        zc.id                     AS claim_id,
        zc.zone_id                AS claim_zone_id,
        zc.team_color             AS claim_team_color,
        zc.phase                  AS claim_phase,
        zc.claimed_by_participant AS claim_claimed_by,
        zc.claimed_at             AS claim_claimed_at,
        zc.completed              AS claim_completed,
        zc.completed_at           AS claim_completed_at,
        zc.steal_locked           AS claim_steal_locked,
        zc.points_awarded         AS claim_points_awarded,
        ch.id                     AS challenge_id,
        ch.zone_id                AS challenge_zone_id,
        ch.phase                  AS challenge_phase,
        ch.text                   AS challenge_text,
        ch.type                   AS challenge_type,
        ch.participant_scope      AS challenge_participant_scope
      FROM zones z
      LEFT JOIN zone_claims zc ON zc.zone_id = z.id AND zc.phase = ${phase}
      LEFT JOIN challenges  ch ON ch.zone_id = z.id AND ch.phase = ${phase}
      ORDER BY z.id
    `;
    return rows.map((row) => ({
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
            team_color: row.claim_team_color as TeamColor,
            phase: row.claim_phase as GamePhase,
            claimed_by_participant: row.claim_claimed_by,
            claimed_at: row.claim_claimed_at,
            completed: row.claim_completed,
            completed_at: row.claim_completed_at ?? null,
            steal_locked: row.claim_steal_locked,
            points_awarded: row.claim_points_awarded,
          }
        : null,
      challenge: row.challenge_id
        ? {
            id: row.challenge_id,
            zone_id: row.challenge_zone_id,
            phase: row.challenge_phase as GamePhase,
            text: row.challenge_text,
            type: row.challenge_type,
            participant_scope: row.challenge_participant_scope,
          }
        : null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Claims
  // ---------------------------------------------------------------------------

  /**
   * Insert a new zone claim and return the associated challenge.
   * Caller must validate proximity and zone existence before calling.
   */
  static async claimZone(
    zoneId: number,
    participantId: string,
    teamColor: TeamColor,
    phase: GamePhase,
  ): Promise<{ claim: ZoneClaim; challenge: Challenge | null }> {
    const sql = getDb();

    const claimRows = await sql`
      INSERT INTO zone_claims (zone_id, team_color, phase, claimed_by_participant)
      VALUES (${zoneId}, ${teamColor}, ${phase}, ${participantId})
      RETURNING *
    `;
    const claim = claimRows[0] as ZoneClaim;

    const challengeRows = await sql`
      SELECT id, zone_id, phase, text, type, participant_scope
      FROM challenges
      WHERE zone_id = ${zoneId} AND phase = ${phase}
    `;
    const challenge: Challenge | null =
      challengeRows.length > 0 ? (challengeRows[0] as Challenge) : null;

    return { claim, challenge };
  }

  /**
   * Check whether a zone is already claimed for a given phase.
   * Returns the existing claim or null.
   */
  static async getClaimForZonePhase(
    zoneId: number,
    phase: GamePhase,
  ): Promise<ZoneClaim | null> {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM zone_claims
      WHERE zone_id = ${zoneId} AND phase = ${phase}
    `;
    return rows.length > 0 ? (rows[0] as ZoneClaim) : null;
  }

  /**
   * Mark a zone claim as completed and record points.
   * Returns the updated claim, or null if not found / already completed.
   */
  static async completeZone(
    zoneId: number,
    teamColor: TeamColor,
    phase: GamePhase,
  ): Promise<{ claim: ZoneClaim; teamTotalPoints: number } | null> {
    const sql = getDb();

    const updated = await sql`
      UPDATE zone_claims
      SET completed = true, completed_at = NOW(), points_awarded = true
      WHERE zone_id = ${zoneId}
        AND team_color = ${teamColor}
        AND phase = ${phase}
        AND completed = false
      RETURNING *
    `;
    if (updated.length === 0) return null;

    const pointsRows = await sql`
      SELECT COUNT(*) AS total
      FROM zone_claims
      WHERE team_color = ${teamColor}
        AND phase = ${phase}
        AND points_awarded = true
    `;
    const teamTotalPoints = Number(pointsRows[0].total);

    return { claim: updated[0] as ZoneClaim, teamTotalPoints };
  }

  // ---------------------------------------------------------------------------
  // Scores
  // ---------------------------------------------------------------------------

  /**
   * Return point totals per team per phase.
   */
  static async getScores(): Promise<
    Record<GamePhase, Record<TeamColor, number>>
  > {
    const sql = getDb();
    const rows = await sql`
      SELECT phase, team_color, COUNT(*) AS points
      FROM zone_claims
      WHERE points_awarded = true
      GROUP BY phase, team_color
    `;

    const teams: TeamColor[] = ['red', 'yellow', 'blue', 'green'];
    const phases: GamePhase[] = ['day1', 'day2'];

    const result = Object.fromEntries(
      phases.map((p) => [
        p,
        Object.fromEntries(teams.map((t) => [t, 0])),
      ]),
    ) as Record<GamePhase, Record<TeamColor, number>>;

    for (const row of rows) {
      const phase = row.phase as GamePhase;
      const team = row.team_color as TeamColor;
      if (result[phase] && team in result[phase]) {
        result[phase][team] = Number(row.points);
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Participant Locations
  // ---------------------------------------------------------------------------

  /**
   * Upsert the last known position for a participant.
   */
  static async upsertLocation(
    participantId: string,
    teamColor: TeamColor,
    lat: number,
    lng: number,
    accuracy: number | null,
  ): Promise<ParticipantLocation> {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO participant_locations (participant_id, team_color, lat, lng, accuracy, updated_at)
      VALUES (${participantId}, ${teamColor}, ${lat}, ${lng}, ${accuracy ?? null}, NOW())
      ON CONFLICT (participant_id)
      DO UPDATE SET
        team_color = EXCLUDED.team_color,
        lat        = EXCLUDED.lat,
        lng        = EXCLUDED.lng,
        accuracy   = EXCLUDED.accuracy,
        updated_at = NOW()
      RETURNING *
    `;
    return rows[0] as ParticipantLocation;
  }

  /**
   * Return the last known position for all participants.
   */
  static async getAllLocations(): Promise<ParticipantLocation[]> {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM participant_locations
      ORDER BY participant_id
    `;
    return rows as ParticipantLocation[];
  }
}
