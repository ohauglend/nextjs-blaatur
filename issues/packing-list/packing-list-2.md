# Packing List — Issue #2: UI & API

## Context Summary

This is the second packing list issue. It builds on the `packing_items` table established in Issue #1 and delivers:

1. **CRUD API routes** for reading and managing packing items
2. **Host packing management page** at `[token]/host/packing` — a new route inside the host dashboard with inline item editing and a participant viewer
3. **Refactored `PackingList.tsx`** — fetches from the DB instead of static data; adds localStorage-backed packed state (radio/checkbox per item)
4. **`HostDashboard.tsx` update** — a new card linking to the packing management page

**Prerequisites**: Issue #1 must be complete and the `packing_items` table must exist in the DB before any work in this issue begins.

## Scope

### 1. API Routes

#### `GET /api/packing-items`
- Returns all items, ordered by `created_at ASC`
- Used by the host editor to populate the full item list

#### `GET /api/packing-items?participant={id}`
- Returns items where `participant_id = '{id}'` OR `participant_id = 'everyone'`
- Used by `PackingList.tsx` on the participant page

#### `POST /api/packing-items`
- Body: `{ text, category, emoji_override?, participant_id }`
- Validates: `text` is non-empty string ≤ 200 chars; `category` is one of the 5 valid values; `emoji_override` is a short string or null; `participant_id` is a known participant ID or `'everyone'`
- Returns the created row

#### `PUT /api/packing-items/[id]`
- Body: any subset of `{ text, category, emoji_override, participant_id }`
- Updates only the supplied fields plus sets `updated_at = NOW()`
- Returns the updated row

#### `DELETE /api/packing-items/[id]`
- Deletes the item by ID
- Returns `{ success: true }`

### 2. New Files

#### `app/api/packing-items/route.ts`
Handles `GET` (all or participant-scoped) and `POST`.

#### `app/api/packing-items/[id]/route.ts`
Handles `PUT` and `DELETE`.

#### `components/PackingItemEditor.tsx`
Host-only editor component. **Pattern: mirrors `ChallengeEditor.tsx`** — inline editing within a list, no modal. Specific behaviour:

- Fetches all items via `GET /api/packing-items` using SWR
- Displays items grouped by participant (one section per participant ID + one section for `'everyone'` items)
- Each row shows: display icon (emoji_override or category default), item text, category badge, participant badge, Edit and Delete buttons
- Clicking **Edit** opens an inline form replacing the row — fields: text input, category select, emoji_override input (optional), participant select (all 8 participants + `'everyone'`)
- **Cancel** restores the row; **Save** calls `PUT /api/packing-items/[id]`, updates SWR cache on success
- Clicking **Delete** shows an inline confirmation ("Delete this item?", Yes / Cancel), then calls `DELETE /api/packing-items/[id]`
- A **Create new item** form sits above the list — fields: text, category, emoji_override (optional), participant select with an "Everyone on the trip" option. Submits to `POST /api/packing-items`, appends result to cache.
- Saving and deleting errors are shown inline next to the affected row (same pattern as `ChallengeEditor.tsx`)

#### `app/[token]/host/packing/page.tsx`
New host route. Validates the host token (same pattern as `app/[token]/host/controls/page.tsx`). Renders `HostPackingPage`.

#### `components/HostPackingPage.tsx`

Separate client component (mirrors pattern of `HostControls.tsx`).

Two-panel layout:

**Panel A — Item Editor** (`PackingItemEditor` component, full width on mobile, left half on desktop)

**Panel B — Participant Viewer**
- Shows all packing lists: one section per participant (all 8 participants + hosts, in the same order as `data/participants.ts`)
- Each section shows the participant's name, the items assigned specifically to them, and all `'everyone'` items
- A simple dropdown or tab filter at the top allows narrowing to a single participant  
- Items in this panel are read-only (no edit/delete controls)
- The Participant Viewer makes individual `GET /api/packing-items?participant={id}` calls per participant using SWR. When the filter is set to "All", all 8 calls are made in parallel. When narrowed to a single participant, only that participant's call is made.

### 3. Modified Files

#### `components/PackingList.tsx`
Refactor from static-data-driven to DB-driven:

