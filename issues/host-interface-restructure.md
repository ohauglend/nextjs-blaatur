# Host Interface Restructure

## Overview

Transform the current single HostOverview component into a structured three-screen host experience that provides clear separation of concerns and improved usability for trip hosts. **This issue also addresses critical access control vulnerabilities where participants can currently access host functionality through the root URL.**

## Current State

**Single HostOverview Component**: All host functionality is currently contained within one component, mixing viewing, monitoring, and administrative functions.

**Security Vulnerability**: Participants can navigate to the root URL (`localhost/`) and access host controls, view other participant screens, and see administrative functions they shouldn't have access to.

**Broken Landing Page**: The root URL contains host components and features that don't work properly, creating a poor user experience.

## Target Architecture

### Three-Screen Host Experience

#### 1. **Host Dashboard** (Overview)
- **Purpose**: High-level view of all trip components and status
- **Content**: Summary cards showing current state of each trip feature
- **Features**: 
  - Trip overview with participant count and current day
  - Quick status indicators for packing lists, voting sessions, activities
  - Recent activity feed or notifications
  - Navigation to other host screens

#### 2. **Participant Preview**
- **Purpose**: See the current state exactly as participants experience it
- **Content**: Real participant view without administrative controls
- **Features**:
  - Switch between different participant perspectives
  - View current day's activities and available features
  - Test participant workflows without administrative privileges
  - Responsive preview matching mobile participant experience

#### 3. **Host Controls** (Administrative)
- **Purpose**: Administrative functions and content management
- **Content**: All host-specific configuration and management tools
- **Features**:
  - Vote session creation and management (from [more-comprehensive-voting-system.md](./more-comprehensive-voting-system.md))
  - Packing list editing and updates
  - State progression controls
  - Participant management
  - Trip settings and configuration

## Component Architecture

### New Components Required

1. **HostDashboard Component**
   - Location: `components/HostDashboard.tsx`
   - Purpose: Main overview screen with status cards and navigation

2. **ParticipantPreview Component**
   - Location: `components/ParticipantPreview.tsx`
   - Purpose: Participant-view simulator for hosts

3. **HostControls Component**
   - Location: `components/HostControls.tsx`
   - Purpose: Administrative functions and content management

4. **HostNavigation Component**
   - Location: `components/HostNavigation.tsx`
   - Purpose: Navigation between host screens

### Modified Components

- **HostOverview Component**: Becomes orchestrator for three-screen experience
- **VoteConfiguration Component**: Moves into HostControls section

## Navigation Flow

```
HostOverview (Router)
├── HostDashboard (default)
├── ParticipantPreview
└── HostControls
    ├── Vote Management
    ├── Packing List Editor
    ├── State Controls
    └── Trip Settings
```

## State Management

### Host Screen State
- Track currently active host screen (dashboard/preview/controls)
- Maintain context when switching between screens
- Preserve form data in HostControls when navigating away

### Participant Preview State
- Simulate participant sessions without affecting real data
- Switch between different participant perspectives
- Maintain preview state separate from actual participant data

## User Experience Goals

### Improved Organization
- Clear separation between viewing, previewing, and administrative functions
- Reduced cognitive load by grouping related functionality
- Intuitive navigation between different host responsibilities

### Better Testing Capability
- Hosts can easily test participant experience
- Preview changes before they go live
- Validate workflows from participant perspective

### Scalable Architecture
- New administrative features can be added to HostControls
- Dashboard can accommodate new status indicators
- Preview can support new participant features

## Technical Considerations

### Access Control and Security
- **Root URL Protection**: Implement proper access control to prevent participants from accessing host functionality
- **Host Authentication**: Ensure only authorized hosts can access administrative functions (using existing session token or similar mechanism)
- **URL Routing**: Restructure routing so `/` redirects appropriately based on user role
- **Participant Isolation**: Participants should only access their own screens via `/[token]/[participant]` routes
- **Authentication Loss Handling**: Graceful degradation if host loses authentication while using interface

### URL Structure
- `/` - Redirects to appropriate interface based on user role
- `/host` - Host Dashboard (default) - **Host Only**
- `/host/preview` - Participant Preview - **Host Only**
- `/host/controls` - Host Controls - **Host Only**
- `/[token]/[participant]` - Participant interface - **Participants Only**

### Data Flow and State Management
- **Cross-Screen State**: Context/data sharing between the three host screens
- **State Persistence**: Maintain form data and context when switching screens
- **Real-time Updates**: Ensure consistent data across all host screens
- **Integration**: Connect with existing state management system and participant data structures

### Participant Preview Implementation
- **Data Simulation**: Use read-only access to real participant data without affecting actual state
- **State-Dependent Features**: Handle features like voting availability based on current trip state
- **Perspective Switching**: Allow hosts to preview different participant viewpoints
- **Mock vs Real Data**: Use real data in read-only mode for accurate preview experience

### Error Handling
- **Network Issues**: Fallback behavior when switching between screens fails
- **Screen Load Failures**: Graceful handling if specific screens fail to load
- **Authentication Issues**: Handle host authentication loss during interface use
- **Data Consistency**: Ensure data integrity across screen transitions

### Responsive Design
- All host screens optimized for desktop/tablet use
- Participant Preview maintains mobile-first responsive behavior
- Consistent design language across all host screens

### Performance
- Lazy loading for screen components
- Efficient data fetching per screen
- Minimal re-renders when switching screens

## Definition of Done

- [ ] Three-screen host architecture implemented
- [ ] HostDashboard with status overview and navigation
- [ ] ParticipantPreview with accurate participant simulation
- [ ] HostControls with administrative functions
- [ ] Navigation component with clear screen switching
- [ ] VoteConfiguration moved into HostControls section
- [ ] **Access control implemented**: Root URL properly secured
- [ ] **Host authentication**: Only hosts can access `/host/*` routes
- [ ] **Participant isolation**: Participants restricted to their own URLs
- [ ] **Broken landing page components fixed**: Replace/remove non-functional host features
- [ ] Existing host functionality preserved and enhanced
- [ ] Responsive design across all screens
- [ ] URL routing for host screen navigation with proper access control
- [ ] No breaking changes to existing participant experience

## Dependencies

This issue should be implemented **after** completing [more-comprehensive-voting-system.md](./more-comprehensive-voting-system.md) to ensure VoteConfiguration component is available for integration into HostControls.