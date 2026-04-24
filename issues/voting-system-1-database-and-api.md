# Voting System — Issue #1: Database & API Foundation

## Context Summary

This is the first of three voting-system issues. It establishes all database tables and API routes that the host management UI (Issue #2) and participant voting UI (Issue #3) depend on. No UI is built in this issue.

The goal is to replace the hardcoded, localStorage-based voting in `components/VotingInterface.tsx` with a fully dynamic system where hosts configure vote sessions (questions), assign eligible participants and photos per session, and participants submit votes that are persisted in the database.

**Key design decisions:**
- Two voting states exist: `day-1-voting` (already in the state machine) and a new `day-2-voting` state
- Each vote session belongs to a day (1 or 2)
- For the "Closest Destination Guess" preset, the winner is **auto-calculated** from `destination_guesses.distance_km` — no participant voting UI is shown for this preset
- Points are awarded to the winner of each session (configurable per session by the host)
- A score adjustment table allows hosts to add manual bonus/penalty corrections to the leaderboard

**This is the prerequisite issue for Issues #2, #3, and the Leaderboard issue. No other voting/leaderboard issue should begin until this one is complete.**

## Scope

Database schema additions, TypeScript types, and all API routes. No components.

---

## Database Architecture

Append the following to `lib/schema.sql`.

> **Note**: These tables must be created manually in the Neon database project. Run the SQL below in the Neon SQL console.

### Table 1: `vote_sessions`

**Purpose**: Host-configured vote questions. One row per question per day.

```sql
CREATE TABLE IF NOT EXISTS vote_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_day INTEGER NOT NULL CHECK (session_day IN (1, 2)),
    title TEXT NOT NULL,
    preset_type TEXT CHECK (preset_type IN ('closest_destination')),
    points_tally INTEGER NOT NULL DEFAULT 1 CHECK (points_tally >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Notes**:
- `preset_type = 'closest_destination'`: winner is auto-calculated from `destination_guesses.distance_km`; no participant voting UI is shown
- `preset_type = NULL`: regular vote where participants cast votes manually
- `points_tally`: the number of leaderboard points awarded to the winner of this vote
- `is_active = false`: vote is hidden from participants; host can deactivate a vote without deleting it

### Table 2: `vote_session_participants`

**Purpose**: The specific participants eligible to receive votes in a given session. Hosts add these manually when configuring a vote.

```sql
CREATE TABLE IF NOT EXISTS vote_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_session_id UUID NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    photo_url TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vote_session_id, participant_id)
);
```

**Notes**:
- `participant_id`: must be a valid participant ID from `data/participants.ts`
- `photo_url`: either a Vercel Blob URL (uploaded by host) or a relative path like `/api/participant-photos/{id}` (existing participant photo). Nullable; if null, the participant voting UI falls back to `/api/participant-photos/{participant_id}`

### Table 3: `participant_votes`

**Purpose**: Individual votes cast by participants during the voting state.

```sql
CREATE TABLE IF NOT EXISTS participant_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_session_id UUID NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL,
    voted_for TEXT NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vote_session_id, voter_name)
);
```

**Notes**:
- `voter_name`: participant_id of the person casting the vote
- `voted_for`: participant_id of the person receiving the vote
- UNIQUE constraint prevents double-voting
- `voted_for` must be a participant in `vote_session_participants` for that session (enforced at API level, not DB level)

### Table 4: `score_adjustments`

**Purpose**: Manual host corrections to individual leaderboard scores. Supports positive (bonus) and negative (penalty) adjustments.

```sql
CREATE TABLE IF NOT EXISTS score_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Notes**:
- `delta` can be positive or negative integer; no bounds enforced
- `reason` is optional free-text shown in the host leaderboard management view

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_vote_sessions_day
    ON vote_sessions(session_day);

CREATE INDEX IF NOT EXISTS idx_vote_session_participants_session
    ON vote_session_participants(vote_session_id);

CREATE INDEX IF NOT EXISTS idx_participant_votes_session
    ON participant_votes(vote_session_id);

