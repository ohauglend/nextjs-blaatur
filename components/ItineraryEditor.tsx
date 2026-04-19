'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItineraryType = 'summary' | 'day-1' | 'day-2';

interface ItineraryItem {
  id: number;
  itinerary_type: ItineraryType;
  datetime: string;
  text: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

interface ItineraryEditorProps {
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

const TABS: { key: ItineraryType; label: string; emoji: string }[] = [
  { key: 'summary', label: 'Summary', emoji: '✈️' },
  { key: 'day-1', label: 'Day 1', emoji: '🎯' },
  { key: 'day-2', label: 'Day 2', emoji: '🏆' },
];

function formatDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// ItemRow
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  onMutate,
}: {
  item: ItineraryItem;
  onMutate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftDatetime, setDraftDatetime] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraftDatetime(toDatetimeLocal(item.datetime));
    setDraftText(item.text);
    setDraftEmoji(item.emoji);
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!draftText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/itinerary/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datetime: new Date(draftDatetime).toISOString(),
          text: draftText.trim(),
          emoji: draftEmoji.trim() || '📅',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      setEditing(false);
      onMutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/itinerary/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onMutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="border rounded-lg p-3 bg-blue-50 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={draftEmoji}
            onChange={(e) => setDraftEmoji(e.target.value)}
            className="w-16 border rounded px-2 py-1 text-center text-lg"
            maxLength={10}
            placeholder="📅"
          />
          <input
            type="datetime-local"
            value={draftDatetime}
            onChange={(e) => setDraftDatetime(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          maxLength={300}
          placeholder="What's happening…"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !draftText.trim()}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="border rounded-lg p-3 bg-red-50 flex items-center justify-between">
        <span className="text-sm text-red-800">Delete this item?</span>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Deleting…' : 'Yes'}
          </button>
          <button
            onClick={() => setDeleting(false)}
            disabled={saving}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-white flex items-start gap-3 group">
      <span className="text-xl leading-none mt-0.5">{item.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-500">{formatDatetime(item.datetime)}</div>
        <div className="text-sm text-gray-800">{item.text}</div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={startEdit}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Edit
        </button>
        <button
          onClick={() => setDeleting(true)}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-red-100 text-red-600"
        >
          Delete
        </button>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateForm
// ---------------------------------------------------------------------------

function CreateForm({
  itineraryType,
  onMutate,
}: {
  itineraryType: ItineraryType;
  onMutate: () => void;
}) {
  const [datetime, setDatetime] = useState('');
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('📅');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !datetime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary_type: itineraryType,
          datetime: new Date(datetime).toISOString(),
          text: text.trim(),
          emoji: emoji.trim() || '📅',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create item');
      }
      setText('');
      setDatetime('');
      setEmoji('📅');
      onMutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-2 border-dashed border-indigo-300 rounded-lg p-4 bg-indigo-50 space-y-3">
      <h4 className="text-sm font-semibold text-indigo-800">Add new item</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-16 border rounded px-2 py-1 text-center text-lg"
          maxLength={10}
          placeholder="📅"
        />
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-sm"
          required
        />
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
        maxLength={300}
        placeholder="What's happening…"
        required
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !text.trim() || !datetime}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Adding…' : '+ Add item'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// TabPanel
// ---------------------------------------------------------------------------

function TabPanel({ type }: { type: ItineraryType }) {
  const { data: items, error, mutate } = useSWR<ItineraryItem[]>(
    `/api/itinerary?type=${type}`,
    fetcher,
  );

  if (error) {
    return <p className="text-red-600 text-sm">Failed to load items.</p>;
  }
  if (!items) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CreateForm itineraryType={type} onMutate={() => mutate()} />
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm italic py-4 text-center">No items yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onMutate={() => mutate()} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItineraryEditor (main export)
// ---------------------------------------------------------------------------

export default function ItineraryEditor({ token }: ItineraryEditorProps) {
  const [activeTab, setActiveTab] = useState<ItineraryType>('summary');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📋</span>
        Itinerary Editor
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <TabPanel type={activeTab} />
    </div>
  );
}
