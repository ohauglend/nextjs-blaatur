# Voting System — Issue #2: Host Voting Management Interface

## Context Summary

This is the second of three voting-system issues. It builds the host-facing management UI for creating and editing vote sessions. Hosts configure voting questions before participants enter the voting state.

**Prerequisite**: Issue #1 (Database & API Foundation) must be complete and all API routes functional.

**Key capabilities for hosts:**
- Create vote sessions for Day 1 and Day 2 with a title, optional preset, and points tally
- For Day 1: a "Closest Destination Guess" preset is available — selecting it locks in auto-calculation logic (no voting UI will be shown to participants)
- Add specific participants to each vote session with a custom photo per participant
- Photo picker: shows existing photos from `data/participants/{id}/` folder; + Upload button for new photos
- Toggle sessions active/inactive
- Edit title and points after creation
- Delete sessions (blocked if votes have been cast)

---

## Scope

New host route, new component, and additions to the existing host dashboard and navigation.

---

## New Route

### `app/[token]/host/voting/page.tsx`

Follows the same pattern as `app/[token]/host/packing/page.tsx`:

```tsx
import { validateHostToken } from '@/utils/hostAccess';
import { notFound } from 'next/navigation';
import HostVotingPage from '@/components/HostVotingPage';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const isValidHost = await validateHostToken(token);
  if (!isValidHost) return notFound();
  return <HostVotingPage token={token} />;
}
```

---

## New Component: `components/HostVotingPage.tsx`

Client component (`'use client'`). Receives `token: string` prop.

### Layout

```
HostNavigation (currentPage="voting")

Tabs: [Day 1 Votes] [Day 2 Votes]
  ┌─────────────────────────────────┐
  │  Active sessions list           │
  │  ─────────────────────────────  │
  │  + Add new vote session          │
  └─────────────────────────────────┘
```

### Session List Item

Each session is displayed as a card showing:
- Title (bold)
- Points tally badge (e.g. "5 pts")
- Preset tag (if applicable, e.g. "Auto: Closest Destination")
- Active toggle (switch/checkbox)
- Edit button → expands inline edit form (same card, replaces read-only view)
- Delete button → confirmation prompt inline; disabled with tooltip if votes exist
- Participant count (e.g. "4 participants")
- Expand/collapse: clicking the card body shows the participant panel below it

### Participant Panel (expanded per session)

Shows a grid of currently added participants (photo + name badge). Each has a remove button.

Below the grid:
- "Add participant" dropdown: multi-select from all 8 participants not yet in this session
- When a participant is added: immediately show their row with a photo picker

**Photo picker per participant:**
- Thumbnail strip showing images returned by `GET /api/participant-photos/{id}` (existing photos in `data/participants/{id}/`)
- After the photo migration in Issue #1, each participant will have a real `photo.jpg`/`photo.png` as their first photo alongside the existing `photo.svg` fallback
- "Upload new photo" button → triggers a file input → calls `POST /api/photos/upload` → saves the returned URL via `POST /api/vote-sessions/[id]/participants` (or `PUT` if already added)
- If no photo is selected: null stored in DB; voting UI will fall back to `/api/participant-photos/{id}`
- Selected photo has a highlighted border

### Create/Edit Form

```
┌────────────────────────────────────────────────────┐
│  Use preset: [Custom ▼]                            │  ← Day 1 only
│  (preset options: "Custom", "Closest Destination") │
│                                                    │
│  Question title: [__________________________]      │
│  (auto-filled and read-only when preset selected)  │
│                                                    │
│  Points awarded to winner: [__5__]                 │
│  (hidden and set to 0 when preset = auto-calc)     │
│                                                    │  ← see TODO below
│  [ Save ]  [ Cancel ]                              │
└────────────────────────────────────────────────────┘
```

**Preset "Closest Destination Guess" behavior:**
- Selecting this preset auto-fills `title = "Closest on the destination guess 🗺️"` (read-only)
- `points_tally` defaults to `10` and remains editable
- No voting UI will be shown to participants; the winner is calculated automatically

**Day 2 form**: preset dropdown is not shown (Day 2 is always custom-only)

TODO: ask user — for the "Closest Destination Guess" preset, should `points_tally` default to `10` (matching the old hardcoded `votingQuestions.ts` value)?

### Data Fetching

Use SWR for all data:
- `useSWR('/api/vote-sessions?session_day=1')` and `useSWR('/api/vote-sessions?session_day=2')`
- `useSWR('/api/vote-sessions/[id]')` (per session, loaded on expand)
- `mutate` after every create/update/delete to refresh the list

### Error Handling

- "Can't delete — votes have been cast for this session" (409 from API)
- "Failed to upload photo" (5xx from upload API)
- Generic "Failed to save" toast/inline message for other errors

---

## Modified Files

### `components/HostDashboard.tsx`

Add a new widget card for the voting management page. Pattern mirrors other existing cards.

```
┌─────────────────────────┐
│ 🗳 Voting               │
│ {N} active sessions     │
│ Day 1: {x} | Day 2: {y} │
│ → Manage votes          │
└─────────────────────────┘
```

Fetches `GET /api/vote-sessions` (no filter) on mount to get the count of active sessions. Falls back to "–" if no DB.

### `components/HostNavigation.tsx`

Add a new navigation link: `🗳 Votes` pointing to `/[token]/host/voting/` with `currentPage="voting"` active state support.

Insert the link after the existing Meetup navigation link.

---

## New Files

- `app/[token]/host/voting/page.tsx`
- `components/HostVotingPage.tsx`

## Modified Files

- `components/HostDashboard.tsx` — add voting widget card
- `components/HostNavigation.tsx` — add Votes nav link

## Prerequisites

- Issue #1 must be complete (all API routes functional)
- `@vercel/blob` package installed and `BLOB_READ_WRITE_TOKEN` configured

---

## Definition of Done

- [ ] Host can navigate to `/[hostToken]/host/voting/`
- [ ] Host can create a Day 1 vote session with a custom title and points tally
- [ ] Host can create a Day 1 vote session using the "Closest Destination Guess" preset
- [ ] Title field is auto-filled and read-only when a preset is selected
- [ ] Preset dropdown is not shown on the Day 2 tab
- [ ] Host can add participants to a vote session from the participant panel
- [ ] Photo picker shows thumbnails from `/api/participant-photos/{id}`
- [ ] Host can upload a new photo; it appears in the picker and is stored as a Vercel Blob URL
- [ ] Host can toggle a session active/inactive
- [ ] Host can delete a session with no votes; deletion blocked with message if votes exist
- [ ] Dashboard widget shows correct active session counts
- [ ] `HostNavigation` Votes link correctly highlights when on the voting page

---

## Open Questions

All questions resolved. No open items.
