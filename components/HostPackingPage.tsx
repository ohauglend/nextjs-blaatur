'use client';

import { useState } from 'react';
import useSWR from 'swr';
import HostNavigation from './HostNavigation';
import PackingItemEditor from './PackingItemEditor';
import type { PackingItem } from '@/types/packing';
import { getItemIcon } from '@/types/packing';
import { PARTICIPANTS } from '@/data/participants';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

const ALL_PARTICIPANT_IDS = Object.keys(PARTICIPANTS);

interface HostPackingPageProps {
  token: string;
}

// ---------------------------------------------------------------------------
// Participant Viewer — read-only list per participant
// ---------------------------------------------------------------------------

function ParticipantViewer() {
  const [filter, setFilter] = useState<string>('all');

  const visibleIds = filter === 'all' ? ALL_PARTICIPANT_IDS : [filter];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
        >
          <option value="all">All participants</option>
          {ALL_PARTICIPANT_IDS.map((id) => (
            <option key={id} value={id}>
              {PARTICIPANTS[id].name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {visibleIds.map((pid) => (
          <ParticipantSection key={pid} participantId={pid} />
        ))}
      </div>
    </div>
  );
}

function ParticipantSection({ participantId }: { participantId: string }) {
  const { data: items, error } = useSWR<PackingItem[]>(
    `/api/packing-items?participant=${participantId}`,
    fetcher,
  );

  const participant = PARTICIPANTS[participantId];
  const label = participant?.name ?? participantId;
  const roleTag = participant?.role === 'host' ? '👑' : '🎒';

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
        Failed to load items for {label}.
      </div>
    );
  }

  if (!items) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-700">{roleTag} {label}</h4>
        <p className="text-gray-400 text-sm mt-1">Loading…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-700 mb-2">
        {roleTag} {label}
        <span className="text-sm font-normal text-gray-500 ml-2">({items.length} items)</span>
      </h4>
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm">No items.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm py-1">
              <span>{getItemIcon(item)}</span>
              <span className="text-gray-800">{item.text}</span>
              {item.participant_id === 'everyone' && (
                <span className="text-xs text-gray-400 ml-auto">(everyone)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HostPackingPage({ token }: HostPackingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎒 Packing Lists
          </h1>
          <p className="text-gray-600">
            Create, edit, and view packing items for all participants
          </p>
        </div>

        {/* Navigation */}
        <HostNavigation token={token} currentPage="packing" />

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Panel A — Editor */}
          <div>
            <PackingItemEditor />
          </div>

          {/* Panel B — Participant Viewer */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">👁️ Participant Lists</h2>
            <p className="text-gray-600 text-sm mb-4">
              Read-only view of each participant&apos;s packing list (including &quot;everyone&quot; items).
            </p>
            <ParticipantViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
