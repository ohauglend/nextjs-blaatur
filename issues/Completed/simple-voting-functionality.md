# Simple Mobile Voting Interface

## Requirements

### Core Functionality

- Single question: "Most Drunk Last Night - Who had the most fun with drinks yesterday?"
- Display all participants (including self) in single column layout
- One-time voting with immediate "You voted for:" confirmation
- Vote persistence (localStorage for dev, API ready)

### Mobile Design

- Single column layout with larger photos (64x64px)
- Touch-friendly spacing and interactions
- Single submit button (bottom only)
- No host indicators or role badges

### Visual Feedback

- Blue selection state (border + background)
- Green completion state for submitted vote
- Disabled state after voting
- Clean photo grid with participant names

### Technical

- TypeScript + React 19 + Next.js 15
- Comprehensive test coverage
- Integration with existing participant system
- Error handling and loading states

## Definition of Done

- All tests passing
- Mobile browser functional
- No console errors
- Integrated into Day 1/Day 2 states