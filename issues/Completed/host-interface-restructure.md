# Host Interface Restructure

## Overview

Transform the current single HostOverview component into a structured three-screen host experience that provides clear separation of concerns and improved usability for trip hosts. **This issue also addresses critical access control vulnerabilities where participants can currently access host functionality through the root URL.**

## Current State

**Single HostOverview Component**: All host functionality is currently contained within one component, mixing viewing, monitoring, and administrative functions. Currently shown below StateControl when hosts visit their participant URLs.

**Security Vulnerability**: Participants can navigate to the root URL (`/`) and access host controls, view other participant screens, and see administrative functions they shouldn't have access to. **All participant tokens are exposed in the DOM**, allowing anyone to access any participant page.

**Broken Landing Page**: The root URL contains a host control panel with non-functional decorative "Quick Actions" and exposes all participant tokens to anyone who navigates there.

## Target Architecture

### Three-Screen Host Experience

#### 1. **Host Dashboard** (Overview)
- **Purpose**: High-level view of all trip components and status with navigation
- **Content**: Simple cards showing current state and links to other screens
- **Features**: 
  - Display current trip state
  - Simple status cards for trip features
  - Link to Participant Preview screen
  - Link to Host Controls screen
  - No navigation persistence (always loads dashboard by default)

#### 2. **Participant Preview** (All Tiles View)
- **Purpose**: View all participant components/tiles to see what's upcoming
- **Content**: Generic preview showing all trip tiles organized in color-coded sections
- **Features**:
  - Displays all existing participant tiles in one view
  - Shows components regardless of current state (preview of full trip journey)
  - Useful for hosts to see what's coming up
  - Read-only view (informational only)
  - Similar to current HostOverview layout with color-coded sections

#### 3. **Host Controls** (Administrative)
- **Purpose**: Administrative functions and content management
- **Content**: All host-specific configuration and management tools
- **Features**:
  - State progression controls (StateControl component)
  - Vote session creation and management (from [more-comprehensive-voting-system.md](./more-comprehensive-voting-system.md))
  - Packing list editing and updates (future)
  - Participant management (future)
  - Trip settings and configuration (future)

## Component Architecture

### New Components Required

1. **HostDashboard Component**
   - Location: `components/HostDashboard.tsx`
   - Purpose: Main overview screen with simple status cards and links to other screens
   - Content: Current state display + simple cards with links (no complex features)

2. **ParticipantPreview Component**
   - Location: `components/ParticipantPreview.tsx`
   - Purpose: Preview all participant tiles/components
   - Content: Renders all trip components in one view with color-coded sections (similar to current HostOverview)
   - Note: Generic view showing what's upcoming, not tied to specific participant

3. **HostControls Component**
   - Location: `components/HostControls.tsx`
   - Purpose: Administrative functions and content management
   - Content: StateControl + future admin features

4. **HostNavigation Component**
   - Location: `components/HostNavigation.tsx`
   - Purpose: Simple link-based navigation between host screens
   - Note: No persistence - always defaults to dashboard

### New Routes Required

1. **Host Dashboard Route**
   - Location: `app/[token]/host/page.tsx`
   - Purpose: Default host landing page
   - Validation: Check token belongs to host participant (oskar, odd, aasmund)

2. **Host Preview Route**
   - Location: `app/[token]/host/preview/page.tsx`
   - Purpose: All tiles preview screen
   - Validation: Same token validation as dashboard

3. **Host Controls Route**
   - Location: `app/[token]/host/controls/page.tsx`
   - Purpose: Administrative controls screen
   - Validation: Same token validation as dashboard

### Modified Components

- **HostOverview Component**: Content split into ParticipantPreview (will become deprecated)
- **StateControl Component**: Moved into HostControls component
- **ParticipantPageClient**: Keep showing HostOverview for hosts (hosts are also participants), add link to host interface

### Modified Routes

- **Root Page** (`app/page.tsx`): Replace with simple "No access" message (no token exposure)
- **Host Participant Pages** (`/[hostToken]/[hostParticipant]`): Continue showing their participant view + link to `/[hostToken]/host` interface