CREATE INDEX IF NOT EXISTS idx_score_adjustments_participant
    ON score_adjustments(participant_id);
```

### Existing `voting_scores` table

Do **not** drop the existing `voting_scores` table. Leave it in place for backward compatibility. The new system does not write to it, but it should remain in `schema.sql` and the database.

---

## TypeScript Types

Create new file: `types/voting.ts`

```typescript
export type VotePresetType = 'closest_destination';

export interface VoteSession {
  id: string;
  session_day: 1 | 2;
  title: string;
  preset_type: VotePresetType | null;
  points_tally: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface VoteSessionParticipant {
  id: string;
  vote_session_id: string;
  participant_id: string;
  photo_url: string | null;
  added_at: string;
}

export interface ParticipantVote {
  id: string;
  vote_session_id: string;
  voter_name: string;
  voted_for: string;
  voted_at: string;
}

export interface ScoreAdjustment {
  id: string;
  participant_id: string;
  delta: number;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface VoteSessionResults {
  vote_session_id: string;
  tally: Array<{
    participant_id: string;
    vote_count: number;
  }>;
  winner_ids: string[];  // all participants tied for most votes; each receives full points_tally
  total_voters: number;
  eligible_voter_count: number;
  is_complete: boolean;
}

export interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  zone_points: number;
  voting_points: number;
  adjustment_points: number;
  total: number;
}
```

---

## API Routes

All routes follow the existing pattern: check `process.env.DATABASE_URL` and return mock/empty data if absent.

### `GET /api/vote-sessions`

**File**: `app/api/vote-sessions/route.ts`

Query params:
- `session_day` (optional): `1` or `2` — filters by day

Returns: `{ sessions: VoteSession[] }` ordered by `created_at ASC`.

### `POST /api/vote-sessions`

**File**: `app/api/vote-sessions/route.ts`

Body:
```json
{
  "session_day": 1,
  "title": "Most Drunk Last Night",
  "preset_type": null,
  "points_tally": 5,
  "created_by": "oskar"
}
```

Validates:
- `session_day` is `1` or `2`
- `title` is a non-empty string, max 200 characters
- `preset_type` is `null` or `'closest_destination'`; `'closest_destination'` only allowed when `session_day = 1`
- `points_tally` is a non-negative integer
- `created_by` is a valid participant ID from the known host list (`oskar`, `odd`, `aasmund`)

Returns: the created `VoteSession` with status `201`.

### `GET /api/vote-sessions/[id]`

**File**: `app/api/vote-sessions/[id]/route.ts`

Returns: `{ session: VoteSession, participants: VoteSessionParticipant[] }`

Returns `404` if not found.

### `PUT /api/vote-sessions/[id]`

**File**: `app/api/vote-sessions/[id]/route.ts`

Body: any subset of `{ title, points_tally, is_active }`. `session_day` and `preset_type` are not updatable after creation.

Returns: the updated `VoteSession`.

### `DELETE /api/vote-sessions/[id]`

**File**: `app/api/vote-sessions/[id]/route.ts`

Deletes the session and all related rows (cascade). Returns `{ success: true }`.

Returns `409` if any votes have been cast for this session (prevent accidental deletion of in-progress votes).

### `GET /api/vote-sessions/[id]/participants`

**File**: `app/api/vote-sessions/[id]/participants/route.ts`

Returns: `{ participants: VoteSessionParticipant[] }`

### `POST /api/vote-sessions/[id]/participants`

**File**: `app/api/vote-sessions/[id]/participants/route.ts`

Body:
```json
{
  "participant_id": "emilie",
  "photo_url": null
}
```

Validates:
- `participant_id` is in the known participants list
- `participant_id` is not already in this session (409 if duplicate)

Returns: the created `VoteSessionParticipant` with status `201`.

### `DELETE /api/vote-sessions/[id]/participants/[participantId]`

**File**: `app/api/vote-sessions/[id]/participants/[participantId]/route.ts`

Removes the participant from the session. Returns `{ success: true }`.

Returns `409` if votes have already been cast for this session.

### `POST /api/participant-votes`

**File**: `app/api/participant-votes/route.ts`

Body:
```json
{
  "vote_session_id": "uuid",
  "voter_name": "emilie",
  "voted_for": "brage"
}
```

Validates:
- `vote_session_id` exists and `is_active = true`
- `voter_name` is a valid participant ID
- `voted_for` is in `vote_session_participants` for this session
- `voter_name` has not already voted in this session (409 if duplicate)

Returns: `{ success: true, vote: ParticipantVote }` with status `201`.

### `GET /api/participant-votes`

**File**: `app/api/participant-votes/route.ts`

Query params:
- `vote_session_id` (required)
- `voter_name` (optional): filter to a single voter's ballot

Returns: `{ votes: ParticipantVote[] }`

### `GET /api/vote-sessions/[id]/results`

**File**: `app/api/vote-sessions/[id]/results/route.ts`

**For regular sessions** (`preset_type = null`):
- Aggregates `participant_votes` GROUP BY `voted_for`
- `is_complete`: true when all participants in `vote_session_participants` have cast a vote
- `winner_ids`: all participants with the highest vote count (ties are allowed — all tied participants receive `points_tally`; if not complete and no votes cast, returns `[]`)

**For `preset_type = 'closest_destination'`**:
- Joins `vote_session_participants` with `destination_guesses WHERE is_active = true`
- `winner_ids`: all participants with the minimum `distance_km` (only among eligible participants in the session; ties are allowed)
- `tally`: sorted by `distance_km` ascending, `vote_count` field is unused (set to 0)
- `is_complete`: always `true` (auto-calculated regardless of voter participation)

Returns: `VoteSessionResults`

### `POST /api/photos/upload`

**File**: `app/api/photos/upload/route.ts`

Accepts `multipart/form-data` with a `file` field.

- Uses `@vercel/blob` (`put()`) to upload the photo and return a public URL
- File type must be an image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`)
- Max file size: 5MB (enforce in the route before calling Vercel Blob)
- Returns: `{ url: string }` — the public Vercel Blob URL

