# Leaderboard — Issue #4: Score Engine, Host Management & Animated UI

## Context Summary

This issue builds the leaderboard system: a cumulative per-participant score derived from zone game points and voting results, a host management page to view scores and add manual adjustments, and an animated horizontal bar-chart-race UI shown to participants after voting completes.

**Prerequisites**:
- Issue #1 (Database & API Foundation): `GET /api/leaderboard`, `score_adjustments` table and API are required
- Issue #3 (Participant Voting UI rewrite): `FloatingHeadsVote.tsx` is the entry point for the participant-facing leaderboard reveal

**Note on photos**: Real participant photos are available at `data/Name_1.{ext}` and must be moved to `data/participants/{name}/` as part of the photo migration in Issue #1 before this issue begins. After migration each participant will have a `photo.jpg`/`photo.png` that sorts before `photo.svg` alphabetically, so the real photo is returned first by the `/api/participant-photos/{id}` route.

---

## Scope

New `Leaderboard` animated component, host leaderboard management page, host nav/dashboard additions. The `GET /api/leaderboard` route is specified in Issue #1 and must exist before this issue begins.

---

## 1. Animated `Leaderboard` Component

**File**: `components/Leaderboard.tsx`

### Layout

8 participant rows stacked vertically. Each row is a horizontal track:

```
┌──────────────────────────────────────────────────────────────────┐
│  [●] Emilie                                     ············ 15  │  ← row
│  [○]                                                             │
│  [●] Brage     ●────────── 8                                     │
│  [○]                                                             │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

- Each row has a fixed-height track (e.g. 56px or 64px)
- A circular avatar (40px diameter) slides left-to-right along the track
- A thin horizontal line (1px, low-opacity) spans the full track width as a guide rail
- The name label is fixed at the left edge (outside the track, ~80px wide)
- The score number appears to the right of the avatar, fading in once the head stops

### Track Width & Scale

Track width = full container width. The rightmost position corresponds to `maxScore × 1.2` (20% padding beyond the highest score).

Formula: `x = (score / (maxScore * 1.2)) * trackWidth`

All heads start at `x = 0` (left edge).

### Animation Sequence

1. **Stage 1 — ordered reveal** (all heads start left):
   - Sort participants by total score ascending (lowest first)
   - Stagger: each participant's animation starts 350ms after the previous one begins
   - Each head slides smoothly from `x=0` to its final position over 800ms (ease-out)
   - Score number fades in (opacity 0→1 over 300ms) once the head reaches its destination

2. **Stage 2 — row re-sort** (500ms after all heads reach their destinations):
   - Rows reorder to descending score order (highest at top)
   - Use framer-motion `AnimatePresence` + `layout` prop on each row to animate reordering
   - Transition duration 600ms
   - Tied participants are ordered alphabetically (e.g. Brage before Emilie on equal scores)

**Animation implementation**: Install and use `framer-motion`. Use `motion.div` with `animate` for horizontal movement and opacity transitions. Use `AnimatePresence` with the `layout` prop for row reordering. Use `useEffect` with `setTimeout` for the stagger sequencing (350ms between each participant's start).

### Photo Source

For each participant, call `/api/participant-photos/{id}` to get the list of filenames in their folder. Use the first item returned (consistent "Name_1" pick — assumes user will add real photos as the first file). Fall back to `/data/participants/{id}/photo.svg` if the fetch fails or returns empty.

### Props

```typescript
interface LeaderboardProps {
  entries: LeaderboardEntry[];  // from types/voting.ts (Issue #1)
  maxScore: number;
}
```

Data is passed in from the parent (`FloatingHeadsVote`) — the component does not fetch its own data.

### Visual Style

- Dark background (matches existing `FloatingHeadsVote` dark theme if applicable)
- Track line: `rgba(255,255,255,0.15)` on dark background
- Avatar border: neutral white (`2px solid white` or `2px solid rgba(255,255,255,0.8)`)
- Score text: white, bold, small (14px)
- Ranking number (1st, 2nd, ...) appears at the right edge label or overlaid on the avatar once sorted in Stage 2

---

## 2. Integration into `FloatingHeadsVote.tsx`

In the `leaderboard` state of `FloatingHeadsVote`, replace the current simple leaderboard reveal with the new animated component.

Inside `FloatingHeadsVote.tsx` (which is rewritten in Issue #3), when `state === 'leaderboard'`:

```tsx
// Fetch leaderboard data
const { data } = useSWR('/api/leaderboard', fetcher);

if (!data) return <LoadingState />;

