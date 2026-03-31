# Zone Challenge Game — Issue #3: Zone Claim API & Server-Side Proximity Validation

## Context Summary

This is the third of six issues for the Riga Zone Challenge Game. It implements all API routes that read zone state and handle zone claiming. The core mechanic is server-side proximity validation: when a team taps "Unlock Zone", the server checks that they are genuinely within 50 metres of the zone before confirming the claim.

**Prerequisites**:
- Issue #1 (database tables and seed data) must be complete
- Issue #2 (map component and location service) must be complete — the map calls these endpoints

## API Endpoints Required

### `GET /api/zones`

**Purpose**: Return all zone definitions for rendering map circles. Called once on map load.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Freedom Monument",
    "center_lat": 56.95120,
    "center_lng": 24.11330,
    "radius_m": 50
  },
  ...
]
```

No auth required. Read-only.

---

### `GET /api/zones/claims`

**Purpose**: Return all current zone claims (all phases). Used by the map to color circles and by participants to check their team's claim status.

**Response**:
```json
[
  {
    "zone_id": 1,
    "team_color": "red",
    "phase": "day1",
    "completed": false,
    "steal_locked": false
  },
  ...
]
```

No auth required. Only returns active claims (one per zone per phase). Polled every 10 seconds by the map component.

---

### `POST /api/zones/[id]/claim`

**Purpose**: Attempt to claim a zone. The server validates proximity before accepting.

**Request body**:
```json
{
  "participant_id": "emilie",
  "team_color": "red",
  "phase": "day1",
  "lat": 56.95118,
  "lng": 24.11325
}
```

**Server-side validation steps (in order)**:

1. **Zone exists** — look up zone by `id`. 404 if not found.
2. **Proximity check** — calculate distance between `(lat, lng)` and `(zone.center_lat, zone.center_lng)` using the spherical law of cosines formula below.
   - If distance > `zone.radius_m`: return 400 with `{ error: 'too_far', distance_m: <calculated> }`
3. **Phase = day1**: check that no claim exists for this zone+phase. If already claimed: return 409 with `{ error: 'already_claimed', team_color: <owner> }`
4. **Phase = day2 (steal logic handled in Issue #5)**: for this issue, treat day2 same as day1 for initial claim only. Steal logic is out of scope here.
5. **Insert** into `zone_claims`. Retrieve the matching `challenge` for this zone+phase.
6. Return 200 with the challenge text:

```json
{
  "success": true,
  "challenge": {
    "id": 12,
    "text": "Take a team photo with the Freedom Monument...",
    "type": "geography",
    "zone_name": "Freedom Monument"
  }
}
```

**Distance formula (spherical law of cosines)**:

```typescript
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  return Math.acos(
    Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  ) * R;
}
```

This formula is taken from the Pistou treasure hunt app's `get_dist()` implementation and is accurate enough for distances under 1km.

**Dev/mock mode**: The server should have a server-side env var `SKIP_LOCATION_CHECK=true`. When set, the proximity check is bypassed entirely and any claim is accepted regardless of coordinates. This is essential for testing without physically being in Riga. The client-side `NEXT_PUBLIC_MOCK_LOCATION` controls which coordinates are sent; the server-side `SKIP_LOCATION_CHECK` controls whether validation runs. Both should be set during development.

---

### `POST /api/zones/[id]/complete`

**Purpose**: Mark a claimed zone's challenge as completed. Awards 1 point to the team.

**Request body**:
```json
{
  "participant_id": "emilie",
  "team_color": "red",
  "phase": "day1"
}
```

**Validation**:
1. Zone+phase claim must exist for this `team_color`
2. Claim must not already be `completed = true`
3. Claim `team_color` must match the request `team_color`

**On success**: Set `completed = true`, `completed_at = NOW()`, `points_awarded = true`.

**Response**:
```json
{
  "success": true,
  "team_total_points": 3
}
```

The `team_total_points` is calculated as `SELECT COUNT(*) FROM zone_claims WHERE team_color = $1 AND phase = $2 AND points_awarded = true`.

---

### `GET /api/zones/scores`

**Purpose**: Return current point totals per team per phase. Used by participant score display and host dashboard.

**Response**:
```json
{
  "day1": {
    "red": 3,
    "yellow": 2,
    "blue": 1,
    "green": 4
  },
  "day2": {
    "red": 1,
    "yellow": 0,
    "blue": 0,
    "green": 2
  }
}
```

No auth required. Read-only.

## File Structure

### New Files

```
app/
  api/
    zones/
      route.ts                  ← GET /api/zones
      claims/
        route.ts                ← GET /api/zones/claims
      scores/
        route.ts                ← GET /api/zones/scores
      [id]/
        claim/
          route.ts              ← POST /api/zones/[id]/claim
        complete/
          route.ts              ← POST /api/zones/[id]/complete
    locations/
      route.ts                  ← POST /api/locations (upsert participant location)
                                ← GET /api/locations (return all team locations — host-only)
utils/
  zoneUtils.ts                  ← shared distanceMeters() function
```

### Reference Files (read but don't modify)
- `lib/db.ts` — DB connection pattern to follow
- `app/api/destination-guesses/route.ts` — existing API structure to follow
- `types/zones.ts` — TypeScript interfaces from Issue #1

## Error Response Format

All error responses follow this shape (consistent with existing API patterns):
```json
{ "error": "too_far", "distance_m": 73.5 }
```

HTTP status codes:
- `400` — bad request (too far, missing field)
- `404` — zone not found
- `409` — conflict (already claimed)
- `500` — server error

## Definition of Done

- [ ] `GET /api/zones` returns all 20 zones with no errors
- [ ] `GET /api/zones/claims` returns correct claim state after DB seed
- [ ] `POST /api/zones/[id]/claim` — rejects requests with distance > zone radius (tested with coordinates >50m away)
- [ ] `POST /api/zones/[id]/claim` — accepts requests within zone radius
- [ ] `POST /api/zones/[id]/claim` — returns 409 if zone already claimed in same phase
- [ ] `POST /api/zones/[id]/complete` — increments team score and sets `completed = true`
- [ ] `POST /api/zones/[id]/complete` — rejects double completion (`409`)
- [ ] `GET /api/zones/scores` returns correct counts matching DB state
- [ ] In mock mode (`SKIP_LOCATION_CHECK=true`), proximity check is bypassed
- [ ] All TypeScript types used from `types/zones.ts`, no `any` types in API routes