## Navigation Flow

```
/[hostToken]/host
├── /[hostToken]/host (HostDashboard - default)
│   ├── Link to /[hostToken]/host/preview
│   └── Link to /[hostToken]/host/controls
├── /[hostToken]/host/preview (ParticipantPreview - all tiles)
└── /[hostToken]/host/controls (HostControls - StateControl + admin)

No navigation persistence - always loads to dashboard
```

## State Management

### Host Screen State
- Use URL-based navigation (Next.js Link components) for screen switching
- No navigation persistence needed (always defaults to dashboard on load)
- No need to maintain cross-screen state (manual refresh approach)
- Form data in HostControls can use browser localStorage if needed

### Participant Preview State
- No state needed - renders all components in generic view
- Shows full trip journey regardless of current state
- Read-only informational display

## User Experience Goals

### Improved Organization
- Clear separation between overview (Dashboard), preview (all tiles), and administration (Controls)
- Reduced cognitive load by grouping related functionality
- Simple link-based navigation between host responsibilities

### Better Testing Capability
- Hosts can see all upcoming trip components in preview
- View what participants will experience throughout trip
- Validate components and content before they go live

### Scalable Architecture
- New administrative features can be added to HostControls
- Dashboard can accommodate new status indicators
- Preview automatically shows new participant components

## Technical Considerations

### Access Control and Security (URL-Based, No Authentication)

**No Authentication System Required** - Uses existing GUID token security model:

- **Root URL Protection**: Replace current host control panel at `/` with simple "No access" message to prevent token leakage
- **Host URL Pattern**: Hosts access interface via `/[hostToken]/host/*` using their existing participant tokens
- **Token Validation**: Reuse existing `parseSecureUrl()` logic from participant routes, extended to validate `/[token]/host` routes
- **Host Identification**: Check if token belongs to host participant (oskar, odd, aasmund) using existing participant data structure
- **Participant Isolation**: Guests continue accessing only their own `/[guestToken]/[participant]` URLs
- **No Sessions/Cookies**: Pure URL-based security, no additional auth infrastructure needed
- **Host as Participant**: Hosts can still access their participant view at `/[hostToken]/[hostId]` (they are participants too)

### URL Structure

**Updated Structure**:
- `/` - Simple "No access" page (no token exposure, no functionality, no links)
- `/[guestToken]/[participant]` - Guest participant pages (existing, unchanged)
- `/[hostToken]/[hostId]` - Host participant pages (existing, unchanged) + link to host interface
- `/[hostToken]/host` - Host Dashboard (default) - **Host tokens only**
- `/[hostToken]/host/preview` - Participant Preview (all tiles) - **Host tokens only**
- `/[hostToken]/host/controls` - Host Controls - **Host tokens only**

**Example URLs**:
- Root: `https://nextjs-blaatur.vercel.app/` → "No access" message
- Guest: `https://nextjs-blaatur.vercel.app/6ba7b810-9dad-11d1-80b4-00c04fd430c8/emilie`
- Host as Participant: `https://nextjs-blaatur.vercel.app/f47ac10b-58cc-4372-a567-0e02b2c3d479/oskar` (with link to host interface)
- Host Dashboard: `https://nextjs-blaatur.vercel.app/f47ac10b-58cc-4372-a567-0e02b2c3d479/host`
- Host Preview: `https://nextjs-blaatur.vercel.app/f47ac10b-58cc-4372-a567-0e02b2c3d479/host/preview`
- Host Controls: `https://nextjs-blaatur.vercel.app/f47ac10b-58cc-4372-a567-0e02b2c3d479/host/controls`

### Data Flow and State Management

- **Navigation**: Next.js Link components with token passed in URL
- **State Updates**: Manual page refresh after state changes (existing StateControl behavior)
- **Cross-Screen Data**: No persistence needed - each screen fetches data independently
- **Integration**: Uses existing participant data, state management (localStorage + utils), and timeline systems
- **No Persistence**: Navigation always defaults to dashboard (no localStorage of active tab)