**Package required**: Install `@vercel/blob`. Add `BLOB_READ_WRITE_TOKEN` env var (already available in Vercel-hosted projects).

TODO: ask user — is `BLOB_READ_WRITE_TOKEN` already configured in the Vercel project settings, or does this need to be set up?

### `GET /api/score-adjustments`

**File**: `app/api/score-adjustments/route.ts`

Query params:
- `participant_id` (optional): filter to a single participant

Returns: `{ adjustments: ScoreAdjustment[] }` ordered by `created_at DESC`.

### `POST /api/score-adjustments`

**File**: `app/api/score-adjustments/route.ts`

Body:
```json
{
  "participant_id": "emilie",
  "delta": 3,
  "reason": "Won bonus challenge",
  "created_by": "oskar"
}
```

Validates:
- `participant_id` is a valid participant ID
- `delta` is a non-zero integer
- `created_by` is a valid host ID

Returns: the created `ScoreAdjustment` with status `201`.

### `DELETE /api/score-adjustments/[id]`

**File**: `app/api/score-adjustments/[id]/route.ts`

Returns: `{ success: true }`. Returns `404` if not found.

### `GET /api/leaderboard`

**File**: `app/api/leaderboard/route.ts`

Returns the full leaderboard with all score components per participant.

**Calculation logic**:

1. **Zone points per participant**:
   - Day 1 zone points: query `zone_claims WHERE phase = 'day1' AND points_awarded = true`, group by `team_color`
   - Map each participant to their Day 1 team using `data/teams.ts`; divide team score by 2 (teams of 2)
   - Day 2 zone points: query `zone_claims WHERE phase = 'day2' AND points_awarded = true`; if `day2_team_assignments` rows exist, use merged team mapping from `ZoneService.getDay2MergedScores()`; divide by 4 (teams of 4)
   - Total zone points = day1_individual + day2_individual (may be fractional; round to nearest integer)