return (
  <Leaderboard
    entries={data.participants}
    maxScore={data.max_score}
  />
);
```

The leaderboard is only shown after voting completes — it is not accessible during other states from the participant view.

---

## 3. Host Leaderboard Management Page

**New file**: `app/[token]/host/leaderboard/page.tsx`

Follows the same token-validation pattern as other host routes:

```tsx
import { validateHostToken } from '@/utils/hostAccess';
import { notFound } from 'next/navigation';
import HostLeaderboard from '@/components/HostLeaderboard';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const isValidHost = await validateHostToken(token);
  if (!isValidHost) return notFound();
  return <HostLeaderboard token={token} />;
}
```

### `components/HostLeaderboard.tsx`

Client component. Displays the leaderboard table and allows hosts to add score adjustments.

#### Layout

```
HostNavigation (currentPage="leaderboard")

┌─────────────────────────────────────────────────────────────────┐
│ Participant | Zone pts | Voting pts | Adjustments | Total       │
├─────────────────────────────────────────────────────────────────┤
│ Emilie      |     3    |    10      |   [+2]  ✏️  |   15        │
│ Brage       |     2    |     5      |    [0]  ✏️  |    7        │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

Rows ordered by `total` descending.

#### Adjustment Inline Edit (per participant)

Each row has an "edit adjustment" icon/button. Clicking it opens an inline form:

```
Delta: [___] (positive or negative integer)
Reason (optional): [________________________]
[ Save ]  [ Cancel ]
```

Submitting calls `POST /api/score-adjustments`. The `participant_id` is set from the row. `created_by` is derived from the `token` (resolve to a participant ID using the host lookup in `utils/hostAccess.ts`).

After saving, the row refreshes via SWR `mutate`.

**Multiple adjustments**: A participant can have multiple adjustments, all of which are summed. The "Adjustments" cell shows the net total. A small "history" button expands a sub-row listing each individual adjustment with its reason and a delete button.

#### Data Fetching

- `useSWR('/api/leaderboard', ..., { refreshInterval: 10000 })` — auto-refreshes every 10 seconds
- `useSWR('/api/score-adjustments')` — for the per-participant adjustment history

---

## 4. Dashboard Widget & Navigation

### `components/HostDashboard.tsx`

Add a leaderboard widget card:

```
┌─────────────────────────────┐
│ 🏆 Leaderboard              │
│ 1. Emilie — 15 pts          │
│ 2. Brage  —  7 pts          │
│ 3. Sara   —  6 pts          │
│ → View full leaderboard     │
└─────────────────────────────┘
```

Fetches `GET /api/leaderboard` and shows the top 3. Falls back to "No scores yet" if no DB or all scores are 0.

### `components/HostNavigation.tsx`

Add `🏆 Leaderboard` link pointing to `/[token]/host/leaderboard/` with `currentPage="leaderboard"` support.

Insert the link after the Votes link (both Votes and Leaderboard are placed after the existing Meetup navigation link).

---

## New Files

- `components/Leaderboard.tsx` — animated participant leaderboard
- `components/HostLeaderboard.tsx` — host score management
- `app/[token]/host/leaderboard/page.tsx` — host leaderboard route

## Modified Files

- `components/FloatingHeadsVote.tsx` — replace leaderboard reveal with `<Leaderboard />` (coordinates with Issue #3)
- `components/HostDashboard.tsx` — add leaderboard widget
- `components/HostNavigation.tsx` — add Leaderboard nav link

## Prerequisites

- Issue #1: `GET /api/leaderboard`, `score_adjustments` table and API routes
- Issue #3: `FloatingHeadsVote.tsx` rewrite (integration point for the leaderboard reveal)

---

## Definition of Done

- [ ] `Leaderboard` component renders with 8 participant rows
- [ ] All heads start at `x=0` and animate to the correct position based on score
- [ ] Animation order: lowest score starts first, highest score starts last
- [ ] 350ms stagger between each participant's animation start
- [ ] Score number fades in once the head stops
- [ ] 500ms after all heads stop, rows re-sort to descending order with visible transition
- [ ] `maxScore * 1.2` scale applied (highest scorer does not reach the right edge)
- [ ] Photos load from `/api/participant-photos/{id}` with SVG fallback
- [ ] Host leaderboard page loads and shows correct zone, voting, and adjustment columns
- [ ] Host can add a positive and negative adjustment; net total updates immediately
- [ ] Adjustment history sub-row shows individual entries with delete button
- [ ] Dashboard widget shows top-3 preview
- [ ] HostNavigation Leaderboard link highlights correctly
- [ ] No console errors during animation sequence

---

## Open Questions

All questions resolved. No open items.

**Dependencies before starting this issue:**
1. Complete photo migration (Issue #1): move `data/Name_1.{ext}` files to `data/participants/{name}/photo.{ext}`
2. Install `framer-motion` package
3. Issue #1 API routes functional
4. Issue #3 `FloatingHeadsVote` rewrite complete
