# Zone Challenge Game — Issue #2: Map Component & Location Service

## Context Summary

This is the second of six issues for the Riga Zone Challenge Game. It implements the interactive Leaflet map that participants see, zone circle rendering, and GPS location tracking with a mock/dev override.

**Prerequisite**: Issue #1 (database and types) must be complete. This issue reads from the `zones` and `zone_claims` tables seeded in Issue #1.

## Current State

No map component exists in the codebase. The participant page (`ParticipantPageClient.tsx`) renders state-gated content but has no map functionality.

## Target Functionality

### Participant Map View
- Full-screen or large mobile-first map centered on Riga Old Town
- All zones rendered as colored circles — always visible, not hidden until nearby
- Zone color = the claiming team's color (`red`, `yellow`, `blue`, `green`)
- Unclaimed zones = neutral grey
- Only the participant's own team location dot is shown (not other teams' positions)
- Zones update in near-real-time as claims change (SWR polling every 10 seconds)

### Visual Zone States

| State | Circle Color | Border |
|---|---|---|
| Unclaimed | Grey `#9ca3af` | Dashed grey |
| Claimed by Red team | `#ef4444` | Solid red |
| Claimed by Yellow team | `#eab308` | Solid yellow |
| Claimed by Blue team | `#3b82f6` | Solid blue |
| Claimed by Green team | `#22c55e` | Solid green |
| Completed (own team) | Team color | Solid + ✓ label |

**No** special "my team" vs "other team" visual distinction — all teams see the raw team color so everyone knows the game board state at a glance.

### Location Tracking
- Real GPS via `navigator.geolocation.watchPosition()` on mobile
- Mock/dev mode: coordinates are code-set per participant in `data/participant-assets.ts` or a new `data/mock-locations.ts`
- Mock mode is enabled when `process.env.NEXT_PUBLIC_MOCK_LOCATION === 'true'`
- The location dot for the current participant is shown as a small pulsing circle in their team color

Mock coordinates should be set per participant, scattered around Riga Old Town so that different participants are near different zones during testing. The placeholder coordinates in the code block below are adequate starting positions.

## Technical Architecture

### Library Choice
Use `react-leaflet` (the official React wrapper for Leaflet.js) — not vanilla Leaflet. This integrates cleanly with React 19 / Next.js 15 state.

**Install**:
```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

**Critical**: Leaflet requires a DOM and cannot run server-side. The map component must be loaded with `next/dynamic` and `ssr: false`.

```typescript
// In ParticipantPageClient.tsx or game page:
const ZoneMap = dynamic(() => import('@/components/ZoneMap'), { ssr: false });
```

### Location Service

New file: `utils/locationService.ts`

```typescript
export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Mock coordinates per participant for dev mode
// Per-participant mock coordinates scattered around Riga Old Town for testing
const MOCK_LOCATIONS: Record<string, LocationCoords> = {
  oskar:    { lat: 56.9496, lng: 24.1052 }, // Riga Old Town center
  odd:      { lat: 56.9492, lng: 24.1038 },
  aasmund:  { lat: 56.9510, lng: 24.1070 },
  emilie:   { lat: 56.9465, lng: 24.1077 },
  mathias:  { lat: 56.9487, lng: 24.1120 },
  brage:    { lat: 56.9479, lng: 24.1062 },
  sara:     { lat: 56.9503, lng: 24.1130 },
  johanna:  { lat: 56.9507, lng: 24.1020 },
};

export function getMockLocation(participantId: string): LocationCoords {
  return MOCK_LOCATIONS[participantId] ?? { lat: 56.9496, lng: 24.1052 };
}

export function useParticipantLocation(participantId: string): {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
} { ... }
```

The hook returned from `useParticipantLocation` should:
1. If `NEXT_PUBLIC_MOCK_LOCATION === 'true'`, immediately return the mock coordinate for this participant. No GPS call.
2. Otherwise, call `navigator.geolocation.watchPosition()`, update on each position change, and clean up on unmount.
3. On GPS permission denied: return a descriptive error string (displayed in UI, not thrown).
4. On each position update (real or mock), push the location to the server: `POST /api/locations` with `{ participant_id, team_color, lat, lng, accuracy }`. This upserts the `team_locations` table (from Issue #1) so that the host dashboard can show all team dots in real time.
5. Throttle server pushes to at most once every 15 seconds to avoid excessive requests.

### Zone Map Component

New file: `components/ZoneMap.tsx`

**Key props**:
```typescript
interface ZoneMapProps {
  participantId: string;
  teamColor: TeamColor;
  zonesWithClaims: ZoneWithClaim[]; // from GET /api/zones/claims
}
```

**Renders**:
1. `MapContainer` — centered `[56.9496, 24.1052]`, zoom 15, no scroll wheel on mobile
2. `TileLayer` — OpenStreetMap tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
3. For each zone: a `Circle` component with color derived from `zone.claim?.team_color`
4. For each completed zone: a `Tooltip` (always open) showing `✓`
5. Own location: a `CircleMarker` with pulsing animation in team color. No Marker/pin used.
6. Zone tap: `eventHandlers={{ click: () => onZoneTap(zone) }}` — opens the challenge/claim panel (implemented in Issue #4)

### Data Fetching

New API call used: `GET /api/zones/claims` (implemented in Issue #3).

For this issue, use SWR with a 10-second refresh interval:
```typescript
const { data, error } = useSWR('/api/zones/claims', fetcher, { refreshInterval: 10000 });
```

If the data is not yet available (first load), show a skeleton/loading state over the map.

## File Structure

### New Files
- `utils/locationService.ts` — GPS + mock location hook
- `components/ZoneMap.tsx` — main Leaflet map component (no SSR)

### Modified Files
- `package.json` — add `react-leaflet`, `leaflet`, `@types/leaflet`
- `app/globals.css` — import `leaflet/dist/leaflet.css` (required, Leaflet styles are not auto-loaded)
- `app/[token]/[participant]/ParticipantPageClient.tsx` — dynamic import `ZoneMap`, render in `day-1` and `day-2` states only

## Mobile Considerations

- Map container height: `calc(100vh - 64px)` (subtracting header)
- `scrollWheelZoom={false}` to prevent accidental scroll on mobile
- Touch events handled natively by Leaflet
- `zoomControl={false}` — hide zoom buttons on mobile (pinch-to-zoom used instead)

The map **replaces** existing day-1/day-2 content (team info, restaurant info etc.) when the game is active. The zone map + score header take over the full participant screen. Restaurant info can be accessed from a separate tab or is no longer visible during the game phase.

## Definition of Done

- [ ] `react-leaflet` installed with no TypeScript errors
- [ ] Map renders in browser without SSR crash (dynamic import verified)
- [ ] All 20 zone circles render at correct Riga positions
- [ ] Zone colors reflect current DB claims (grey = unclaimed, team color = claimed)
- [ ] Own location dot shows on map (mock mode tested with ≥2 different participant IDs)
- [ ] Map does not show other participants' location dots
- [ ] SWR polling updates zone colors when a claim is added externally
- [ ] No console errors; Leaflet CSS loaded correctly
