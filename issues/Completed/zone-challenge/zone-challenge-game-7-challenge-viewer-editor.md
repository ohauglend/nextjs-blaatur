# Zone Challenge Game — Issue #7: Host Challenge Viewer & Editor

## Context Summary

This is the seventh issue for the Riga Zone Challenge Game. It adds a host-only interface for viewing and editing the 40 challenges (20 Day 1, 20 Day 2) that are seeded into the `challenges` table. Hosts can read and modify challenge text at any time, including before and during the game.

**Prerequisites**: Issue #6 (Host Dashboard & Full Integration) must be complete, as this feature lives inside the host zone game interface introduced there.

## Scope

1. A new page within the host zone game interface for viewing all challenges, organized by zone
2. Inline editing of challenge fields directly in the list (no separate edit page)
3. New API routes: `GET /api/challenges` and `PUT /api/challenges/[id]`
4. Changes write directly to the `challenges` table in the DB — live immediately for all future zone claims
5. Mid-game edits apply immediately: any participant whose zone is already claimed and not yet completed will see the updated challenge text if they re-open the zone panel
6. Accessible from the host zone game interface regardless of current game state

---

## Target Functionality

### Challenge List View

The challenge viewer displays all 20 zones as rows, each showing a **day1 / day2 challenge pair**. The layout is a vertical list of zone cards, one per zone.

Each zone card shows:
- **Zone name** as the card header (same name from `zones` table)
- **Day 1 row**: challenge text, type badge, scope badge, Edit button
- **Day 2 row**: challenge text, type badge, scope badge, Edit button

**Type badges:**
- `📍 Geography` for `type = 'geography'`
- `🍺 Generic` for `type = 'generic'`

**Scope badges:**
- `👥 Team` for `participant_scope = 'team'`
- `☝️ One` for `participant_scope = 'one'`

The list is always sorted by zone id (stable, consistent with how the map renders zones).

### Inline Edit Mode

Tapping **Edit** on any challenge row opens that row into edit mode **in place** (no navigation). The challenge text becomes a `<textarea>` auto-sized to content. A **Save** button and a **Cancel** button appear.

- **Save**: calls `PUT /api/challenges/[id]` with the updated fields; on success, the row returns to read mode showing the new text
- **Cancel**: discards changes, row returns to read mode with original text
- Only one row can be in edit mode at a time — opening a second row's edit mode cancels the first without saving
- The Save button is disabled while the request is in-flight (shows spinner)
- On save error: inline error message below the textarea; row remains in edit mode

### Edit Fields

Only `text` is editable per challenge row:
- `text` — free text, required, max 300 characters

`type` and `participant_scope` are read-only and displayed as badges only. They are not changed after seeding.

---

## API Design

### `GET /api/challenges`

Returns all 40 challenges joined with their zone name, ordered by `zone_id` then `phase` (day1 before day2).

**Response:**
```json
[
  {
    "id": 1,
    "zone_id": 1,
    "zone_name": "Freedom Monument",
    "phase": "day1",
    "text": "Find the inscription at the base and recite it as a group.",
    "type": "geography",
    "participant_scope": "team"
  },
  {
    "id": 2,
    "zone_id": 1,
    "zone_name": "Freedom Monument",
    "phase": "day2",
    "text": "Last one to finish their drink does a lap around the monument.",
    "type": "generic",
    "participant_scope": "one"
  },
  ...
]
```

**Access**: Host-only. Validate using existing `hostAccess` utility (same pattern as other host-only routes).

### `PUT /api/challenges/[id]`

Updates a single challenge row.

**Request body:**
```json
{
  "text": "Updated challenge text here."
}
```

**Validation:**
- `text`: required, string, 1–300 characters

**Response on success (200):**
```json
{
  "id": 1,
  "zone_id": 1,
  "zone_name": "Freedom Monument",
  "phase": "day1",
  "text": "Updated challenge text here.",
  "type": "geography",
  "participant_scope": "team"
}
```

**Response on not found (404):**
```json
{ "error": "Challenge not found" }
```

**Response on validation error (400):**
```json
{ "error": "text is required and must be 1–300 characters" }
```

**Access**: Host-only. Validate using existing `hostAccess` utility.

---

## Routing & Navigation

This feature lives at a new route:

```
app/[token]/host/zones/challenges/page.tsx
```

The host zone interface (`/[token]/host/zones`) introduced in Issue #6 gains a navigation link labeled **"Challenges"** that routes here. The page is accessible directly by URL regardless of game state.

---

## Component Architecture

### New Component: `ChallengeEditor`

**Location**: `components/ChallengeEditor.tsx`

```typescript
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
```

