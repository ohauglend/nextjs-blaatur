# Boarding Pass QR Codes — Outbound Flight

## Summary

Connect the existing outbound boarding pass QR code images to the participant UI. Each participant's boarding pass QR is displayed on their page when the host switches to the `flight` state.

**No prerequisites** — self-contained issue.

---

## Current State

- QR PNGs exist in `data/BoardingPasses_outboundFlight/<Name>/<Name>.png` but are **not served** to the browser (the `data/` folder is not in `public/`)
- `data/participant-assets.ts` defines a `flightQR` field per participant pointing to dead paths (`/data/participants/<name>/flight-qr.png`)
- `components/FlightInfo.tsx` imports `PARTICIPANT_ASSETS` but **never renders** `flightQR`; shows a `[QR Code] Placeholder` div
- `FlightInfo` already renders conditionally when `currentState === 'flight'` in `ParticipantPageClient.tsx` — no state gating changes needed

## Scope

### 1. File Organization

Move boarding pass images into `public/` so Next.js serves them as static assets.

**Target directory**: `public/boarding-passes/outbound/`

| Participant | Source | Destination |
|-------------|--------|-------------|
| Emilie | `data/BoardingPasses_outboundFlight/Emilie/Emilie.png` | `public/boarding-passes/outbound/emilie.png` |
| Mathias | `data/BoardingPasses_outboundFlight/Mathias/Mathias.png` | `public/boarding-passes/outbound/mathias.png` |
| Brage | `data/BoardingPasses_outboundFlight/Brage/Brage.png` | `public/boarding-passes/outbound/brage.png` |
| Johanna | `data/BoardingPasses_outboundFlight/Johanna/Johanna.png` | `public/boarding-passes/outbound/johanna.png` |
| Oskar | `data/BoardingPasses_outboundFlight/Oskar/Oskar.png` | `public/boarding-passes/outbound/oskar.png` |
| Odd | `data/BoardingPasses_outboundFlight/Odd/Odd.png` | `public/boarding-passes/outbound/odd.png` |
| Aasmund | `data/BoardingPasses_outboundFlight/Aasmund/Screenshot *.png` | `public/boarding-passes/outbound/aasmund.png` (rename) |
| Sara | *(no proper QR)* | `public/boarding-passes/outbound/sara.svg` (generated smiley face) |

**Sara exception**: Sara doesn't have a proper boarding pass QR. A simple smiley-face SVG is placed at her path instead. No special-casing in the component — it renders whatever `assets.flightQR` points to.

**Aasmund exception**: Aasmund has screenshot files instead of a clean PNG. Pick the best one and rename to `aasmund.png`.

### 2. Update Data Layer

**File**: `data/participant-assets.ts`

Update all 8 participants' `flightQR` values:
- `'/data/participants/<name>/flight-qr.png'` → `'/boarding-passes/outbound/<name>.png'`
- Sara: `'/boarding-passes/outbound/sara.svg'`

### 3. Update FlightInfo Component

**File**: `components/FlightInfo.tsx`

In the `type === 'departure'` branch, replace the placeholder div:

```tsx
// Before
<div className="w-32 h-32 mx-auto bg-gray-200 flex items-center justify-center text-xs text-gray-500">
  [QR Code]<br/>Placeholder
</div>

// After
<img
  src={assets.flightQR}
  alt={`${assets.name}'s boarding pass QR code`}
  className="w-48 h-48 mx-auto object-contain"
/>
```

Keep all other departure info (airport, time, gate, warning) and the return flight branch unchanged.

## Files Changed

| File | Change |
|------|--------|
| `public/boarding-passes/outbound/*.png` | New — 7 copied PNGs |
| `public/boarding-passes/outbound/sara.svg` | New — smiley face SVG |
| `data/participant-assets.ts` | Updated — `flightQR` paths for all 8 participants |
| `components/FlightInfo.tsx` | Updated — render actual image instead of placeholder |

## Scope Exclusions

- No return flight QR codes
- No new API routes (static files from `public/`)
- No database changes
- No state gating changes (already correct — `flight` state only)

## Verification

1. All 8 images load at `/boarding-passes/outbound/<name>.png` (Sara: `.svg`)
2. FlightInfo renders the QR image when state is `flight`
3. Return flight info still renders correctly (no regressions)
4. No QR code visible in non-`flight` states
