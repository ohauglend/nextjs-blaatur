# Packing List — Issue #3: Participant Add Item

## Summary
Participants should be able to add new items to their own packing list during the `pre-trip-packing` phase. Added items are personal (scoped to the participant) and are not visible to other participants.

## Scope
- Text + category inputs only (no emoji override — keeps the form simple)
- `participant_id` is always set to the current participant's ID (never `'everyone'`)
- The POST `/api/packing-items` endpoint already supports this — no backend changes needed

## Implementation Steps

### 1. Upgrade `useSWR` call to capture `mutate`
In `components/PackingList.tsx`, destructure `mutate` from the `useSWR` return so the list can be refreshed after a new item is saved.

```ts
const { data: items, error, mutate } = useSWR<PackingItem[]>(
  `/api/packing-items?participant=${participantId}`,
  fetcher,
);
```

### 2. Add form state
Add the following state variables inside `PackingList`:

```ts
const [showForm, setShowForm] = useState(false);
const [newText, setNewText] = useState('');
const [newCategory, setNewCategory] = useState<PackingCategory>('personal');
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
```

### 3. Add submit handler

```ts
const handleAddItem = async (e: React.FormEvent) => {
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
};
```

### 4. Render "Add item" button + inline form
At the bottom of the returned JSX (after the grouped item list):

```tsx
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
```

## Files Changed
- `components/PackingList.tsx` — add form state, submit handler, and form UI

## Files Unchanged
- `app/api/packing-items/route.ts` — POST already supports this flow
- `types/packing.ts` — no changes needed

## Verification
1. In `pre-trip-packing` state, an "+ Add item" button appears at the bottom of the packing list
2. Clicking it reveals an inline form with a text field and category dropdown
3. Submitting saves the item → list refreshes → new item appears under the correct category
4. The new item is **not** visible in other participants' lists
5. The host packing page shows the new item under the correct participant
6. Submitting with an empty text field is blocked
7. Cancel hides the form and resets the inputs
