# Voting System — Issue #3: Participant Voting UI & Day-2-Voting State

## Context Summary

This is the third of three voting-system issues. It rewrites `components/FloatingHeadsVote.tsx` to be fully dynamic (DB-driven instead of hardcoded), adds a new `day-2-voting` trip state, removes the legacy localStorage-based `VotingInterface.tsx`, and connects everything to the APIs from Issue #1.

**Prerequisite**: Issue #1 must be complete (all API routes functional).

**Key behavioral changes from the current implementation:**
- Questions are no longer hardcoded — they come from `vote_sessions` in the database
- Participant lists per vote are no longer all-8 — only the participants the host added to that session
- Photos are per-session (from `vote_session_participants.photo_url`), falling back to `/api/participant-photos/{id}`
- Preset sessions (`closest_destination`) never show a voting UI to participants — they are silently included in the leaderboard calculation only
- The gating logic waits for all `vote_session_participants` to have voted (not hardcoded 8)
- After voting, participants see "You voted for {name}" confirmation until the leaderboard reveals
- No interim vote tallies are visible to participants

---

## Scope

State machine update, `FloatingHeadsVote.tsx` rewrite, participant page update, host controls update, and removal of `VotingInterface.tsx`.

---

## 1. State Machine Update

### `data/states.ts`

Add `'day-2-voting'` to the `TripState` union type and the `TRIP_STATES` record:

```typescript
// Add to TripState union:
| 'day-2-voting'

// Add to TRIP_STATES object:
'day-2-voting': {
  id: 'day-2-voting',
  label: 'Day 2 Voting',
  description: 'Morning voting before Day 2 activities begin'
}
```

Insert `'day-2-voting'` between `'day-1'` and `'day-2'` in the ordered state list (the array used by state transition controls).

---

## 2. Rewrite `components/FloatingHeadsVote.tsx`

Full rewrite. The component receives a `sessionDay: 1 | 2` prop to know which day's sessions to load.

### Props

```typescript
interface FloatingHeadsVoteProps {
  participantId: string;
  sessionDay: 1 | 2;
}
```

### Data Loading

On mount, fetch active non-preset vote sessions for the current day:

```
GET /api/vote-sessions?session_day={sessionDay}
```

Filter client-side to `is_active = true` and `preset_type = null` (preset sessions are excluded from the voting UI entirely).

For each session, also fetch:
```
GET /api/vote-sessions/{id}/results
```
(to determine if the participant has already voted and to check overall completion)

### State Machine (internal)

```
loading → (no active sessions) → no_votes_configured
        → (sessions available) → voting
                                    → (all sessions completed by me) → waiting
                                    → (all voters complete across all sessions) → leaderboard
```

**`no_votes_configured`**: Show a simple message: "No votes have been set up yet. The host will configure this soon." Poll `GET /api/vote-sessions` every 15 seconds to check if sessions appear.

**`voting`**: Show vote cards (see below). One card per active non-preset session.

**`waiting`**: Show "You voted for {name}" confirmation cards for each session. Show "Waiting for others to finish voting..." with a spinner. Poll `GET /api/vote-sessions/{id}/results` every 5 seconds per session.