2. **Voting points per participant**:
   - For each `vote_session WHERE is_active = true`:
     - Determine `winner_ids` using the same logic as `GET /api/vote-sessions/[id]/results`
     - For each participant in `winner_ids`: add `points_tally` to their voting points (all tied winners receive the full tally)

3. **Adjustment points**:
   - Sum of all `score_adjustments.delta` per participant

4. **Total** = zone_points + voting_points + adjustment_points

Returns:
```json
{
  "participants": [
    {
      "participant_id": "emilie",
      "display_name": "Emilie",
      "zone_points": 3,
      "voting_points": 10,
      "adjustment_points": 2,
      "total": 15
    }
  ],
  "max_score": 15
}
```

Ordered by `total DESC`.

If `DATABASE_URL` is not set, returns all 8 participants with all scores at 0.

---

## New Files

- `lib/schema.sql` — append 4 new tables + indexes
- `types/voting.ts` — new TypeScript interfaces
- `app/api/vote-sessions/route.ts`
- `app/api/vote-sessions/[id]/route.ts`
- `app/api/vote-sessions/[id]/participants/route.ts`
- `app/api/vote-sessions/[id]/participants/[participantId]/route.ts`
- `app/api/vote-sessions/[id]/results/route.ts`
- `app/api/participant-votes/route.ts`
- `app/api/photos/upload/route.ts`
- `app/api/score-adjustments/route.ts`
- `app/api/score-adjustments/[id]/route.ts`
- `app/api/leaderboard/route.ts`

## Modified Files

- `lib/schema.sql` — append new tables

## Prerequisites

None. This issue is self-contained.

---

## Definition of Done

- [ ] All 4 SQL tables created in Neon without error
- [ ] `types/voting.ts` created with all interfaces
- [ ] All API routes return correct shapes with no `DATABASE_URL`
- [ ] `POST /api/vote-sessions` validates `preset_type = 'closest_destination'` is only allowed for `session_day = 1`
- [ ] `GET /api/vote-sessions/[id]/results` returns auto-calculated winner for closest_destination preset
- [ ] `POST /api/participant-votes` returns 409 on duplicate vote attempt
- [ ] `POST /api/photos/upload` returns a Vercel Blob URL for valid image files
- [ ] `GET /api/leaderboard` returns correct aggregated totals for a known test scenario
- [ ] All routes return 400 for invalid input with a descriptive error message
- [ ] All routes return 500 with `{ error: string }` on unexpected DB errors

---

## Photo Migration (prerequisite step)

Real participant photos must be moved from `data/` to `data/participants/{name}/` before the leaderboard and photo picker show real faces. The `/api/participant-photos/{id}` route reads files from `data/participants/{id}/` and returns them sorted alphabetically. Naming the real photos `photo.jpg` / `photo.png` ensures they sort before `photo.svg` (j, p < s).

| Source | Destination |
|---|---|
| `data/Aasmund_1.jpg` | `data/participants/aasmund/photo.jpg` |
| `data/Brage_1.jpg` | `data/participants/brage/photo.jpg` |
| `data/Emilie_1.png` | `data/participants/emilie/photo.png` |
| `data/Johanna_1.JPEG` | `data/participants/johanna/photo.jpg` |
| `data/Mathias_1.jpg` | `data/participants/mathias/photo.jpg` |
| `data/Odd_1.jpg` | `data/participants/odd/photo.jpg` |
| `data/Oskar_1.png` | `data/participants/oskar/photo.png` |
| `data/Sara_1.JPEG` | `data/participants/sara/photo.jpg` |

This step can be done at any point before Issue #4 is implemented. The original `data/participants/{id}/photo.svg` files are kept as fallback.

## Open Questions (TODO: ask user for clarification)

- **Day 2 presets**: Day 2 only supports custom vote sessions. No presets are planned. (Resolved: confirmed.)
