'use client';

import useSWR from 'swr';
import type { TeamColor, GamePhase } from '@/types/zones';
import { DAY_1_TEAMS, DAY_2_TEAMS } from '@/data/teams';

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

interface TeamScoreHeaderProps {
  teamColor: TeamColor;
  phase: GamePhase;
}

export default function TeamScoreHeader({ teamColor, phase }: TeamScoreHeaderProps) {
  const { data: scores } = useSWR<Record<GamePhase, Record<TeamColor, number>>>(
    '/api/zones/scores',
    fetcher,
    { refreshInterval: 10_000 },
  );

  const teams = phase === 'day1' ? DAY_1_TEAMS : DAY_2_TEAMS;
  const phaseScores = scores?.[phase];

  return (
    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2 mb-2 shadow-sm">
      <div className="flex items-center gap-4">
        {teams.map((team) => {
          const pts = phaseScores?.[team.color] ?? 0;
          const isOwn = team.color === teamColor;
          return (
            <span
              key={team.color}
              className={`text-sm tabular-nums ${isOwn ? 'font-bold underline underline-offset-2' : 'text-gray-600'}`}
            >
              {TEAM_EMOJIS[team.color]}{' '}{pts}
            </span>
          );
        })}
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {phase === 'day1' ? 'Day 1' : 'Day 2'}
      </span>
    </div>
  );
}
