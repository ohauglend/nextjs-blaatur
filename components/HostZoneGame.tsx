'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import HostNavigation from './HostNavigation';
import ZoneScoreboard from './ZoneScoreboard';
import ZoneChallengeReview from './ZoneChallengeReview';
import { useCurrentState } from '@/hooks/useCurrentState';
import { getParticipantByToken } from '@/utils/secureAccess';
import type { Day2TeamAssignment, TeamColor } from '@/types/zones';

const ZoneMap = dynamic(() => import('./ZoneMap'), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); });

interface HostZoneGameProps {
  token: string;
}

export default function HostZoneGame({ token }: HostZoneGameProps) {
  const currentState = useCurrentState();
  const hostParticipantId = getParticipantByToken(token) ?? 'oskar';
  const isGameActive = currentState === 'day-1';

  // Day 2 assignments — API returns { assignments: [...] }
  const { data: day2Data, mutate: mutateAssignments } = useSWR<{ assignments: Day2TeamAssignment[] }>(
    '/api/game/day2-assignments',
    fetcher,
    { refreshInterval: 15_000 }
  );
  const day2Assignments = day2Data?.assignments ?? null;
  const afterLunch = day2Assignments && day2Assignments.length > 0;

  // Phase is determined by whether the merge has happened, not by app state
  const phase = afterLunch ? 'day2' : 'day1';

  // Day 2 transition
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const handleTransition = useCallback(async () => {
    if (!confirm('Start Day 2 — Merge Teams?\n\nThis will merge Day 1 teams based on current scores. This action is idempotent.')) return;
    setTransitioning(true);
    setTransitionError(null);
    try {
      const res = await fetch('/api/game/transition-to-day2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: hostParticipantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Transition failed');
      }
      mutateAssignments();
    } catch (e) {
      setTransitionError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setTransitioning(false);
    }
  }, [mutateAssignments]);

  // Mock GPS server flag
  const { data: mockGpsData, mutate: mutateMockGps } = useSWR<{ active: boolean }>(
    '/api/dev/mock-location',
    fetcher
  );
  const [togglingGps, setTogglingGps] = useState(false);

  const handleToggleMockGps = useCallback(async () => {
    setTogglingGps(true);
    try {
      await fetch('/api/dev/mock-location', { method: 'POST' });
      mutateMockGps();
    } finally {
      setTogglingGps(false);
    }
  }, [mutateMockGps]);

  // Reset claims
  const [resetting, setResetting] = useState(false);

  const handleResetClaims = useCallback(async () => {
    if (!confirm('Reset ALL zone claims and Day 2 assignments?\n\nThis cannot be undone. Zones will return to unclaimed state.')) return;
    setResetting(true);
    try {
      await fetch('/api/zones/claims/reset', { method: 'DELETE', headers: { 'x-host-token': token } });
      mutateAssignments();
    } finally {
      setResetting(false);
    }
  }, [mutateAssignments]);

  // Build day2 team summary for display
  const day2Teams = afterLunch
    ? buildDay2Summary(day2Assignments)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🗺️ Zone Game</h1>
          <p className="text-gray-600">
            {isGameActive
              ? `Game active — ${afterLunch ? 'Steal Phase' : 'Day 1'}`
              : `Game inactive — current state: ${currentState ?? 'loading...'}`}
          </p>
        </div>

        <HostNavigation token={token} currentPage="zones" />

        <div className="flex justify-end mb-4">
          <Link
            href={`/${token}/host/zones/challenges`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm shadow-sm"
          >
            📝 Edit Challenges
          </Link>
        </div>

        <div className="space-y-6">

          {/* ---- Live Map (all locations) ---- */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📍</span>Live Map — All Participants
            </h2>
            <ZoneMap
              participantId="host"
              teamColor="blue"
              phase={phase}
              height="50dvh"
              showAllLocations
              day2Assignments={day2Assignments ?? null}
            />
          </div>

          {/* ---- Scoreboard ---- */}
          <ZoneScoreboard />

          {/* ---- Day 2 Transition ---- */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🔄</span>Day 2 Transition
            </h2>

            {afterLunch ? (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium">✅ Day 2 merge completed</p>
                </div>
                {day2Teams && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(day2Teams).map(([color, members]) => (
                      <div key={color} className="border rounded-lg p-4">
                        <h3 className="font-bold capitalize flex items-center gap-2 mb-2">
                          <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: TEAM_HEX[color as TeamColor] }} />
                          {color} team
                        </h3>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {members.map(m => <li key={m}>• {m}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4 text-sm">
                  Merges Day 1 teams based on scores: highest + lowest → Team A, second + third → Team B.
                </p>
                {currentState !== 'day-1' && (
                  <p className="text-amber-600 text-sm mb-4">
                    ⚠️ Only available during Day 1 before merge
                  </p>
                )}
                <button
                  onClick={handleTransition}
                  disabled={currentState !== 'day-1' || transitioning}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {transitioning ? 'Merging…' : 'Start Day 2 — Merge Teams'}
                </button>
                {transitionError && (
                  <p className="text-red-600 text-sm mt-2">{transitionError}</p>
                )}
              </div>
            )}
          </div>

          {/* ---- Challenge Review & Point Withdrawal ---- */}
          <ZoneChallengeReview hostParticipantId={hostParticipantId} />

          {/* ---- Game Controls ---- */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-orange-300">
            <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
              <span className="mr-2">🛠️</span>Game Controls
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleResetClaims}
                disabled={resetting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Resetting…' : '🗑️ Reset All Zone Claims'}
              </button>

              <button
                onClick={handleToggleMockGps}
                disabled={togglingGps}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mockGpsData?.active
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50`}
              >
                {togglingGps ? 'Toggling…' : `📍 GPS Override: ${mockGpsData?.active ? 'ON' : 'OFF'}`}
              </button>
            </div>
            <p className="text-orange-700 text-xs mt-3">
              Reset clears all zone claims and Day 2 assignments. GPS Override enables manual position pinning on participant maps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const TEAM_HEX: Record<TeamColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
};

function buildDay2Summary(assignments: Day2TeamAssignment[]): Record<string, string[]> {
  const teams: Record<string, string[]> = {};
  for (const a of assignments) {
    if (!teams[a.day2_team_color]) teams[a.day2_team_color] = [];
    teams[a.day2_team_color].push(a.participant_id);
  }
  return teams;
}
