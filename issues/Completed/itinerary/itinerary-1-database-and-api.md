# Itinerary — Issue #1: Database & API Foundation

## Context Summary

This is the first of two itinerary issues. It establishes the `itinerary_items` database table and CRUD API routes. The itinerary feature provides three global (not per-participant) schedules:

- **Summary itinerary** — shown during the `flight` state, a trip overview
- **Day 1 itinerary** — shown during the `day-1` state
- **Day 2 itinerary** — shown during the `day-2` state

Each itinerary item has a datetime, a text description, and an emoji. Hosts manage all items via the API (Issue #2 adds the UI).

**There are no prerequisites** — this issue is self-contained.

## Scope

### 1. Database

#### New table: `itinerary_items`

Global itinerary items. One table for all three itinerary types.

```sql
CREATE TABLE IF NOT EXISTS itinerary_items (
    id SERIAL PRIMARY KEY,
    itinerary_type VARCHAR(10) NOT NULL CHECK (itinerary_type IN ('summary', 'day-1', 'day-2')),
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    text TEXT NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '📅',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_type
ON itinerary_items(itinerary_type);
```

### 2. API Routes

#### `GET /api/itinerary?type={summary|day-1|day-2}`

- `type` query param is **required**. Must be one of `'summary'`, `'day-1'`, `'day-2'`.
- Returns all items for that type, ordered by `datetime ASC`.
- If `DATABASE_URL` is not set, returns `[]`.

#### `POST /api/itinerary`

- Body: `{ itinerary_type, datetime, text, emoji? }`
- Validates:
  - `itinerary_type` is one of `'summary'`, `'day-1'`, `'day-2'`
  - `datetime` is a valid ISO date string
  - `text` is a non-empty string, max 300 characters
  - `emoji` (optional) is a string, max 10 characters; defaults to `'📅'`
- Returns the created row with status `201`.

#### `PUT /api/itinerary/[id]`

- Body: any subset of `{ datetime, text, emoji }`
- Updates only the supplied fields plus sets `updated_at = NOW()`
- Returns the updated row.
- `itinerary_type` is **not** updatable (delete and recreate instead).

#### `DELETE /api/itinerary/[id]`

- Deletes the item by ID.
- Returns `{ success: true }`.

### 3. New Files

#### `lib/schema.sql` (modified)
Add the `itinerary_items` table and index at the end.

#### `app/api/itinerary/route.ts`
Handles `GET` (type-filtered) and `POST`. Pattern mirrors `app/api/packing-items/route.ts`.

#### `app/api/itinerary/[id]/route.ts`
Handles `PUT` and `DELETE`. Pattern mirrors `app/api/packing-items/[id]/route.ts`.

### 4. TypeScript Interface

Define inline in the route files (no separate types file needed for this small scope):

```ts
interface ItineraryItem {
  id: number;
  itinerary_type: 'summary' | 'day-1' | 'day-2';
  datetime: string;
  text: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}
```
