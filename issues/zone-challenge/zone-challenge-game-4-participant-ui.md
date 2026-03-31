# Zone Challenge Game — Issue #4: Participant Challenge UI & Scoring

## Context Summary

This is the fourth of six issues for the Riga Zone Challenge Game. It implements the participant-facing interactive layer on top of the map: tapping a zone, attempting to unlock it, viewing a challenge, and marking it complete. It also adds the persistent team score display.

**Prerequisites**:
- Issue #1 (database) must be complete
- Issue #2 (map component) must be complete — tap events originate from `ZoneMap.tsx`
- Issue #3 (claim + complete API) must be complete — this issue calls those endpoints

## Target Functionality

### Zone Tap Flow

1. Participant taps a zone circle on the map
2. A bottom sheet / slide-up panel appears showing zone info
3. Panel content varies by zone state:

| Zone State (for this participant's team) | Panel Content |
|---|---|
| Unclaimed | Zone name + "Unlock Zone" button |
| Claimed by another team, not steal-locked | Zone name + claiming team color badge + disabled "Already Claimed" |
| Claimed by another team (Day 2, steal available) | Handled in Issue #5 |
| Claimed by own team, not completed | Zone name + challenge text + type badge + "Mark Complete" button |
| Claimed by own team, completed | Zone name + challenge text + "✓ Completed" badge (no button) |

### Unlock Zone Button

- Tapping "Unlock Zone":
  1. Gets current GPS position (or mock position in dev mode)
  2. Calls `POST /api/zones/[id]/claim` with position + participant_id + team_color + phase
  3. On success: panel transitions to show challenge text + "Mark Complete" button
  4. On `too_far` error: show inline error message "You're {distance}m away — get closer!"
  5. On `already_claimed` error (race condition): refresh zone data and show "Just claimed by {team}" message
  6. Loading state: button shows spinner, disabled during request

### Challenge Card

Shown after a successful unlock (or when tapping an already-owned zone):

- Zone name as card title
- Challenge type badge: `📍 Location-specific` for `geography`, `🍺 Generic` for `generic` — displayed with the team's color
- Participant scope badge: `👥 Whole team` for `participant_scope = 'team'`, `☝️ Pick one` for `participant_scope = 'one'`
- Challenge text (large, readable on mobile)
- "Mark Complete" button — primary CTA
- Small note: "Share photo proof in the group chat before marking complete."

### Photo Proof & Completion

Photo proof is handled **externally** — teams share photos via WhatsApp, iMessage, or Google Photos. There is no in-app photo upload. The flow is:

1. Team completes the challenge in real life
2. Team shares photo to the group chat (external to the app)
3. Team taps "Mark Complete" in the app — this records commitment to completion
4. Hosts review photos later via the host dashboard and can withdraw points if evidence is insufficient (see Issue #6)

The "Mark Complete" button includes a note: "Share photo proof in the group chat before marking complete."

### Mark Complete Button

- Calls `POST /api/zones/[id]/complete` with participant_id + team_color + phase
- On success: button replaced with green `✓ Completed` badge; score increments by 1 in the header
- On error (not owner, already complete): show appropriate error message
- Cannot be accidentally double-tapped — button is disabled immediately on first tap

### Team Score Display

A persistent score header above the map showing **all teams' scores** as a compact leaderboard strip:

```
🔴 3  🟡 2  🔵 1  🟢 5     Day 1
```

- Shows all team colors with their point totals in a single horizontal row
- The participant's own team is visually highlighted (bold or underline)
- Updates via SWR polling (same interval as zone claims)
- On Day 2 start, shows merged team names and accumulated totals
- Compact design: fits in ~40px height, does not eat into the map

## Component Architecture

### New Component: `ZoneChallengePanel`

**Location**: `components/ZoneChallengePanel.tsx`

```typescript
interface ZoneChallengePanelProps {
  zone: ZoneWithClaim;
  currentChallenge: Challenge | null;
  participantId: string;
  teamColor: TeamColor;
  phase: GamePhase;
  onClose: () => void;
  onClaimSuccess: (claim: ZoneClaim) => void;
  onCompleteSuccess: () => void;
}
```

Renders as a fixed bottom sheet (positioned at bottom of viewport on mobile). Slides up on zone tap. Dismissable by tap outside or swipe down.

### Modified Component: `ZoneMap.tsx` (from Issue #2)

- Add `onZoneTap` prop that receives a `ZoneWithClaim`
- Pass current claim + challenge into the tap handler so `ZoneChallengePanel` has context

### New Component: `TeamScoreHeader`

**Location**: `components/TeamScoreHeader.tsx`

```typescript
interface TeamScoreHeaderProps {
  teamColor: TeamColor;
  phase: GamePhase;
}
```

Fetches score from `GET /api/zones/scores` via SWR. Shows team name, emoji, and point count.

## Mobile UX Details

- Bottom sheet uses CSS `transform: translateY()` animation (slide up on open, slide down on close)
- Backdrop overlay behind panel — tap it to dismiss
- Challenge text uses `text-lg` or larger for readability outdoors in sunlight
- All tap targets ≥ 48px height (WCAG touch target guidelines)
- Panel does not obscure the map entirely — max height `60vh`

## File Structure

### New Files
- `components/ZoneChallengePanel.tsx`
- `components/TeamScoreHeader.tsx`

### Modified Files
- `components/ZoneMap.tsx` — add zone tap handler and `onZoneTap` prop
- `app/[token]/[participant]/ParticipantPageClient.tsx` — mount `TeamScoreHeader` and wire `ZoneChallengePanel` to map tap events

## Definition of Done

- [ ] Tapping an unclaimed zone shows "Unlock Zone" button
- [ ] Unlock button calls claim API with correct coordinates
- [ ] `too_far` error shows distance feedback in the panel
- [ ] Successful claim shows challenge text and type badge
- [ ] "Mark Complete" calls complete API and updates to ✓ state
- [ ] Double-tap of "Mark Complete" is blocked (button disabled on first tap)
- [ ] Team score increments by 1 after marking complete
- [ ] Tapping an already-owned zone (own team) shows challenge + completed state correctly
- [ ] Tapping a zone owned by another team shows the owning team's color badge
- [ ] Panel closes cleanly (no layout shift, map still usable after close)
- [ ] All interactions tested on mobile viewport (375px width)
