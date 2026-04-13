# Packing List — Issue #1: Database Foundation

## Context Summary

The current packing list system is fully static: each participant's items are hardcoded in `data/packing-lists.ts` and rendered by `components/PackingList.tsx`. This means hosts cannot create, update, or delete items without a code deploy.

This issue migrates packing items into Postgres so hosts can manage them at runtime. It establishes the data layer only — no API routes, no UI. Those are covered in Issue #2.

The packing list is shown to participants during the `pre-trip-packing` state in `app/[token]/[participant]/ParticipantPageClient.tsx`. Hosts also see it in `HostOverview.tsx` as a preview.

This is the prerequisite issue for Issue #2. No UI or API work should begin until this one is complete.

## Scope

Define the `packing_items` table, TypeScript interfaces, and provide the migration SQL for manual execution in Neon. This issue contains **no API logic and no UI changes** — purely the data layer.

## Database Architecture

### Table: `packing_items`

**Purpose**: Store all packing items for all participants. Each item belongs to either a specific participant (by `participant_id`) or to everyone on the trip (`participant_id = 'everyone'`). When a query fetches items for a specific participant, it should return rows where `participant_id = '{participant}'` OR `participant_id = 'everyone'`.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `text` (TEXT NOT NULL) — The packing item label, e.g. "Passport"
- `category` (VARCHAR(20) NOT NULL) — One of: `clothing`, `electronics`, `personal`, `documents`, `special`. Controls the default display icon.
- `emoji_override` (TEXT) — NULL by default. When set, this emoji is shown instead of the category icon. Hosts can optionally set this per item.
- `participant_id` (VARCHAR(50) NOT NULL) — Participant ID (e.g. `sara`, `oskar`) or the literal string `'everyone'`. Items with `'everyone'` appear in all participants' and hosts' lists.
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