**`leaderboard`**: Transition to `<Leaderboard />` component with all scores (see Issue #4).

### Voting UI — One Card Per Session

Each vote card shows:
- Session title at the top (e.g. "Most drunk last night 🍻")
- Grid of eligible participants (from `vote_session_participants` for this session)
- Each participant shown as a circular photo + name
- Single-select: tapping a participant highlights them (blue border)
- "Submit vote" button (bottom of card, disabled until a selection is made)
- After submit: card transitions to confirmation state (green, "You voted for {name}")

**Layout**: Single column on mobile (max 2 columns on wider screens). Participant tiles are touch-friendly (min 72px height).

**Photo source**: Use `photo_url` from `vote_session_participants` if set; otherwise call `/api/participant-photos/{participant_id}` and use the first returned photo filename (construct path as `/data/participants/{id}/{filename}`). Fall back to `photo.svg`.

### Vote Submission

Call `POST /api/participant-votes`:
```json
{
  "vote_session_id": "uuid",
  "voter_name": "{participantId}",
  "voted_for": "{selectedParticipantId}"
}
```

On 409 (already voted): treat silently as already-voted confirmation — show the confirmation state.
On other errors: show inline error with retry button.

### Multiple Sessions — Step-by-Step Wizard

If multiple active sessions exist for the day, show them one at a time as a wizard:
- One vote card is shown at a time
- After the participant submits their vote for a session, a "Next" button appears to advance to the next session
- A progress indicator shows the current step (e.g. "Vote 1 of 2")
- The participant cannot go back to a previous session once submitted
- The "waiting" state is entered only when the participant has submitted votes for all sessions

### Completion Gating

`is_complete` from `GET /api/vote-sessions/{id}/results` signals when all eligible voters have voted. The leaderboard is shown when ALL active sessions (including preset ones) are marked complete.

For preset sessions: `is_complete` is always `true` — they never block the leaderboard reveal.

Poll results every 5 seconds during the `waiting` state.

---

## 3. Participant Page Update

### `app/[token]/[participant]/ParticipantPageClient.tsx`

Add handling for the `'day-2-voting'` state. Pattern mirrors the existing `'day-1-voting'` case:

```tsx
case 'day-2-voting':
  return <FloatingHeadsVote participantId={participantId} sessionDay={2} />;
```

Also update the existing `'day-1-voting'` case to pass the new `sessionDay` prop:

```tsx
case 'day-1-voting':
  return <FloatingHeadsVote participantId={participantId} sessionDay={1} />;
```

---

## 4. Host Controls Update

### State Transition UI (in `components/StateControl.tsx` or `components/HostControls.tsx`)

Ensure `'day-2-voting'` appears in the state transition list between `'day-1'` and `'day-2'`.

The state label shown to the host should be: `"Day 2 Voting"`.

---

## 5. Legacy Cleanup

### Remove `components/VotingInterface.tsx`

This file uses `localStorage` and simulated API calls. It was shown during the `'day-1'` state. The new system supersedes it entirely.

**Steps**:
1. Delete `components/VotingInterface.tsx`
2. Remove its import from `app/[token]/[participant]/ParticipantPageClient.tsx`
3. Remove `<VotingInterface />` usage from the `'day-1'` state case in `ParticipantPageClient.tsx`

The `'day-1'` state shows only zone game content after this change. Voting only occurs in the dedicated `day-1-voting` and `day-2-voting` states.

### `data/votingQuestions.ts`

This file contains the old hardcoded question definitions. After this issue is complete it is unused. Delete the file and remove any imports.

---

## New Files

- *(none — all existing files are modified or deleted)*

## Modified Files

- `components/FloatingHeadsVote.tsx` — full rewrite
- `data/states.ts` — add `day-2-voting` state
- `app/[token]/[participant]/ParticipantPageClient.tsx` — add `day-2-voting` case, update `day-1-voting`, remove VotingInterface import
- `components/StateControl.tsx` or `components/HostControls.tsx` — add `day-2-voting` to transition list

## Deleted Files

- `components/VotingInterface.tsx`
- `data/votingQuestions.ts`

## Prerequisites

- Issue #1 must be complete (all API routes functional)

---

## Definition of Done

- [ ] `'day-2-voting'` appears in `data/states.ts` enum and ordered list
- [ ] Host can transition to `day-2-voting` in the state control UI
- [ ] Setting state to `day-1-voting` shows `FloatingHeadsVote` with `sessionDay={1}` for participants
- [ ] Setting state to `day-2-voting` shows `FloatingHeadsVote` with `sessionDay={2}` for participants
- [ ] `FloatingHeadsVote` fetches sessions from DB (verify in Network tab — no hardcoded question keys)
- [ ] If no active sessions exist for the day, the "waiting for host" message is shown
- [ ] Participant photo tiles use the host-assigned photo or fall back to existing photo
- [ ] Submitting a vote calls `POST /api/participant-votes` and shows confirmation
- [ ] Double-submit is handled gracefully (shows confirmation, no error)
- [ ] `VotingInterface.tsx` is deleted and no import errors remain
- [ ] `data/votingQuestions.ts` is deleted and no import errors remain
- [ ] No `localStorage` references remain in voting-related components
- [ ] All existing tests pass (update or remove `__tests__/VotingInterface.test.tsx` as needed)

---

## Open Questions

All questions resolved. Legacy cleanup completed as part of Issue #1 implementation:
- `components/VotingInterface.tsx` deleted
- `data/votingQuestions.ts` deleted
- `__tests__/VotingInterface.test.tsx` deleted
- VotingInterface references removed from `ParticipantPageClient.tsx`
- Old `voting-scores` API routes patched to inline their constants