**Internal state:**
- `challenges: ChallengeWithZoneName[]` — fetched via SWR from `GET /api/challenges` on mount; no polling interval (challenges are static unless edited)
- `editingId: number | null` — which challenge row is currently in edit mode
- `draftText: string` — current unsaved text edit state
- `saving: boolean`, `saveError: string | null` — per-save UI state

**Render structure:**
```
<div>                                    ← outer container
  <h2>Challenges</h2>
  {groupByZone(challenges).map(zone => (
    <ZoneCard key={zone.zone_id}>
      <h3>{zone.zone_name}</h3>
      <ChallengeRow challenge={zone.day1} ... />   ← Day 1
      <ChallengeRow challenge={zone.day2} ... />   ← Day 2
    </ZoneCard>
  ))}
</div>
```

`ChallengeRow` handles the read/edit toggle for a single challenge and is a local sub-component (not exported).

### New Page: `app/[token]/host/zones/challenges/page.tsx`

Server component. Validates host token via `hostAccess`. Renders `ChallengeEditor` as a client component with the token prop.

---

## Data Grouping Utility

A small pure function (local to the component file, not shared) groups the flat API response into zone pairs:

```typescript
function groupByZone(challenges: ChallengeWithZoneName[]): Array<{
  zone_id: number;
  zone_name: string;
  day1: ChallengeWithZoneName;
  day2: ChallengeWithZoneName;
}> {
  // Groups by zone_id, assumes exactly one day1 + one day2 per zone
}
```

---

## Mobile UX Details

- Each zone card is a distinct visual card with a subtle border
- Challenge text uses font size 15–16px minimum for mobile readability
- The textarea in edit mode grows to show the full text without scrolling (auto-resize)
- Save/Cancel buttons are full-width on mobile
- The page scrolls vertically through all 20 zone cards
- No sticky headers required — the list is short enough to scroll

---

## New Files

| File | Purpose |
|---|---|
| `app/api/challenges/route.ts` | `GET /api/challenges` — list all challenges with zone names |
| `app/api/challenges/[id]/route.ts` | `PUT /api/challenges/[id]` — update a single challenge |
| `app/[token]/host/zones/challenges/page.tsx` | Host challenge viewer/editor page |
| `components/ChallengeEditor.tsx` | Client component for the challenge list + inline edit UI |

## Modified Files

| File | Change |
|---|---|
| `lib/zoneService.ts` | Add `getAllChallengesWithZoneNames()` and `updateChallenge(id, text)` static methods |
| `components/HostNavigation.tsx` (or zone sub-nav) | Add link to `/[token]/host/zones/challenges` |

---

## `ZoneService` Additions

```typescript
static async getAllChallengesWithZoneNames(): Promise<ChallengeWithZoneName[]>
// SELECT c.*, z.name AS zone_name
// FROM challenges c JOIN zones z ON c.zone_id = z.id
// ORDER BY c.zone_id, c.phase DESC  -- day1 before day2 (d > 1 alphabetically)

static async updateChallenge(
  id: number,
  fields: { text: string; type: ChallengeType; participant_scope: 'team' | 'one' }
): Promise<ChallengeWithZoneName | null>
// UPDATE challenges SET text=..., type=..., participant_scope=...
// WHERE id=...
// Returns updated row joined with zone name, or null if not found
```

---

## Confirmed Decisions

1. **Edit fields**: `text` only. `type` and `participant_scope` are read-only badges; not editable after seeding.
2. **Mid-game visibility**: Edits apply immediately to the DB. If a team already has the zone panel open, they see stale text until they close and reopen it. This is acceptable — no in-app indicator needed.
3. **Route location**: `host/zones/challenges` — the `host/zones/` path is the parent for all host zone features.
4. **Cache**: API routes return `Cache-Control: no-store`; no CDN or edge cache in front of these endpoints.

---

## Definition of Done

- [ ] `GET /api/challenges` returns all 40 challenges with zone names, host-only access enforced
- [ ] `PUT /api/challenges/[id]` updates `text` in DB; validation enforced (1–300 chars)
- [ ] Challenge list page renders all 20 zone cards with day1 + day2 rows each
- [ ] Type and scope badges visible in read mode
- [ ] Tapping Edit on any row opens inline textarea with current values pre-filled
- [ ] Opening a second row's edit mode cancels the first without saving
- [ ] Save writes to DB; row returns to read mode with updated text on success
- [ ] Save button shows spinner and is disabled during in-flight request
- [ ] Cancel discards changes and returns row to read mode
- [ ] On save error: inline error message shown, row stays in edit mode
- [ ] Updated challenge text visible to participants on next zone panel open (no cache)
- [ ] Page accessible from host zone game interface navigation regardless of game state
- [ ] Host token validated on both API routes; non-host requests return 403
- [ ] No TypeScript errors; `next build` passes
