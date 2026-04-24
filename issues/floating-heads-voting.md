# Floating Heads Voting (Day 1 Morning)

## Context

At the start of Day 1 (after the flight, before zone challenges) we have a dedicated voting moment with two questions:

1. **Who was the most drunk last night?** — `5 pts` per vote received
2. **Who was closest on the destination guess?** — `10 pts` per vote received

Each question shows all 8 participants as floating heads. The voter taps **one** head and submits. Once **all 8 participants have voted on both questions**, the voting cards disappear and an animated leaderboard reveals — heads slide in top-to-bottom with medal markers (🥇🥈🥉) and per-participant point totals.

Heads use a **random image** from `data/participants/{id}/` so any image dropped into a participant's folder (e.g. `Odd_1.jpg`, `Emilie_1.png`) is picked up automatically.

This is its own trip state (`day-1-voting`) inserted between `flight` and `day-1`. The existing `VotingInterface` for Day 1/2 is untouched.

## Decisions

- **New trip state** `day-1-voting` between `flight` and `day-1`
- **Two hardcoded questions** (no host configuration)
- **Single-pick voting** per question; voter can change their pick at any time
- **Auto-reveal** when all 8 voters have submitted both questions
- **Database persistence** via `voting_scores`
- **Local default state** = `day-1-voting` (when `DATABASE_URL` is unset)

## Database

Append to `lib/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS voting_scores (
    id SERIAL PRIMARY KEY,
    voter_id VARCHAR(50) NOT NULL,
    question_key VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (voter_id, question_key, target_id)
);

CREATE INDEX IF NOT EXISTS idx_voting_scores_question
  ON voting_scores(question_key);
```

A voter writes **one row per target** for their question: `score=100` for the picked target, `0` for everyone else. Distinct voter count = `MAX(voter_count)` across targets.

Tables must be created manually in Neon (consistent with packing-list pattern).

## Files

### New

- `data/votingQuestions.ts` — hardcoded `[{ key, title, emoji, leftLabel, rightLabel }]`
- `components/FloatingHeadsVote.tsx` — voting cards + auto-revealing animated leaderboard
- `app/api/voting-scores/route.ts` — `GET ?voter_id=&question_key=` returns voter's scores; `PUT` upserts a batch
- `app/api/voting-scores/results/route.ts` — `GET ?question_key=` returns aggregated results
- `app/api/participant-photos/[id]/route.ts` — lists image files in `data/participants/{id}/`
- `app/api/participant-photos/[id]/[filename]/route.ts` — serves the bytes (path-traversal guard, extension allowlist)

### Modified

- `data/states.ts` — added `'day-1-voting'` to `TripState` union and `TRIP_STATES`
- `app/[token]/[participant]/ParticipantPageClient.tsx` — renders `<FloatingHeadsVote>` for `day-1-voting`
- `app/api/state/route.ts` — local (no `DATABASE_URL`) default returns `'day-1-voting'`
- `lib/schema.sql` — appended `voting_scores` table

## Component behaviour (`FloatingHeadsVote`)

- Two question cards rendered top-to-bottom
- Progress indicator at the top: `🍻 3/8 · 🗺️ 5/8`
- Each card: 4-column grid of heads + name; tap to select, submit button persists via `PUT /api/voting-scores`
- Server hydration: previously-picked target (score≥50) is highlighted on mount
- When **every question reaches 8 voters**, the cards are replaced by `<Leaderboard>`
- Leaderboard: heads animate in (350ms stagger) with progress bars, medals for top 3, and per-question vote/point breakdown

## Random photo picker (`ParticipantHead`)

- Calls `/api/participant-photos/{id}` to list files in `data/participants/{id}/`
- Allowed extensions: `.png .jpg .jpeg .svg .webp .gif`
- Picks one at random per render via `useMemo([data, id])`
- Falls back to `/data/participants/{id}/photo.svg` while the listing loads or if no images exist

## API shapes

```ts
// PUT /api/voting-scores
// body: { voter_id: string, question_key: string, scores: { target_id: string; score: number }[] }
// response: { success: true, count: number }

// GET /api/voting-scores?voter_id=sara&question_key=most_drunk
// response: { scores: { target_id: string; score: number }[] }

// GET /api/voting-scores/results?question_key=most_drunk
// response: { results: { target_id: string; avg_score: number; voter_count: number }[] }

// GET /api/participant-photos/sara
// response: { photos: string[] }   // filenames only

// GET /api/participant-photos/sara/Sara_1.png
// response: <image bytes>
```

## Definition of Done

- [x] `voting_scores` table SQL appended to `lib/schema.sql`
- [x] `data/states.ts` includes `day-1-voting` between `flight` and `day-1`
- [x] `FloatingHeadsVote` renders two single-pick voting cards with random-photo heads
- [x] Voter can submit and change their pick
- [x] Leaderboard auto-reveals once all 8 voters complete both questions, with animated heads, medals, and per-question point breakdown
- [x] All four API routes implemented with input validation
- [x] `ParticipantPageClient` renders the component for the new state
- [x] Local default state set to `day-1-voting`
- [x] No TypeScript / lint errors