**Notes**:
- No `required` flag. No `notes` field. Items are intentionally lean: just text, category, optional emoji, and assignee.
- The `'everyone'` convention is used instead of exploding one item into N rows (one per participant). Filtering logic lives in the API layer (Issue #2).
- Valid participant IDs: `oskar`, `odd`, `aasmund`, `emilie`, `mathias`, `brage`, `sara`, `johanna`, or `everyone`.

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_packing_items_participant 
ON packing_items(participant_id);

CREATE INDEX IF NOT EXISTS idx_packing_items_created_at 
ON packing_items(created_at ASC);
```

## TypeScript Interfaces

Create new file: `types/packing.ts`

```typescript
export type PackingCategory =
  | 'clothing'
  | 'electronics'
  | 'personal'
  | 'documents'
  | 'special';

export interface PackingItem {
  id: number;
  text: string;
  category: PackingCategory;
  emoji_override: string | null;
  participant_id: string; // participant ID or 'everyone'
  created_at: string;
  updated_at: string;
}

// Used by the host editor and create form
export interface PackingItemInput {
  text: string;
  category: PackingCategory;
  emoji_override?: string | null;
  participant_id: string;
}

// Category-to-default-icon mapping (used in both host and participant components)
export const CATEGORY_ICONS: Record<PackingCategory, string> = {
  clothing: '👕',
  electronics: '🔌',
  personal: '🧴',
  documents: '📄',
  special: '🎯',
};

// Returns the display icon for an item — emoji_override takes priority over category icon
export function getItemIcon(item: PackingItem): string {
  return item.emoji_override ?? CATEGORY_ICONS[item.category];
}
```

## Migration SQL

**Add to `lib/schema.sql`** — run manually in Neon after this issue is merged.

```sql
-- =====================================================
-- Packing List — Items
-- =====================================================
-- DB-backed packing items. Each item belongs to a specific participant
-- or to 'everyone' (shown in all lists).
-- No required/notes fields — lean schema.
-- emoji_override, if set, replaces the default category icon in the UI.

CREATE TABLE IF NOT EXISTS packing_items (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('clothing', 'electronics', 'personal', 'documents', 'special')),
    emoji_override TEXT,
    participant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for participant-scoped queries (fetches '{participant}' + 'everyone' rows)
CREATE INDEX IF NOT EXISTS idx_packing_items_participant 
ON packing_items(participant_id);

-- Index for stable display ordering
CREATE INDEX IF NOT EXISTS idx_packing_items_created_at 
ON packing_items(created_at ASC);
```

## Seed Data

Convert the existing static `data/packing-lists.ts` into SQL INSERTs. Items present in all 8 participant lists are collapsed to `participant_id = 'everyone'`. All others keep their original participant assignment. The `required` and `notes` fields are dropped.

**Run after the CREATE TABLE statement, in the same Neon session:**

```sql
-- =====================================================
-- Packing List — Seed Data
-- =====================================================
-- Items present in all 8 lists → 'everyone'
-- All others → specific participant ID
-- Derived from data/packing-lists.ts (static data replaced by this table)

INSERT INTO packing_items (text, category, participant_id) VALUES
  -- Everyone (present in all 8 participant lists)
  ('Camera or phone',           'electronics', 'everyone'),
  ('Passport',                  'documents',   'everyone'),

  -- Emilie
  ('Warm jacket',               'clothing',    'emilie'),
  ('Comfortable walking shoes', 'clothing',    'emilie'),
  ('Swimwear',                  'clothing',    'emilie'),
  ('Portable charger',          'electronics', 'emilie'),
  ('Sunglasses',                'personal',    'emilie'),
  ('Waterproof bag',            'special',     'emilie'),

  -- Mathias
  ('Hiking boots',              'clothing',    'mathias'),
  ('Rain jacket',               'clothing',    'mathias'),
  ('Quick-dry clothes',         'clothing',    'mathias'),
  ('Portable charger',          'electronics', 'mathias'),
  ('Head torch/flashlight',     'special',     'mathias'),
  ('Waterproof bag',            'special',     'mathias'),

  -- Brage
  ('Formal shirt',              'clothing',    'brage'),
  ('Casual comfortable clothes','clothing',    'brage'),
  ('Swimwear',                  'clothing',    'brage'),
  ('Portable charger',          'electronics', 'brage'),
  ('Sunscreen',                 'personal',    'brage'),
  ('Reusable water bottle',     'special',     'brage'),

  -- Sara
  ('Layered clothing',          'clothing',    'sara'),
  ('Comfortable shoes',         'clothing',    'sara'),
  ('Swimwear',                  'clothing',    'sara'),
  ('Portable charger',          'electronics', 'sara'),
  ('Personal medications',      'personal',    'sara'),
  ('Small backpack',            'special',     'sara'),

  -- Johanna
  ('Versatile outfits',         'clothing',    'johanna'),
  ('Good walking shoes',        'clothing',    'johanna'),
  ('Swimwear',                  'clothing',    'johanna'),
  ('Portable charger',          'electronics', 'johanna'),
  ('Journal or notebook',       'personal',    'johanna'),
  ('Travel pillow',             'special',     'johanna'),

  -- Hosts
  ('Host materials',            'special',     'oskar'),
  ('Host materials',            'special',     'odd'),
  ('Host materials',            'special',     'aasmund');
```

## `data/packing-lists.ts` — Disposition

Delete `data/packing-lists.ts` as part of Issue #2. Once all three import sites (`PackingList.tsx`, `HostOverview.tsx`, `ParticipantPageClient.tsx`) are updated to use the DB-backed API, the file is unused. Deletion is part of Issue #2's Definition of Done.

## Definition of Done

- [ ] `types/packing.ts` created with `PackingItem`, `PackingItemInput`, `CATEGORY_ICONS`, and `getItemIcon`
- [ ] `lib/schema.sql` updated to include `packing_items` DDL, indexes, and seed INSERTs
- [ ] Migration SQL and seed INSERTs executed manually in Neon — table, indexes, and all seed rows confirmed present

## Technical Notes

- The `updated_at` column is not auto-updated by Postgres triggers in this schema. The API layer (Issue #2) must set `updated_at = NOW()` explicitly on every `UPDATE`.
- `emoji_override` accepts any single emoji character but is not validated at the DB level — validation is enforced in the API layer.
- `participant_id` is not a foreign key to a participants table (there is no such DB table; participants are defined in `data/participants.ts`). The valid values are enforced in the API layer.
