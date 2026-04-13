'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { PackingItem, PackingCategory } from '@/types/packing';
import { CATEGORY_ICONS, getItemIcon } from '@/types/packing';
import { PARTICIPANTS } from '@/data/participants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: PackingCategory[] = ['clothing', 'electronics', 'personal', 'documents', 'special'];

const PARTICIPANT_OPTIONS = [
  { value: 'everyone', label: 'Everyone on the trip' },
  ...Object.values(PARTICIPANTS).map((p) => ({ value: p.id, label: p.name })),
];

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

// ---------------------------------------------------------------------------
// Create Form
// ---------------------------------------------------------------------------

function CreateItemForm({ onCreated }: { onCreated: (item: PackingItem) => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<PackingCategory>('clothing');
  const [emojiOverride, setEmojiOverride] = useState('');
  const [participantId, setParticipantId] = useState('everyone');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/packing-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          category,
          emoji_override: emojiOverride.trim() || null,
          participant_id: participantId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const created: PackingItem = await res.json();
      onCreated(created);
      setText('');
      setEmojiOverride('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-green-800 mb-3">+ Add New Item</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Item text (e.g. Warm jacket)"
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PackingCategory)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
        >
          {VALID_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_ICONS[c]} {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={emojiOverride}
          onChange={(e) => setEmojiOverride(e.target.value)}
          placeholder="Emoji override (optional)"
          maxLength={10}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
        />
        <select
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none"
        >
          {PARTICIPANT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        type="submit"
        disabled={saving || !text.trim()}
        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {saving ? 'Creating…' : 'Create Item'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Item Row (view / edit / delete)
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  isEditing,
  isDeleting,
  editDraft,
  saving,
  error,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  item: PackingItem;
  isEditing: boolean;
  isDeleting: boolean;
  editDraft: { text: string; category: PackingCategory; emoji_override: string; participant_id: string };
  saving: boolean;
  error: string | null;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (draft: { text: string; category: PackingCategory; emoji_override: string; participant_id: string }) => void;
  onDeleteStart: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  if (isEditing) {
    return (
      <div className="py-3 border-t border-gray-100 first:border-t-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={editDraft.text}
            onChange={(e) => onDraftChange({ ...editDraft, text: e.target.value })}
            maxLength={200}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
          <select
            value={editDraft.category}
            onChange={(e) => onDraftChange({ ...editDraft, category: e.target.value as PackingCategory })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            {VALID_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={editDraft.emoji_override}
            onChange={(e) => onDraftChange({ ...editDraft, emoji_override: e.target.value })}
            placeholder="Emoji override (optional)"
            maxLength={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
          <select
            value={editDraft.participant_id}
            onChange={(e) => onDraftChange({ ...editDraft, participant_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          >
            {PARTICIPANT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            disabled={saving || !editDraft.text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const participantLabel =
    item.participant_id === 'everyone'
      ? 'Everyone'
      : PARTICIPANTS[item.participant_id]?.name ?? item.participant_id;

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0">
      <div className="flex items-center gap-3">
        <span className="text-lg shrink-0">{getItemIcon(item)}</span>
        <span className="font-medium text-gray-800 flex-1">{item.text}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {item.category}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {participantLabel}
        </span>
        {isDeleting ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Delete?</span>
            <button
              onClick={onDeleteConfirm}
              disabled={saving}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '…' : 'Yes'}
            </button>
            <button
              onClick={onDeleteCancel}
              disabled={saving}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDeleteStart}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export default function PackingItemEditor() {
  const { data: items, error, mutate } = useSWR<PackingItem[]>(
    '/api/packing-items',
    fetcher,
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({
    text: '',
    category: 'clothing' as PackingCategory,
    emoji_override: '',
    participant_id: 'everyone',
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleEdit = useCallback((item: PackingItem) => {
    setEditingId(item.id);
    setDeletingId(null);
    setEditDraft({
      text: item.text,
      category: item.category,
      emoji_override: item.emoji_override ?? '',
      participant_id: item.participant_id,
    });
    setActionError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setActionError(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (editingId === null) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/packing-items/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editDraft.text.trim(),
          category: editDraft.category,
          emoji_override: editDraft.emoji_override.trim() || null,
          participant_id: editDraft.participant_id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      const updated: PackingItem = await res.json();
      mutate(
        (prev) => prev?.map((i) => (i.id === updated.id ? updated : i)),
        false,
      );
      setEditingId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [editingId, editDraft, mutate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingId === null) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/packing-items/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Delete failed (${res.status})`);
      }
      mutate(
        (prev) => prev?.filter((i) => i.id !== deletingId),
        false,
      );
      setDeletingId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [deletingId, mutate]);

  const handleCreated = useCallback(
    (item: PackingItem) => {
      mutate((prev) => (prev ? [...prev, item] : [item]), false);
    },
    [mutate],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load packing items. {error.message}
      </div>
    );
  }

  if (!items) {
    return <div className="text-center py-12 text-gray-500">Loading packing items…</div>;
  }

  // Group by participant
  const grouped = new Map<string, PackingItem[]>();
  for (const item of items) {
    const key = item.participant_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  // Sort: 'everyone' first, then alphabetically by participant
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'everyone') return -1;
    if (b === 'everyone') return 1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Packing Items</h2>
      <p className="text-gray-600 text-sm mb-6">
        {items.length} items total. Create, edit, or delete items — changes apply immediately.
      </p>

      <CreateItemForm onCreated={handleCreated} />

      <div className="space-y-4">
        {sortedKeys.map((pid) => {
          const groupItems = grouped.get(pid)!;
          const label =
            pid === 'everyone'
              ? 'Everyone on the trip'
              : PARTICIPANTS[pid]?.name ?? pid;

          return (
            <div
              key={pid}
              className="bg-white rounded-lg shadow border border-gray-200 p-4"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {pid === 'everyone' ? '🌍' : '👤'} {label}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({groupItems.length} items)
                </span>
              </h3>
              {groupItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  isDeleting={deletingId === item.id}
                  editDraft={editingId === item.id ? editDraft : { text: '', category: 'clothing', emoji_override: '', participant_id: 'everyone' }}
                  saving={saving && (editingId === item.id || deletingId === item.id)}
                  error={editingId === item.id || deletingId === item.id ? actionError : null}
                  onEdit={() => handleEdit(item)}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDraftChange={setEditDraft}
                  onDeleteStart={() => { setDeletingId(item.id); setEditingId(null); setActionError(null); }}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={() => { setDeletingId(null); setActionError(null); }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
