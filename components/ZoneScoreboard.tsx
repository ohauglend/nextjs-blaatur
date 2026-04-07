'use client';

import useSWR from 'swr';
import type { TeamColor } from '@/types/zones';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); });

const TEAM_EMOJI: Record<TeamColor, string> = { red: '🔴', yellow: '🟡', blue: '🔵', green: '🟢' };
const TEAMS: TeamColor[] = ['red', 'yellow', 'blue', 'green'];

type Scores = {
  day1: Record<TeamColor, number>;
  day2: Record<TeamColor, number>;
};

export default function ZoneScoreboard() {
  const { data: scores, error, isLoading } = useSWR<Scores>(
    '/api/zones/scores',
    fetcher,
    { refreshInterval: 10_000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !scores) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-600 text-sm">Failed to load scores</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🏆</span>Scoreboard
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 pr-4 font-semibold text-gray-700">Team</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Before lunch</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">After lunch</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {TEAMS.map(color => {
              const d1 = scores.day1[color] ?? 0;
              const d2 = scores.day2[color] ?? 0;
              const combined = d1 + d2;
              return (
                <tr key={color} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 font-medium capitalize">
                    {TEAM_EMOJI[color]} {color}
                  </td>
                  <td className="py-2 px-3 text-center tabular-nums">{d1}</td>
                  <td className="py-2 px-3 text-center tabular-nums">{d2}</td>
                  <td className="py-2 px-3 text-center tabular-nums font-bold">{combined}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
