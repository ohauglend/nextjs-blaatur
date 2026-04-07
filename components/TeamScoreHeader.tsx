'use client';

import useSWR from 'swr';
import type { TeamColor, Day2TeamAssignment } from '@/types/zones';
import { DAY_1_TEAMS } from '@/data/teams';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const TEAM_EMOJIS: Record<TeamColor, string> = {
  red: '🔴',
  yellow: '🟡',
  blue: '🔵',
  green: '🟢',
};

const TEAM_NAMES: Record<TeamColor, string> = {
  red: 'Red Team',
  yellow: 'Yellow Team',
  blue: 'Blue Team',
  green: 'Green Team',
};

interface TeamScoreHeaderProps {
  teamColor: TeamColor;
  afterLunch: boolean;
  day2Assignments?: Day2TeamAssignment[] | null;
}

export default function TeamScoreHeader({ teamColor, afterLunch, day2Assignments }: TeamScoreHeaderProps) {
  const { data: scores } = useSWR<Record<string, Record<TeamColor, number>>>(
    '/api/zones/scores',
    fetcher,
    { refreshInterval: 10_000 },
  );

  // Always read from day1 scores since all ownership lives in day1 rows
  const phaseScores = scores?.['day1'];

  // After lunch, derive merged team colors from assignments
  const day2ActiveColors: TeamColor[] = [];
  if (afterLunch && day2Assignments && day2Assignments.length > 0) {
    const uniqueColors = new Set(day2Assignments.map((a) => a.day2_team_color));
    day2ActiveColors.push(...Array.from(uniqueColors).sort());
  }

  // Which teams to display
  const displayTeams = afterLunch && day2ActiveColors.length > 0
    ? day2ActiveColors.map((c) => ({ color: c, name: TEAM_NAMES[c], emoji: TEAM_EMOJIS[c] }))
    : DAY_1_TEAMS.map((t) => ({ color: t.color, name: t.name, emoji: t.emoji }));

  return (
    <div className="space-y-2 mb-2">
      {/* After-lunch transition banner */}
      {afterLunch && day2Assignments && day2Assignments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-800 text-sm">
          <span className="font-semibold">Afternoon phase has started.</span>{' '}
          New team: {TEAM_EMOJIS[teamColor]} {TEAM_NAMES[teamColor]}.
          {phaseScores?.[teamColor] !== undefined && (
            <> Your team carries <span className="font-bold">{phaseScores[teamColor]}</span> points from this morning.</>
          )}
        </div>
      )}

      {/* Score bar */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4">
          {displayTeams.map((team) => {
            const pts = phaseScores?.[team.color] ?? 0;
            const isOwn = team.color === teamColor;
            return (
              <span
                key={team.color}
                className={`text-sm tabular-nums ${isOwn ? 'font-bold underline underline-offset-2' : 'text-gray-600'}`}
              >
                {team.emoji}{' '}{pts}
              </span>
            );
          })}
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {afterLunch ? 'After lunch' : 'Before lunch'}
        </span>
      </div>
    </div>
  );
}
