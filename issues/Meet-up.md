# Meet-up Spot — Issue: Per-Participant Meetup State

## Context Summary

This issue adds a new `meetup` trip state that sits between `pre-trip-packing` and `flight`. When the host switches to this state, each participant's page shows a read-only card revealing their personal meetup address and time. Hosts enter and manage this data via a new dedicated page at `/host/meetup`.

This keeps the meetup details secret until the host is ready: individual spots can be different per participant, and the data is invisible to participants until the state is active.

**There are no prerequisites** — this issue is self-contained.

---

## Scope

### 1. Database

#### New table: `meetup_spots`

One row per participant. Hosts upsert this row via the API.

```sql
CREATE TABLE IF NOT EXISTS meetup_spots (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    meetup_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetup_spots_participant
ON meetup_spots(participant_id);
```

`address` and `meetup_time` are nullable — the host may save a partial row before filling in both fields.

---

### 2. New State: `meetup`

#### `data/states.ts`

Add `'meetup'` to the `TripState` union, inserted **between** `'pre-trip-packing'` and `'flight'`:

```ts
export type TripState =
  | 'pre-trip'
  | 'pre-trip-packing'
  | 'meetup'          // ← new
  | 'flight'
  | 'day-1'
  | 'day-2'
  | 'flight-home'
  | 'after-trip';
```

Add entry to `TRIP_STATES`:

```ts
'meetup': {
  id: 'meetup',
  name: 'Meet-up Reveal',
  description: 'Personal meetup spots and times are revealed',
  emoji: '📍',
  participantView: 'Find out where and when to meet!'
},
```

The `StateControl` component iterates `Object.values(TRIP_STATES)`, so the new state appears automatically in the host state grid once added here.

---

### 3. API Routes

#### `GET /api/meetup-spots`

- No query param → returns all rows (host use only)
- `?participant={id}` → returns single participant row, 404 if not found
- If `DATABASE_URL` is not set, returns `[]` (matches packing-items pattern)

Response shape (single row):
```json
{
  "participant_id": "emilie",
  "address": "Kalku iela 1, Riga",
  "meetup_time": "2026-04-23T14:00:00+02:00",
  "updated_at": "2026-04-18T10:00:00+00:00"
}
```

**File**: `app/api/meetup-spots/route.ts`  
Pattern mirrors `app/api/packing-items/route.ts` — same DB helper, same error handling shape.

---

#### `PUT /api/meetup-spots/[participant]/route.ts`

Upserts via `INSERT ... ON CONFLICT (participant_id) DO UPDATE`.

**Request body**:
```json
{
  "address": "Kalku iela 1, Riga",
  "meetup_time": "2026-04-23T14:00:00+02:00"
}
```

**Validation**:
- `participant` path segment must be one of the 8 known participant IDs (not `'everyone'`)
- `address`: string ≤ 300 chars or null
- `meetup_time`: valid ISO 8601 datetime string or null

Returns the upserted row on success.

**File**: `app/api/meetup-spots/[participant]/route.ts`

---

### 4. New Files (UI)

#### `components/MeetupSpot.tsx`

Participant-facing read-only card.

- Props: `participantId: string`
- Fetches via SWR: `GET /api/meetup-spots?participant={participantId}`
- Loading state: skeleton / spinner (same as `PackingList`)
- When `address` or `meetup_time` are null / not yet set: show placeholder message  
  _"Your meetup location will be revealed soon 🗺️"_
- When data is set, show:
  - Address in a prominent text block
  - Formatted datetime using `toLocaleString('nb-NO', { ... })` — weekday, date, time (no seconds)
- Card style: white rounded shadow, consistent with `DestinationGuess` card (blue accent / icon)
- No editing controls — this is display only

#### `components/HostMeetupPage.tsx`

Client component. Host-only inline editor.

- Fetches all meetup spots via SWR: `GET /api/meetup-spots`
- Renders one row per participant in participant order from `data/participants.ts` (all 8 guests + hosts where applicable)
- **Read mode** per row: participant name badge, address text (or _"—"_ if unset), formatted meetup_time (or _"—"_), **Edit** button
- Clicking **Edit** replaces the row with an inline form:
  - Text input for `address` (label: "Address")
  - `datetime-local` input for `meetup_time` (label: "Meet-up Time")
  - **Save** button → calls `PUT /api/meetup-spots/[participant]`, updates SWR cache on success, returns to read mode
  - **Cancel** button → restores read mode without saving
  - Inline error message on save failure (next to Save button)
- No delete button — hosts only update
- Pattern mirrors `PackingItemEditor.tsx` inline editing style

#### `app/[token]/host/meetup/page.tsx`

New host route. Mirrors `app/[token]/host/packing/page.tsx` exactly:

```ts
import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostMeetupPage from '@/components/HostMeetupPage';

export default function HostMeetupRoute({ params }: { params: { token: string } }) {
  const { isValid } = validateHostToken(params.token);
  if (!isValid) notFound();
  return <HostMeetupPage token={params.token} />;
}
```

---

### 5. Modified Files

#### `app/[token]/[participant]/ParticipantPageClient.tsx`

Import `MeetupSpot`. Add a `meetup` state block between the `pre-trip-packing` and `flight` blocks:

```tsx
{currentState === 'meetup' && (
  <>
    <CountdownTimer />
    <MeetupSpot participantId={participantId} />
    <DestinationGuess participantId={participantId} />
  </>
)}
```

#### `components/HostNavigation.tsx`

- Add `'meetup'` to the `currentPage` union type
- Add a nav link after the Packing link:

```tsx
<Link
  href={`/${token}/host/meetup`}
  className={`px-6 py-2 rounded-lg font-medium transition-all ${
    currentPage === 'meetup'
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  <span className="mr-2">📍</span>
  Meet-up
</Link>
```

---

## Verification Checklist

1. Run the `CREATE TABLE` SQL in the Vercel Postgres dashboard
2. Switch to `meetup` state on `/host/controls` — confirm it appears in the state grid
3. Participant page in `meetup` state shows: CountdownTimer → MeetupSpot placeholder → DestinationGuess
4. Navigate to `/host/meetup` — confirm all 8 participants are listed with "—" values
5. Edit one participant: enter an address and a meetup time, click Save
6. Verify the DB row was upserted: `SELECT * FROM meetup_spots;`
7. Participant page for that participant now shows the address and formatted time
8. Edit again and change the address — confirm `updated_at` is refreshed in the DB
9. "Cancel" restores the previous value without a DB call

---

## Out of Scope

- Participants cannot submit or guess meetup spots — host-set data only
- No push notification when meetup is saved
- No meetup map pin / embedded map
- No "bulk set all participants to the same spot" shortcut (each row is edited individually)
