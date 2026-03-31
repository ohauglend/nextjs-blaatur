# Zone Challenge Game — Issue #6: Host Dashboard & Full Integration

## Context Summary

This is the final issue for the Riga Zone Challenge Game. It gates the game behind the existing trip state system, gives hosts a live overview dashboard, and ties together all previous issues into a working end-to-end experience for the trip on Day 1 and Day 2.

**Prerequisites**: Issues #1–#5 must all be complete before this issue is started.

## Scope

1. Gate the zone game in `ParticipantPageClient.tsx` behind `day-1` and `day-2` states
2. Add a Zone Game section to the host controls dashboard (live live map + scores + Day 2 transition trigger)
3. Hosts play as regular participants — no special map privileges on their participant view
4. A host-only admin view within the host dashboard shows all team positions on the consolidated map
5. Dev controls: reset all zone claims, toggle mock location
6. Final mobile UX pass on all zone game components

## State Gating

The zone game map should only appear when `currentState` is `'day-1'` or `'day-2'`.

In `app/[token]/[participant]/ParticipantPageClient.tsx`:

```typescript
{(currentState === 'day-1' || currentState === 'day-2') && (
  <>
    <TeamScoreHeader
      teamColor={participantTeamColor}
      phase={currentState === 'day-1' ? 'day1' : 'day2'}
    />
    <ZoneMap
      participantId={participant}
      teamColor={participantTeamColor}
      zonesWithClaims={zonesData}
    />
  </>
)}
```

A helper `utils/gamePhaseUtils.ts` (from Issue #5) provides `getTeamForPhase(participantId, 'day1' | 'day2')`.

The map **replaces** existing day-1/day-2 content (team info, restaurant info etc.) when the game is active. The zone map + score header take over the full participant screen.

## Host Participant View

Hosts (Oskar, Odd, Aasmund) are members of their Day 1 teams (Blue: johanna+oskar, Green: odd+aasmund) and play exactly like participants. Their participant page (`/[token]/[participant]`) shows the same zone map as everyone else.

The only difference is that their participant page also shows a link or tab to switch to the host dashboard view.

This is consistent with the existing pattern in the codebase where hosts have a `role: 'host'` in `data/participants.ts` and can access the host route.

## Host Dashboard — Zone Game Section

The host dashboard (`app/[token]/host/controls/page.tsx` based on existing routing) should gain a new **Zone Game** section. This is not a new page — it is a new panel within the existing host controls structure.

### Zone Game Panel Components

#### 1. Full Zone Map (Host-Only View)

Same `ZoneMap` component used by participants, but with one difference:
- **All team location dots visible** (not just own team)
- Hosts see every participant's GPS dot in their team color
- This allows hosts to spot any technical issues or verify if a team is genuinely near a zone

To support this: `ZoneMap` gains an optional prop `showAllLocations: boolean`. When true, it fetches `GET /api/locations` (polling every 10 seconds) which returns all participants' last known positions from the `team_locations` table (populated by Issue #2's location push in `useParticipantLocation`). Each dot is rendered as a `CircleMarker` in the participant's team color with a small label showing the participant name.

#### 2. Scoreboard Table

A live-updated table showing:

| Team | Day 1 Claims | Day 1 Completed | Points |
|---|---|---|---|
| 🔴 Red | 4 | 3 | 3 |
| 🟡 Yellow | 3 | 3 | 3 |
| 🔵 Blue | 2 | 1 | 1 |
| 🟢 Green | 5 | 5 | 5 |

Fetches from `GET /api/zones/scores`. Refreshes every 10 seconds via SWR.

#### 3. Day 2 Transition Control

A button: **"Start Day 2 — Merge Teams"**

- Disabled until current state is `day-2`
- Shows the merge preview: "Green + Blue → Green Team (6pts), Red + Yellow → Red Team (5pts)" calculated from live scores
- Confirmation prompt before executing
- Calls `POST /api/game/transition-to-day2`
- After success: shows the resulting Day 2 team compositions
- Idempotent — if already transitioned, shows current assignments instead of button

The Day 2 merge is triggered **manually** by the host pressing this button. It is not auto-triggered by state changes. This gives hosts full control over timing.

#### 4. Host Challenge Review & Point Withdrawal Panel

A section in the host dashboard for reviewing completed challenges and withdrawing points when photo proof is insufficient.

