import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/zoneService';
import { isValidParticipant, getParticipant } from '@/utils/participantUtils';
import { DAY_1_TEAMS } from '@/data/teams';
import type { TeamColor } from '@/types/zones';

// Alphabetical tiebreaker order: blue < green < red < yellow
const ALPHA_ORDER: Record<TeamColor, number> = {
  blue: 0,
  green: 1,
  red: 2,
  yellow: 3,
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { participant_id } = body as { participant_id?: unknown };

  if (typeof participant_id !== 'string') {
    return NextResponse.json({ error: 'Missing participant_id' }, { status: 400 });
  }

  if (!isValidParticipant(participant_id)) {
    return NextResponse.json({ error: 'Unknown participant' }, { status: 400 });
  }

  // Only hosts can trigger transition
  const participant = getParticipant(participant_id);
  if (participant.role !== 'host') {
    return NextResponse.json({ error: 'Only hosts can trigger Day 2 transition' }, { status: 403 });
  }

  // --- Mock / no-DB mode ---
  if (!process.env.DATABASE_URL) {
    // Return a deterministic mock merge based on static team order
    const mockTeams: Record<string, {
      members: string[];
      merged_from: string[];
      starting_points: number;
    }> = {
      green: {
        members: ['odd', 'aasmund', 'johanna', 'oskar'],
        merged_from: ['green', 'blue'],
        starting_points: 0,
      },
      red: {
        members: ['emilie', 'mathias', 'brage', 'sara'],
        merged_from: ['red', 'yellow'],
        starting_points: 0,
      },
    };
    return NextResponse.json({ success: true, day2_teams: mockTeams });
  }

  try {
    // Idempotency: check if Day 2 assignments already exist
    const existing = await ZoneService.getDay2Assignments();
    if (existing.length > 0) {
      // Reconstruct the response from existing assignments
      return NextResponse.json({
        success: true,
        day2_teams: await buildDay2TeamsResponse(existing),
      });
    }

    // 1. Get Day 1 scores
    const day1Scores = await ZoneService.getDay1ScoresPerTeam();

    // 2. Sort teams by score (descending), tiebreak by alphabetical color
    const teamColors: TeamColor[] = ['red', 'yellow', 'blue', 'green'];
    const sorted = [...teamColors].sort((a, b) => {
      const scoreDiff = day1Scores[b] - day1Scores[a];
      if (scoreDiff !== 0) return scoreDiff;
      return ALPHA_ORDER[a] - ALPHA_ORDER[b]; // alphabetical ascending for ties
    });

    // Rank 1 (highest) + Rank 4 (lowest) → merged team color = Rank 1
    // Rank 2 + Rank 3 → merged team color = Rank 2
    const rank1 = sorted[0]; // highest
    const rank2 = sorted[1];
    const rank3 = sorted[2];
    const rank4 = sorted[3]; // lowest

    const day2Team1Color = rank1; // higher-ranked team's color
    const day2Team2Color = rank2;

    // 3. Build assignment rows
    const assignments: { participant_id: string; day1_team_color: TeamColor; day2_team_color: TeamColor }[] = [];

    // Find Day 1 members for each color
    const day1MembersByColor: Record<TeamColor, string[]> = { red: [], yellow: [], blue: [], green: [] };
    for (const team of DAY_1_TEAMS) {
      day1MembersByColor[team.color] = [...team.members];
    }

    // Team 1: rank1 + rank4 → day2Team1Color
    for (const member of day1MembersByColor[rank1]) {
      assignments.push({ participant_id: member, day1_team_color: rank1, day2_team_color: day2Team1Color });
    }
    for (const member of day1MembersByColor[rank4]) {
      assignments.push({ participant_id: member, day1_team_color: rank4, day2_team_color: day2Team1Color });
    }

    // Team 2: rank2 + rank3 → day2Team2Color
    for (const member of day1MembersByColor[rank2]) {
      assignments.push({ participant_id: member, day1_team_color: rank2, day2_team_color: day2Team2Color });
    }
    for (const member of day1MembersByColor[rank3]) {
      assignments.push({ participant_id: member, day1_team_color: rank3, day2_team_color: day2Team2Color });
    }

    // 4. Insert into DB
    const inserted = await ZoneService.insertDay2Assignments(assignments);

    // 5. Return response
    return NextResponse.json({
      success: true,
      day2_teams: await buildDay2TeamsResponse(inserted),
    });
  } catch (error) {
    console.error('Error transitioning to Day 2:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Build the Day 2 teams response shape from assignment rows.
 */
async function buildDay2TeamsResponse(
  assignments: { participant_id: string; day1_team_color: TeamColor; day2_team_color: TeamColor }[],
) {
  // Group by day2_team_color
  const teamMap = new Map<TeamColor, {
    members: string[];
    merged_from: Set<TeamColor>;
  }>();

  for (const a of assignments) {
    if (!teamMap.has(a.day2_team_color)) {
      teamMap.set(a.day2_team_color, { members: [], merged_from: new Set() });
    }
    const entry = teamMap.get(a.day2_team_color)!;
    entry.members.push(a.participant_id);
    entry.merged_from.add(a.day1_team_color);
  }

  // Compute starting points (Day 1 scores summed by merged teams)
  let day1Scores: Record<TeamColor, number> = { red: 0, yellow: 0, blue: 0, green: 0 };
  try {
    day1Scores = await ZoneService.getDay1ScoresPerTeam();
  } catch {
    // If DB call fails, use zeros
  }

  const result: Record<string, {
    members: string[];
    merged_from: string[];
    starting_points: number;
  }> = {};

  for (const [color, data] of teamMap) {
    const mergedFrom = Array.from(data.merged_from);
    const startingPoints = mergedFrom.reduce((sum, c) => sum + (day1Scores[c] ?? 0), 0);
    result[color] = {
      members: data.members,
      merged_from: mergedFrom,
      starting_points: startingPoints,
    };
  }

  return result;
}