### Participant Preview Implementation

- **Generic View**: Shows all trip components/tiles in one scrollable view
- **Color-Coded Sections**: Maintains existing HostOverview organization (Pre-Trip, Packing, Flight, Activities, etc.)
- **Upcoming Features**: Allows hosts to see what's coming up for participants
- **All States Visible**: Renders components regardless of current trip state
- **Read-Only Mode**: No modification capabilities in preview (informational only)
- **Implementation**: Reuse existing HostOverview component logic (all tiles in organized sections)

### Error Handling

- **Invalid Host Token**: Return 404 if token doesn't belong to a host participant
- **Missing Token**: `/host` without token returns 404
- **Navigation Issues**: Standard Next.js error boundaries
- **Data Fetch Failures**: Show error messages in respective screen sections

### Responsive Design

- Host screens optimized for desktop/tablet use (hosts likely use laptop)
- Participant Preview renders tiles in organized layout with color-coded sections
- Consistent design language across all host screens
- Simple navigation links (no complex tab system)

### Performance

- Each route fetches only data it needs
- Participant Preview renders all components (similar to current HostOverview)
- Manual refresh approach (no real-time sync complexity)
- Static generation where possible
- No navigation state persistence overhead

## Implementation Steps

1. **Secure Root URL**
   - Replace `app/page.tsx` content with simple "No access" message
   - Remove all token references, participant links, and Quick Actions

2. **Create Host Route Structure**
   - Create `app/[token]/host/page.tsx` with token validation for host-only
   - Create `app/[token]/host/preview/page.tsx`
   - Create `app/[token]/host/controls/page.tsx`
   - Add validation logic to check token belongs to host participant (oskar, odd, aasmund)

3. **Build Host Components**
   - Create `HostNavigation.tsx` with simple link navigation (no persistence)
   - Create `HostDashboard.tsx` with simple status cards, current state display, and links to other screens
   - Create `ParticipantPreview.tsx` - migrate HostOverview content here (all tiles view with color-coded sections)
   - Create `HostControls.tsx` with StateControl and placeholder for future admin features

4. **Update Existing Components**
   - Keep `ParticipantPageClient.tsx` showing HostOverview for hosts (hosts are participants)
   - Add link to host interface (`/[token]/host`) for host participants (placement doesn't matter)
   - Move StateControl into HostControls component
   - Ensure guest experience unchanged

5. **Test and Validate**
   - Verify root URL shows no sensitive information, just "No access" message
   - Confirm host URLs require valid host tokens (oskar, odd, aasmund)
   - Test navigation between host screens with manual refresh
   - Validate hosts can still access their participant view at `/[token]/[hostId]`
   - Verify link to host interface appears on host participant pages

## Definition of Done

- [ ] Three-screen host architecture implemented
- [ ] HostDashboard with simple status cards, current state, and navigation links
- [ ] ParticipantPreview with all tiles view in color-coded sections (reuse HostOverview layout)
- [ ] HostControls with StateControl and administrative functions
- [ ] HostNavigation component with simple link-based screen navigation (no persistence)
- [ ] VoteConfiguration moved into HostControls section
- [ ] **Root URL secured**: No token leakage, simple "No access" message
- [ ] **Host URL validation**: Only host tokens can access `/[token]/host/*` routes
- [ ] **Participant isolation**: Guests restricted to their own URLs
- [ ] **Token-based security**: Reuses existing GUID token security model (no auth needed)
- [ ] **Host as participant**: Hosts can still access their participant pages with link to host interface
- [ ] No navigation persistence (always defaults to dashboard)
- [ ] Existing host functionality (HostOverview + StateControl) preserved in new structure
- [ ] Responsive design across all screens
- [ ] URL routing for host screen navigation with token validation
- [ ] No breaking changes to existing participant (guest) experience

## Dependencies

This issue should be implemented **after** completing [more-comprehensive-voting-system.md](./more-comprehensive-voting-system.md) to ensure VoteConfiguration component is available for integration into HostControls.