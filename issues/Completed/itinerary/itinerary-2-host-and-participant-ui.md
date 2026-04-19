# Itinerary — Issue #2: Host & Participant UI

## Context Summary

This is the second itinerary issue. It builds on the `itinerary_items` table and API routes from Issue #1 and delivers:

1. **Host itinerary management page** at `[token]/host/itinerary` — a new route in the host dashboard with a tabbed inline editor for all three itinerary types
2. **Participant itinerary view** — a timeline component shown during the correct trip states with current-item highlighting
3. **HostDashboard and HostNavigation updates** — new card and nav link

**Prerequisites**: Issue #1 must be complete and the `itinerary_items` table + API must exist.

## Scope

### 1. New Files

#### `components/ItineraryEditor.tsx`

Host-only editor component. **Pattern: mirrors `ChallengeEditor.tsx`** — inline editing within a list, no modal.

- Three tabs at the top: **Summary**, **Day 1**, **Day 2** — clicking a tab switches the active itinerary type
- Each tab fetches items via `GET /api/itinerary?type={type}` using SWR
- Items listed in datetime order (ASC)
- Each row shows: emoji, formatted datetime (`MMM d, HH:mm`), item text, Edit and Delete buttons
- Clicking **Edit** opens an inline form replacing the row:
  - `datetime-local` input (pre-filled)
  - Text input (pre-filled)
  - Emoji input (pre-filled, short text field)
  - **Cancel** restores the row; **Save** calls `PUT /api/itinerary/[id]`, updates SWR cache on success
- Clicking **Delete** shows inline confirmation, then calls `DELETE /api/itinerary/[id]`
- A **Create new item** form sits above the list:
  - `datetime-local` input
  - Text input (placeholder: "What's happening…")
  - Emoji input (default value: `📅`)
  - Submit button → `POST /api/itinerary` with `itinerary_type` set to the active tab
- Inline error display per row (same pattern as `ChallengeEditor.tsx`)

#### `components/HostItineraryPage.tsx`

Separate client component (mirrors `HostPackingPage.tsx`).

- Renders `HostNavigation` with `currentPage="itinerary"`
- Renders `ItineraryEditor` as the main content
- Page title: "📋 Itinerary Manager"

#### `app/[token]/host/itinerary/page.tsx`

Server route. Validates the host token (same pattern as `app/[token]/host/packing/page.tsx`). Renders `HostItineraryPage`.

#### `components/ItineraryView.tsx`

Participant-facing itinerary display. Props: `type: 'summary' | 'day-1' | 'day-2'`, `collapsible?: boolean`.

- Fetches items via `GET /api/itinerary?type={type}` using SWR (refreshInterval: 60000)
- Items rendered as a vertical timeline list, modelled on the schedule section in `TeamActivity.tsx`:
  - Each item: `border-l-4` left-bordered row with colored border
  - Emoji displayed to the left
  - Bold time (`HH:mm`) + text on the right
  - Summary items also show the date (`MMM d`)
- **Current/next item highlight**: Compare each item's datetime to `Date.now()`:
  - Past items: dimmed (opacity-50)
  - Current or next upcoming item: accent border color (blue-500) + slight background highlight
  - Future items: normal styling
- When `collapsible` is true (used during day-1/day-2):
  - Renders inside a toggleable section with a chevron header: "📋 Today's Schedule"
  - Collapsed by default
  - Expanding reveals the full timeline
- Loading state: skeleton shimmer
- Empty state: "No schedule items yet"

### 2. Modified Files

#### `components/HostDashboard.tsx`

Add a new card in the quick-access grid (after the Packing Lists card):

```tsx
<Link
  href={`/${token}/host/itinerary`}
  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-indigo-500"
>
  <div className="text-4xl mb-4">📋</div>
  <h3 className="text-xl font-bold text-gray-800 mb-2">Itinerary</h3>
  <p className="text-gray-600 mb-4">
    Manage trip summary and daily schedules. Add times, activities, and highlights for each day.
  </p>
  <div className="text-indigo-600 font-medium">Open Itinerary →</div>
</Link>
```

#### `components/HostNavigation.tsx`

- Add `'itinerary'` to the `currentPage` union type
- Add an Itinerary nav link (emoji: 📋) after the Meet-up link

#### `app/[token]/[participant]/ParticipantPageClient.tsx`

- Import `ItineraryView`
- In the `flight` state block: add `<ItineraryView type="summary" />` below `FlightInfo`
- In the `day-1` state block: add `<ItineraryView type="day-1" collapsible />` after `VotingInterface` (below all zone game content)
- In the `day-2` state block: add `<ItineraryView type="day-2" collapsible />` after `VotingInterface`

#### `components/ParticipantPreview.tsx`

Add a new preview section for itineraries (between the Flight and Activity sections):

```tsx
<div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
  <h3 className="font-bold text-indigo-800 mb-3 flex items-center">
    <span className="mr-2">📋</span>
    Itinerary Components
  </h3>
  <div className="space-y-4">
    <div className="bg-white p-3 rounded border">
      <h4 className="font-medium text-gray-800 mb-2">Trip Summary</h4>
      <ItineraryView type="summary" />
    </div>
    <div className="bg-white p-3 rounded border">
      <h4 className="font-medium text-gray-800 mb-2">Day 1 Schedule</h4>
      <ItineraryView type="day-1" />
    </div>
    <div className="bg-white p-3 rounded border">
      <h4 className="font-medium text-gray-800 mb-2">Day 2 Schedule</h4>
      <ItineraryView type="day-2" />
    </div>
  </div>
</div>
```

### 3. Verification

1. Create itinerary items via host page for all three types — verify they appear in participant view for the correct state only
2. Confirm day-1/day-2 itineraries are collapsed by default and expand on tap
3. Confirm summary itinerary appears only during `flight` state (not `flight-home`)
4. Confirm items are sorted by datetime ASC
5. Confirm current/next item is highlighted with accent styling
6. Confirm empty state message shows when no items exist for a type
7. Confirm the host Itinerary card and nav link work correctly
