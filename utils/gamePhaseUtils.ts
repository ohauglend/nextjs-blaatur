import type { TeamColor, GamePhase, Day2TeamAssignment } from '@/types/zones';
import { DAY_1_TEAMS } from '@/data/teams';

/**
 * Return the participant's effective team color for the given phase.
 * - day1: looks up static DAY_1_TEAMS
 * - day2: looks up from day2_team_assignments (DB-driven merge results)
 *
 * Returns null if participant not found in the relevant data.
 */
export function getTeamForPhase(
  participantId: string,
  phase: GamePhase,
  day2Assignments: Day2TeamAssignment[] | null,
): TeamColor | null {
  if (phase === 'day1') {
    const team = DAY_1_TEAMS.find((t) => t.members.includes(participantId));
    return team?.color ?? null;
  }

  // day2: use dynamic assignments
  if (!day2Assignments) return null;
  const assignment = day2Assignments.find((a) => a.participant_id === participantId);
  return assignment?.day2_team_color ?? null;
}

/**
 * Given a Day 1 team color, return the corresponding Day 2 team color
 * from the assignments table.
 * Useful for mapping zone claim colors to their merged Day 2 identity.
 */
export function mapDay1ColorToDay2(
  day1Color: TeamColor,
  day2Assignments: Day2TeamAssignment[],
): TeamColor | null {
  const assignment = day2Assignments.find((a) => a.day1_team_color === day1Color);
  return assignment?.day2_team_color ?? null;
}

/**
 * Check whether a zone's claim team (day1 color) belongs to the same
 * Day 2 merged team as the requesting participant.
 */
export function isSameDay2Team(
  claimTeamColor: TeamColor,
  participantDay2Color: TeamColor,
  day2Assignments: Day2TeamAssignment[],
): boolean {
  const claimDay2Color = mapDay1ColorToDay2(claimTeamColor, day2Assignments);
  return claimDay2Color === participantDay2Color;
}
