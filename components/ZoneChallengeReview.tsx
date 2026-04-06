'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { TeamColor, GamePhase } from '@/types/zones';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); });

const TEAM_EMOJI: Record<TeamColor, string> = { red: '🔴', yellow: '🟡', blue: '🔵', green: '🟢' };

interface CompletedClaim {
  zone_id: number;
  zone_name: string;
  team_color: TeamColor;
  phase: GamePhase;
  challenge_text: string;
  completed_at: string;
  claimed_by_participant: string;
}

export default function ZoneChallengeReview({ hostParticipantId }: { hostParticipantId: string }) {
  const { data: claims, error, isLoading, mutate } = useSWR<CompletedClaim[]>(
    '/api/zones/claims/completed',
    fetcher,
    { refreshInterval: 15_000 }
  );

  const [withdrawing, setWithdrawing] = useState<number | null>(null);

  const handleWithdraw = useCallback(async (claim: CompletedClaim) => {
    if (!confirm(`Withdraw 1 point from ${claim.team_color} team?\n\nZone: ${claim.zone_name}\nThis will re-open the zone for any team to claim.`)) return;
    setWithdrawing(claim.zone_id);
    try {
      const res = await fetch(`/api/zones/${claim.zone_id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: hostParticipantId, phase: claim.phase }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Withdrawal failed');
        return;
      }
      mutate();
    } finally {
      setWithdrawing(null);
    }
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-56 mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-red-600 text-sm">Failed to load completed claims</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📋</span>Challenge Review &amp; Point Withdrawal
      </h2>

      {!claims || claims.length === 0 ? (
        <p className="text-gray-500 text-sm">No completed challenges yet.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={`${claim.zone_id}-${claim.phase}`} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{TEAM_EMOJI[claim.team_color]}</span>
                    <span className="font-semibold text-gray-800">{claim.zone_name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{claim.phase}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1 line-clamp-2">{claim.challenge_text}</p>
                  <p className="text-xs text-gray-400">
                    Completed by {claim.claimed_by_participant} • {new Date(claim.completed_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleWithdraw(claim)}
                  disabled={withdrawing === claim.zone_id}
                  className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {withdrawing === claim.zone_id ? 'Withdrawing…' : 'Withdraw Point'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
