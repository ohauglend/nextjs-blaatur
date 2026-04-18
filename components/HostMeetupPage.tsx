'use client';

import { useState } from 'react';
import useSWR from 'swr';
import HostNavigation from './HostNavigation';
import { PARTICIPANTS } from '@/data/participants';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

const ALL_PARTICIPANT_IDS = Object.keys(PARTICIPANTS);

interface MeetupSpotRow {
  participant_id: string;
  address: string | null;
  meetup_time: string | null;
  updated_at?: string;
}

interface HostMeetupPageProps {
  token: string;
}

export default function HostMeetupPage({ token }: HostMeetupPageProps) {
  const { data: spots, mutate } = useSWR<MeetupSpotRow[]>(
    '/api/meetup-spots',
    fetcher,
  );

  // Build a lookup map from fetched data
  const spotMap = new Map<string, MeetupSpotRow>();
  if (spots) {
    for (const s of spots) {
      spotMap.set(s.participant_id, s);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📍 Meet-up Spots
          </h1>
          <p className="text-gray-600">
            Set individual meetup address and time for each participant
          </p>
        </div>

        <HostNavigation token={token} currentPage="meetup" />

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-3">
            {ALL_PARTICIPANT_IDS.map((pid) => (
              <MeetupRow
                key={pid}
                participantId={pid}
                spot={spotMap.get(pid) ?? null}
                onSaved={() => mutate()}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface MeetupRowProps {
  participantId: string;
  spot: MeetupSpotRow | null;
  onSaved: () => void;
}

function MeetupRow({ participantId, spot, onSaved }: MeetupRowProps) {
  const participant = PARTICIPANTS[participantId];
  const label = participant?.name ?? participantId;
  const roleTag = participant?.role === 'host' ? '👑' : '🎒';

  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(spot?.address ?? '');
  const [meetupTime, setMeetupTime] = useState(
    spot?.meetup_time ? toDatetimeLocalValue(spot.meetup_time) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setAddress(spot?.address ?? '');
    setMeetupTime(spot?.meetup_time ? toDatetimeLocalValue(spot.meetup_time) : '');
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetup-spots/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address || null,
          meetup_time: meetupTime ? new Date(meetupTime).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      onSaved();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const formattedTime = spot?.meetup_time
    ? new Date(spot.meetup_time).toLocaleString('nb-NO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  if (editing) {
    return (
      <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <span>{roleTag}</span>
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              placeholder="e.g. Kalku iela 1, Riga"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meet-up Time</label>
            <input
              type="datetime-local"
              value={meetupTime}
              onChange={(e) => setMeetupTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-3 hover:bg-gray-50">
      <span>{roleTag}</span>
      <span className="font-semibold text-gray-800 w-24">{label}</span>
      <span className="text-gray-600 flex-1 truncate">{spot?.address || '—'}</span>
      <span className="text-gray-500 text-sm w-48 text-right">{formattedTime}</span>
      <button
        onClick={startEdit}
        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-all"
      >
        Edit
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an ISO string to `YYYY-MM-DDTHH:MM` for datetime-local input */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
