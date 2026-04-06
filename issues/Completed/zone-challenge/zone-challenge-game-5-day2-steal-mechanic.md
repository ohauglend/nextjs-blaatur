# Zone Challenge Game — Issue #5: Day 2 Steal Mechanic & Team Merge

## Context Summary

This is the fifth of six issues for the Riga Zone Challenge Game. It implements the afternoon phase: a host-triggered transition that merges Day 1 teams into two larger teams based on scores, then unlocks the steal mechanic where teams can claim zones held by their opponents.

**Prerequisites**: Issues #1–#4 must be complete and working.

## Day 2 Rules Summary

- Day 1 claims persist into Day 2 — teams keep their morning points
- Teams merge: fewest-points team joins the most-points team; second-fewest joins second-most
- New Day 2 team = the combined points of both merged Day 1 teams
- **Each zone can only be stolen once in Day 2** — once stolen it is `steal_locked = true`
- **Completed zones cannot be stolen** — `completed = true` makes a claim permanent
- Steal = point transfer: −1 from previous owner, +1 for stealing team
- Day 2 challenges are the drinking-focused variants (Phase = `day2`) from the `challenges` table

## Day 2 Team Merge Algorithm

### Trigger
A host presses "Start Day 2 Phase" in the host dashboard (Issue #6). This calls `POST /api/game/transition-to-day2`.

### Merge Logic

**Input**: Current Day 1 scores from `zone_claims` (count of `points_awarded = true` per `team_color` where `phase = 'day1'`).

**Tie-breaking**: Use alphabetical team color order as tiebreaker (blue < green < red < yellow). This is a simplification — ties are unlikely with 20 zones.

**Algorithm**:
1. Sort all 4 teams by their Day 1 score
2. Rank 1 (highest) merges with Rank 4 (lowest) → forms one Day 2 team
3. Rank 2 merges with Rank 3 → forms the other Day 2 team
4. Both merged teams take the color of the higher-ranked team in each pair
   - e.g. if Green (rank 1) merges with Blue (rank 4), the merged team becomes **Green Team**
5. Insert all 8 participants into `day2_team_assignments` with their new `day2_team_color`

**Example**:
```
Day 1 scores: Green=5, Red=3, Yellow=2, Blue=1
Rank 1 = Green (5pts) + Rank 4 = Blue (1pt) → Day 2 Green Team (6pts total)
Rank 2 = Red (3pts) + Rank 3 = Yellow (2pts) → Day 2 Red Team (5pts total)
```

### API: `POST /api/game/transition-to-day2`

**Access**: Host-only (validate participant_id's role is host — no token auth, just role check).

**Actions**:
1. Calculate Day 1 scores per team
2. Apply merge algorithm
3. Insert all participants into `day2_team_assignments`
4. Return the resulting team assignments + merged scores

```json
{
  "success": true,
  "day2_teams": {
    "green": {
      "members": ["odd", "aasmund", "johanna", "oskar"],
      "merged_from": ["green", "blue"],
      "starting_points": 6
    },
    "red": {
      "members": ["emilie", "mathias", "brage", "sara"],
      "merged_from": ["red", "yellow"],
      "starting_points": 5
    }
  }
}
```

**Idempotency**: If `day2_team_assignments` already has rows, return the existing assignments rather than recalculating. Do not allow double-transition.

> **Note (decided):** Hosts should be able to override/edit Day 2 team assignments — tracked in a separate issue. TODO: create the override-teams issue.

### Score Continuity

When Day 2 begins, each merged team's score is the **sum of both constituent Day 1 team scores**. This is computed dynamically from `zone_claims` (counting both old team colors) and does not require a separate score migration.

A helper query:
```sql
SELECT
  da.day2_team_color,
  COUNT(zc.id) AS total_points
FROM day2_team_assignments da
JOIN zone_claims zc ON zc.team_color = da.day1_team_color
WHERE zc.points_awarded = true
GROUP BY da.day2_team_color;
```

## Steal Mechanic

### Changes to `POST /api/zones/[id]/claim` (extends Issue #3)

In `phase = 'day2'`:

1. Look up the current `zone_claims` row for this zone+phase
2. Look up the requesting participant's `day2_team_color` from `day2_team_assignments`
3. **Reject** if: no existing claim for this zone in day1 AND no existing claim in day2 → treat as a fresh claim (first team to visit), no steal needed
4. **Reject** if: existing claim's `team_color` (mapped through `day2_team_assignments`) matches the requester's `day2_team_color` → own zone, cannot steal
5. **Reject** if: `steal_locked = true` → zone already stolen, permanently locked
6. **Reject** if: `completed = true` → completed zones are immune to stealing
7. **Accept steal**: proximity check passes + all rejection conditions cleared
   - Archive the existing `zone_claims` row into `zone_claim_history` (preserving the old team, timestamps, and marking `stolen_by_team`)
   - Delete the existing `zone_claims` row
   - Insert a **new** `zone_claims` row for the stealing team: `team_color` = stealer's team color, `steal_locked = true`, `completed = false`, `points_awarded = false`
   - The old team loses their point because their row (and `points_awarded = true`) is now in `zone_claim_history`, no longer counted in the active `zone_claims` score query
   - The stealing team must still complete the Day 2 challenge to earn their point
8. Return the Day 2 challenge text for this zone on success

### UI Changes for Day 2 (extends Issue #4's `ZoneChallengePanel`)

When `phase = 'day2'` and a zone is claimed by **another team** (determined via `day2_team_assignments`):
- Show the claiming team color badge as normal
- Show a **"Steal Zone"** button (if not steal_locked and not completed)
- If `steal_locked = true`: show "🔒 Stolen — locked" label
- If `completed = true`: show "✓ Completed — immune" label

Team colors shown on the map zones for Day 2 should reflect the **Day 2 team color** (merged team), not the Day 1 team color that originally claimed it. A static color change is sufficient when a zone is stolen — no animation needed.

### Participant Phase Awareness

When `phase = 'day2'`, participants see:
- Their Day 2 team name and color in `TeamScoreHeader`
- The transition message: "Afternoon phase has started. New team: [color]. Your team carries [N] points from this morning."

A small helper utility `utils/gamePhaseUtils.ts` should:
- Return the participant's current team color (Day 1 or Day 2) based on `day2_team_assignments`
- Be used by both the map and the panel to determine "own team" vs "opponent"

## File Structure

### New Files
- `app/api/game/transition-to-day2/route.ts` — POST endpoint for host-triggered transition
- `utils/gamePhaseUtils.ts` — helpers: `getTeamForPhase(participantId, phase)`, `getMergedScore(day2TeamColor)`

### Modified Files
- `app/api/zones/[id]/claim/route.ts` — extend to handle Day 2 steal logic
- `components/ZoneChallengePanel.tsx` — add "Steal Zone" button for Day 2 opponent zones
- `components/TeamScoreHeader.tsx` — show merged team name + day-transition message
- `components/ZoneMap.tsx` — use `day2_team_color` for zone coloring when in Day 2 phase

## Definition of Done

- [ ] `POST /api/game/transition-to-day2` calculates correct merge from live Day 1 scores
- [ ] All 8 participants have a `day2_team_assignments` row after transition
- [ ] Merged team scores correctly sum both constituent Day 1 scores
- [ ] Transition is idempotent (calling twice returns existing assignments)
- [ ] Day 2 steal: proximity check + all rejection conditions enforced correctly
- [ ] `steal_locked = true` after successful steal — second steal attempt returns 409
- [ ] `completed = true` zones cannot be stolen — steal attempt returns 409
- [ ] Own team's zone cannot be stolen by own team — returns 409
- [ ] Steal transfers point correctly (−1 old team, +1 new team)
- [ ] "Steal Zone" button visible in Day 2 for opponent-owned, non-locked, non-completed zones
- [ ] `ZoneChallengePanel` shows correct locked/immune labels
- [ ] `TeamScoreHeader` shows Day 2 merged team name and combined score