- Remove `packingList: PackingListType` prop. Add `participantId: string` prop.
- Fetch items via `GET /api/packing-items?participant={participantId}` (SWR, no-store cache)
- Loading state: skeleton or spinner
- Empty state: brief message ("No items added yet")
- **Packed state**: a radio button next to each item. Clicking it marks the item as "packed" purely in the client. Visually: unchecked = empty circle, checked = filled circle (CSS-styled `<input type="radio">` or equivalent, not part of a radio group — each item is independent). State is persisted in `localStorage` under the key `packing-packed-{participantId}-{itemId}`. State is restored on mount. Items do not visually reorder when checked.
- Group items by category (same grouping as current implementation: category heading + items below)
- Show `emoji_override` if set, otherwise fall back to `CATEGORY_ICONS[category]` from `types/packing.ts` (`getItemIcon` helper)
- Remove the "Required / Optional" split, the `specialInstructions` block, and the legend footer (dropped in Issue #1)

#### `components/HostOverview.tsx`
- Remove import of `PACKING_LISTS` from `@/data/packing-lists`
- Replace `<PackingList packingList={packingList} />` with `<PackingList participantId={participantId} />` using the refactored component

#### `app/[token]/[participant]/ParticipantPageClient.tsx`
- Remove `import { PACKING_LISTS } from '@/data/packing-lists'`
- Remove `const packingList = PACKING_LISTS[participantId]`
- Replace `{packingList && <PackingList packingList={packingList} />}` with `<PackingList participantId={participantId} />` (the component handles its own loading/empty state)

#### `components/HostDashboard.tsx`
Add a new card in the dashboard grid linking to `/${token}/host/packing`. Card should follow the same visual pattern as the existing "Zone Game" and "Host Controls" cards:

```
🎒 Packing Lists
Create, edit, and assign packing items for all participants. View everyone's list in one place.
Open Packing Lists →
```

### 4. `data/packing-lists.ts` — Deletion

Delete `data/packing-lists.ts` once all import sites are updated. Confirmed as part of this issue's Definition of Done.

## Component Architecture

```
app/[token]/host/packing/page.tsx         ← validates token, renders HostPackingPage
  components/HostPackingPage.tsx          ← two-panel layout client component
    components/PackingItemEditor.tsx      ← CRUD editor (inline editing, create form, delete with confirmation)

components/PackingList.tsx                ← participant-facing, DB-backed, localStorage packed state
  (used in ParticipantPageClient.tsx and HostOverview.tsx)

app/api/packing-items/route.ts            ← GET (all/participant-filtered) + POST
app/api/packing-items/[id]/route.ts       ← PUT + DELETE
```

## API Shape Reference

```typescript
// GET /api/packing-items — returns PackingItem[]
// GET /api/packing-items?participant=sara — returns PackingItem[] (sara + everyone)

// POST /api/packing-items
// Body: PackingItemInput
// Returns: PackingItem

// PUT /api/packing-items/[id]
// Body: Partial<PackingItemInput>
// Returns: PackingItem

// DELETE /api/packing-items/[id]
// Returns: { success: true }
```

Types are defined in `types/packing.ts` (Issue #1).

## localStorage Key Convention

```
packing-packed-{participantId}-{itemId}
```

Example: `packing-packed-sara-42` → `true` (item 42 is packed for sara)

The value stored is always the string `"true"`. On mount, `localStorage.getItem(key) === 'true'` is used to restore state. On uncheck, `localStorage.removeItem(key)` is called.

## Security Notes

- Write operations (`POST`, `PUT`, `DELETE`) are unprotected at the API level — they rely on the host page being the only entry point. No token validation on API routes.
- `participant_id` must be validated server-side against the known list of valid values: `['oskar', 'odd', 'aasmund', 'emilie', 'mathias', 'brage', 'sara', 'johanna', 'everyone']`

## Definition of Done

- [ ] `GET /api/packing-items` returns all items; `?participant=` filter returns participant + everyone items
- [ ] `POST /api/packing-items` creates a new item; `PUT` updates; `DELETE` removes
- [ ] `PackingItemEditor.tsx` renders inline editor with create form and inline delete confirmation; all three operations reflect immediately via SWR mutation
- [ ] Host packing page accessible at `[token]/host/packing`; participant viewer shows all lists with working participant filter
- [ ] `PackingList.tsx` refactored: fetches from DB, radio-button packed state persists in localStorage across refresh
- [ ] `ParticipantPageClient.tsx` and `HostOverview.tsx` updated to use refactored `PackingList` API
- [ ] `HostDashboard.tsx` has Packing Lists card
- [ ] `data/packing-lists.ts` deleted, no remaining imports
- [ ] No TypeScript errors, no broken imports
