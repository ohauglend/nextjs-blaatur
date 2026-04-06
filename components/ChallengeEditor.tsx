'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChallengeWithZoneName {
  id: number;
  zone_id: number;
  zone_name: string;
  phase: 'day1' | 'day2';
  text: string;
  type: 'generic' | 'geography';
  participant_scope: 'team' | 'one';
}

interface ChallengeEditorProps {
  token: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

function groupByZone(
  challenges: ChallengeWithZoneName[],
): Array<{
  zone_id: number;
  zone_name: string;
  day1: ChallengeWithZoneName;
  day2: ChallengeWithZoneName;
}> {
  const map = new Map<
    number,
    { zone_id: number; zone_name: string; day1?: ChallengeWithZoneName; day2?: ChallengeWithZoneName }
  >();

  for (const c of challenges) {
    if (!map.has(c.zone_id)) {
      map.set(c.zone_id, { zone_id: c.zone_id, zone_name: c.zone_name });
    }
    const entry = map.get(c.zone_id)!;
    if (c.phase === 'day1') entry.day1 = c;
    else entry.day2 = c;
  }

  return Array.from(map.values())
    .filter((e) => e.day1 && e.day2)
    .map((e) => ({ zone_id: e.zone_id, zone_name: e.zone_name, day1: e.day1!, day2: e.day2! }));
}

// ---------------------------------------------------------------------------
// ChallengeRow (local sub-component)
// ---------------------------------------------------------------------------

function ChallengeRow({
  challenge,
  isEditing,
  draftText,
  saving,
  saveError,
  onEdit,
  onCancel,
  onSave,
  onDraftChange,
}: {
  challenge: ChallengeWithZoneName;
  isEditing: boolean;
  draftText: string;
  saving: boolean;
  saveError: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDraftChange: (text: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
      ta.focus();
    }
  }, [isEditing, draftText]);

  const typeBadge =
    challenge.type === 'geography' ? '📍 Geography' : '🍺 Generic';
  const scopeBadge =
    challenge.participant_scope === 'team' ? '👥 Team' : '☝️ One';
  const phaseLabel = challenge.phase === 'day1' ? 'Day 1' : 'Day 2';

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {phaseLabel}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {typeBadge}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {scopeBadge}
        </span>
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            maxLength={300}
            className="w-full border border-gray-300 rounded-lg p-3 text-[15px] leading-relaxed resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            rows={2}
          />
          <div className="text-xs text-gray-400 text-right mb-2">
            {draftText.length}/300
          </div>
          {saveError && (
            <p className="text-red-600 text-sm mb-2">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving || draftText.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <p className="text-[15px] text-gray-800 leading-relaxed flex-1">
            {challenge.text}
          </p>
          <button
            onClick={onEdit}
            className="shrink-0 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChallengeEditor (main export)
// ---------------------------------------------------------------------------

export default function ChallengeEditor({ token }: ChallengeEditorProps) {
  const { data: challenges, error, mutate } = useSWR<ChallengeWithZoneName[]>(
    '/api/challenges',
    fetcher,
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEdit = useCallback((challenge: ChallengeWithZoneName) => {
    setEditingId(challenge.id);
    setDraftText(challenge.text);
    setSaveError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setDraftText('');
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (editingId === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/challenges/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draftText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      const updated: ChallengeWithZoneName = await res.json();
      // Optimistically replace the item in the local cache
      mutate(
        (prev) =>
          prev?.map((c) => (c.id === updated.id ? updated : c)),
        false,
      );
      setEditingId(null);
      setDraftText('');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [editingId, draftText, mutate]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load challenges. {error.message}
      </div>
    );
  }

  if (!challenges) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading challenges…
      </div>
    );
  }

  const zones = groupByZone(challenges);

  if (zones.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        No challenges found. Make sure the database is seeded.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Challenges</h2>
      <p className="text-gray-600 text-sm mb-6">
        {zones.length} zones · {challenges.length} challenges total. Edit challenge text inline — changes apply immediately.
      </p>

      <div className="space-y-4">
        {zones.map((zone) => (
          <div
            key={zone.zone_id}
            className="bg-white rounded-lg shadow border border-gray-200 p-4"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {zone.zone_name}
            </h3>
            <ChallengeRow
              challenge={zone.day1}
              isEditing={editingId === zone.day1.id}
              draftText={editingId === zone.day1.id ? draftText : ''}
              saving={saving && editingId === zone.day1.id}
              saveError={editingId === zone.day1.id ? saveError : null}
              onEdit={() => handleEdit(zone.day1)}
              onCancel={handleCancel}
              onSave={handleSave}
              onDraftChange={setDraftText}
            />
            <ChallengeRow
              challenge={zone.day2}
              isEditing={editingId === zone.day2.id}
              draftText={editingId === zone.day2.id ? draftText : ''}
              saving={saving && editingId === zone.day2.id}
              saveError={editingId === zone.day2.id ? saveError : null}
              onEdit={() => handleEdit(zone.day2)}
              onCancel={handleCancel}
              onSave={handleSave}
              onDraftChange={setDraftText}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
