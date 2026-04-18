'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import type { PackingItem, PackingCategory } from '@/types/packing';
import { getItemIcon } from '@/types/packing';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

const CATEGORY_COLORS: Record<PackingCategory, string> = {
  clothing: 'bg-blue-50 border-blue-200',
  electronics: 'bg-purple-50 border-purple-200',
  personal: 'bg-green-50 border-green-200',
  documents: 'bg-red-50 border-red-200',
  special: 'bg-yellow-50 border-yellow-200',
};

function packedKey(participantId: string, itemId: number) {
  return `packing-packed-${participantId}-${itemId}`;
}

interface PackingListProps {
  participantId: string;
}

function PackingItemRow({
  item,
  packed,
  onToggle,
}: {
  item: PackingItem;
  packed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`p-3 rounded-lg border-2 ${CATEGORY_COLORS[item.category]} ${
        packed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Radio-style toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center transition-colors hover:border-blue-500"
          aria-label={packed ? 'Mark as not packed' : 'Mark as packed'}
        >
          {packed && (
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
          )}
        </button>

        <span className="text-lg shrink-0">{getItemIcon(item)}</span>
        <span
          className={`font-medium flex-1 ${
            packed ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {item.text}
        </span>
        <span className="text-xs uppercase tracking-wide text-gray-500 bg-white px-2 py-1 rounded">
          {item.category}
        </span>
      </div>
    </div>
  );
}

export default function PackingList({ participantId }: PackingListProps) {
  const { data: items, error, mutate } = useSWR<PackingItem[]>(
    `/api/packing-items?participant=${participantId}`,
    fetcher,
  );

  // Add-item form state
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<PackingCategory>('personal');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newText.trim()) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch('/api/packing-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newText.trim(), category: newCategory, participant_id: participantId }),
        });
        if (!res.ok) throw new Error('Failed to save item');
        await mutate();
        setNewText('');
        setNewCategory('personal');
        setShowForm(false);
      } catch {
        setSubmitError('Could not save item. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [newText, newCategory, participantId, mutate],
  );

  // Packed state from localStorage
  const [packedSet, setPackedSet] = useState<Set<number>>(new Set());

  // Restore packed state on mount + when items change
  useEffect(() => {
    if (!items) return;
    const restored = new Set<number>();
    for (const item of items) {
      if (typeof window !== 'undefined' && localStorage.getItem(packedKey(participantId, item.id)) === 'true') {
        restored.add(item.id);
      }
    }
    setPackedSet(restored);
  }, [items, participantId]);

  const togglePacked = useCallback(
    (itemId: number) => {
      setPackedSet((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
          localStorage.removeItem(packedKey(participantId, itemId));
        } else {
          next.add(itemId);
          localStorage.setItem(packedKey(participantId, itemId), 'true');
        }
        return next;
      });
    },
    [participantId],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load packing list.
      </div>
    );
  }

  if (!items) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-8 text-gray-500">Loading packing list…</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-8 text-gray-500">No items added yet.</div>
      </div>
    );
  }

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const grouped = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  }));

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          📋 Your Personal Packing List
        </h2>
        <p className="text-gray-600">
          Everything you need for the mystery adventure!
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map(({ category, items: catItems }) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize">
              {category} ({catItems.length})
            </h3>
            <div className="space-y-3">
              {catItems.map((item) => (
                <PackingItemRow
                  key={item.id}
                  item={item}
                  packed={packedSet.has(item.id)}
                  onToggle={() => togglePacked(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add item button / form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full mt-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"
        >
          + Add item
        </button>
      ) : (
        <form onSubmit={handleAddItem} className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-200 space-y-3">
          <input
            type="text"
            placeholder="Item name…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as PackingCategory)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="clothing">👕 Clothing</option>
            <option value="electronics">🔌 Electronics</option>
            <option value="personal">🧴 Personal</option>
            <option value="documents">📄 Documents</option>
            <option value="special">🎯 Special</option>
          </select>
          {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !newText.trim()}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewText(''); setSubmitError(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
