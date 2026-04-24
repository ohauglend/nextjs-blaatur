import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PARTICIPANTS } from '@/data/participants';
import { DAY_1_TEAMS, DAY_2_TEAMS } from '@/data/teams';
import type { LeaderboardEntry } from '@/types/voting';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

const ALL_PARTICIPANT_IDS = Object.keys(PARTICIPANTS);

// Map participant -> Day 1 team color and team size
function getDay1TeamInfo(participantId: string): { color: string; size: number } | null {
  for (const team of DAY_1_TEAMS) {
    if (team.members.includes(participantId)) {
      return { color: team.color, size: team.members.length };
    }
  }
  return null;
}

// Map participant -> Day 2 team color and team size (static fallback)
function getDay2TeamInfo(participantId: string): { color: string; size: number } | null {
  for (const team of DAY_2_TEAMS) {
    if (team.members.includes(participantId)) {
      return { color: team.color, size: team.members.length };
    }
  }
  return null;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    const entries: LeaderboardEntry[] = ALL_PARTICIPANT_IDS.map(id => ({
      participant_id: id,
      display_name: PARTICIPANTS[id].name,
      zone_points: 0,
      voting_points: 0,
      adjustment_points: 0,
      total: 0,
    }));
    return NextResponse.json({ participants: entries, max_score: 0 });
  }

  try {
    const sql = getDb();

    // 1. Zone points per team per phase
    const zoneScoreRows = await sql`
      SELECT phase, team_color, COUNT(*) as points
      FROM zone_claims
      WHERE points_awarded = true
      GROUP BY phase, team_color
    `;

    // Check if day2_team_assignments exist (for merged team mapping)
    const day2AssignmentRows = await sql`
      SELECT participant_id, day1_team_color, day2_team_color
      FROM day2_team_assignments
    `;
    const hasDay2Assignments = day2AssignmentRows.length > 0;

    // Build per-team scores
    const day1TeamScores: Record<string, number> = {};
    const day2TeamScores: Record<string, number> = {};

    for (const row of zoneScoreRows) {
      const phase = row.phase as string;
      const color = row.team_color as string;
      const pts = Number(row.points);
      if (phase === 'day1') {
        day1TeamScores[color] = (day1TeamScores[color] ?? 0) + pts;
      } else if (phase === 'day2') {
        day2TeamScores[color] = (day2TeamScores[color] ?? 0) + pts;
      }
    }

    // If day2 assignments exist, remap day1 claims through merged colors
    let day2MergedScores: Record<string, number> = {};
    if (hasDay2Assignments) {
      const mergedRows = await sql`
        SELECT da.day2_team_color, COUNT(zc.id) as total_points
        FROM day2_team_assignments da
        JOIN zone_claims zc ON zc.team_color = da.day1_team_color
        WHERE zc.points_awarded = true AND zc.phase = 'day1'
        GROUP BY da.day2_team_color
      `;
      for (const row of mergedRows) {
        day2MergedScores[row.day2_team_color as string] = Number(row.total_points);
      }
    }

    // Map day2 participant -> merged team color using assignments
    const day2ParticipantTeam: Record<string, string> = {};
    if (hasDay2Assignments) {
      for (const row of day2AssignmentRows) {
        day2ParticipantTeam[row.participant_id as string] = row.day2_team_color as string;
      }
    }

    // Calculate per-participant zone points
    const zonePoints: Record<string, number> = {};
    for (const pid of ALL_PARTICIPANT_IDS) {
      let pts = 0;

      // Day 1: team score / team size
      const day1Info = getDay1TeamInfo(pid);
      if (day1Info) {
        const teamScore = day1TeamScores[day1Info.color] ?? 0;
        pts += teamScore / day1Info.size;
      }

      // Day 2: merged team score / merged team size
      if (hasDay2Assignments) {
        const mergedColor = day2ParticipantTeam[pid];
        if (mergedColor) {
          // Count how many participants are in this merged team
          const mergedTeamSize = day2AssignmentRows.filter(
            r => r.day2_team_color === mergedColor
          ).length;
          const teamScore = day2MergedScores[mergedColor] ?? 0;
          pts += mergedTeamSize > 0 ? teamScore / mergedTeamSize : 0;
        }
      } else {
        // Fallback to static Day 2 teams
        const day2Info = getDay2TeamInfo(pid);
        if (day2Info) {
          const teamScore = day2TeamScores[day2Info.color] ?? 0;
          pts += teamScore / day2Info.size;
        }
      }

      zonePoints[pid] = Math.round(pts);
    }

    // 2. Voting points: for each active session, determine winners
    const activeSessions = await sql`
      SELECT id, preset_type, points_tally
      FROM vote_sessions
      WHERE is_active = true
    `;

    const votingPoints: Record<string, number> = {};
    for (const pid of ALL_PARTICIPANT_IDS) {
      votingPoints[pid] = 0;
    }

    for (const session of activeSessions) {
      const sessionId = session.id as string;
      const presetType = session.preset_type as string | null;
      const pointsTally = session.points_tally as number;

      let winnerIds: string[] = [];

      if (presetType === 'closest_destination') {
        // Auto-calculate: minimum distance_km among eligible participants
        const eligibleRows = await sql`
          SELECT participant_id FROM vote_session_participants WHERE vote_session_id = ${sessionId}
        `;
        const eligibleIds = eligibleRows.map(r => r.participant_id as string);

        if (eligibleIds.length > 0) {
          const guessRows = await sql`
            SELECT participant_id, distance_km
            FROM destination_guesses
            WHERE is_active = true AND participant_id = ANY(${eligibleIds})
            ORDER BY distance_km ASC NULLS LAST
          `;

          if (guessRows.length > 0 && guessRows[0].distance_km != null) {
            const minDist = Number(guessRows[0].distance_km);
            winnerIds = guessRows
              .filter(r => r.distance_km != null && Number(r.distance_km) === minDist)
              .map(r => r.participant_id as string);
          }
        }
      } else {
        // Regular vote: highest vote count
        const voteRows = await sql`
          SELECT voted_for, COUNT(*) as vote_count
          FROM participant_votes WHERE vote_session_id = ${sessionId}
          GROUP BY voted_for
          ORDER BY vote_count DESC
        `;

        if (voteRows.length > 0) {
          const maxVotes = Number(voteRows[0].vote_count);
          winnerIds = voteRows
            .filter(r => Number(r.vote_count) === maxVotes)
            .map(r => r.voted_for as string);
        }
      }

      for (const winnerId of winnerIds) {
        if (votingPoints[winnerId] !== undefined) {
          votingPoints[winnerId] += pointsTally;
        }
      }
    }

    // 3. Score adjustments
    const adjustmentRows = await sql`
      SELECT participant_id, SUM(delta) as total_delta
      FROM score_adjustments
      GROUP BY participant_id
    `;
    const adjustmentPoints: Record<string, number> = {};
    for (const row of adjustmentRows) {
      adjustmentPoints[row.participant_id as string] = Number(row.total_delta);
    }

    // 4. Build entries
    const entries: LeaderboardEntry[] = ALL_PARTICIPANT_IDS.map(pid => {
      const zp = zonePoints[pid] ?? 0;
      const vp = votingPoints[pid] ?? 0;
      const ap = adjustmentPoints[pid] ?? 0;
      return {
        participant_id: pid,
        display_name: PARTICIPANTS[pid].name,
        zone_points: zp,
        voting_points: vp,
        adjustment_points: ap,
        total: zp + vp + ap,
      };
    });

    // Sort by total descending, then alphabetically
    entries.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.participant_id.localeCompare(b.participant_id);
    });

    const maxScore = entries.length > 0 ? entries[0].total : 0;

    return NextResponse.json({ participants: entries, max_score: maxScore }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to calculate leaderboard' }, { status: 500 });
  }
}