- Lists all completed zone claims across all teams, sorted by most recent
- Each row shows: zone name, team color, challenge text, completed timestamp, participant who marked complete
- Each row has a **"Withdraw Point"** button that:
  1. Sets `points_awarded = false` and `completed = false` on the `zone_claims` row
  2. This re-opens the zone for the team to retry
  3. Requires a confirmation prompt ("Withdraw 1 point from [team]?")
- Hosts communicate verbally/via group chat why the point was withdrawn — no in-app messaging needed

New API: `POST /api/zones/[id]/withdraw` (host-only) — sets `points_awarded = false`, `completed = false` on the matching zone claim.

#### 5. Dev Controls (Development Only)

Visible only when `NODE_ENV !== 'production'` or a dev flag is set:

- **"Reset All Zone Claims"** button — calls `DELETE /api/zones/claims/reset` which truncates `zone_claims` and `day2_team_assignments`. Requires confirmation prompt. Used for testing and rehearsal.
- **"Mock Location: ON/OFF"** toggle — sets a cookie or localStorage flag that enables mock location mode across all participant sessions on this device.

### New API: `DELETE /api/zones/claims/reset`

**Purpose**: Development/host reset. Clears all zone claims and day2 assignments.

```sql
TRUNCATE zone_claims;
TRUNCATE day2_team_assignments;
```

**Access**: Restricted — only callable when `NEXT_PUBLIC_DEV_MODE === 'true'` OR by a host participant token.

## Summary of All Files Changed in This Issue

### New Files
- `app/api/zones/claims/reset/route.ts` — DELETE endpoint
- `app/api/zones/[id]/withdraw/route.ts` — POST endpoint (host point withdrawal)

### Modified Files
- `app/[token]/[participant]/ParticipantPageClient.tsx` — gate game behind `day-1`/`day-2` states
- `components/ZoneMap.tsx` — add `showAllLocations` prop for host view
- `components/HostControls.tsx` (or equivalent) — add Zone Game panel section
- `utils/gamePhaseUtils.ts` — `getTeamForPhase` consumed here for state gating

## End-to-End Test Scenarios

These should be manually verified before considering the full feature complete:

### Scenario A — Full Day 1 Run (4 teams)
1. Set state to `day-1`
2. Each of 8 participant accounts sees the zone map
3. One participant taps a zone, gets "too far" error (mock location not in zone)
4. Move mock location into zone radius → claim succeeds → challenge appears
5. Tap "Mark Complete" → score increments
6. Second team tries same zone → gets "Already Claimed" message
7. Host dashboard shows correct scores and zone colors

### Scenario B — Day 2 Transition & Steal
1. Ensure Day 1 has unequal scores across teams
2. Host clicks "Start Day 2" — merge preview is correct
3. Confirm — `day2_team_assignments` populated
4. Participants now see their Day 2 team in score header
5. Navigate to zone owned by merged opponents → "Steal Zone" button visible
6. Steal succeeds → zone color changes → score transfers
7. Try to steal same zone again → "🔒 Stolen — locked" shown
8. Try to steal a completed zone → "✓ Completed — immune" shown

### Scenario C — Host Plays as Participant
1. Host (e.g. Oskar) accesses their participant URL
2. Sees zone map, their Blue team, location dot
3. Can claim zones, complete challenges
4. Separately, navigates to host controls — sees admin dashboard with all team dots + transition button

## Definition of Done

- [ ] Zone game map hidden in `pre-trip`, `flight`, `flight-home`, `after-trip` states
- [ ] Zone game map visible in `day-1` and `day-2` states for all 8 participants
- [ ] Host participant page shows same map as other participants
- [ ] Host dashboard has Zone Game section with scoreboard + transition button + challenge review panel
- [ ] Host can withdraw a point from a completed challenge via the review panel
- [ ] Withdrawn point correctly decrements team score and re-opens zone for retry
- [ ] Host map shows all participant GPS dots from `team_locations` table
- [ ] Merge preview is correct before transition
- [ ] "Reset claims" dev button works and clears DB fully
- [ ] End-to-end Scenario A passes (Day 1 full run)
- [ ] End-to-end Scenario B passes (Day 2 steal + transition)
- [ ] End-to-end Scenario C passes (host as participant)
- [ ] All map interactions work on mobile browsers (iOS Safari + Android Chrome tested)
- [ ] No console errors or TypeScript errors in production build (`next build` passes)
