# Enhanced Destination Guessing with City Selection & Distance Ranking

## Overview

Transform the current free-text destination guessing system into a comprehensive ranking feature with predefined city selection, distance calculation, and leaderboard functionality. Participants select from a searchable list of world cities, hosts set the correct destination, and the system automatically calculates proximity-based rankings.

## Current State

**Free-Text Input**: Participants can enter any text as their destination guess
**No Ranking System**: Guesses are stored but there's no way to determine winners
**No Host Control**: No mechanism for hosts to specify the correct destination
**Basic Storage**: Simple table with participant_id, guess, and timestamp

## Target Functionality

### Participant Experience
- **City Selector**: Replace free-text input with searchable dropdown of world cities
- **Autocomplete Search**: Type to filter cities with population > 100K
- **City Selection**: Select specific city (e.g., "Oslo, Norway") from predefined list
- **Active Guess Tracking**: Only the most recent guess counts for ranking
- **Guess History**: Previous guesses remain visible but don't affect scoring

### Host Experience
- **Destination Setting**: Hosts can select the correct destination from same city list
- **Distance Calculation**: Button to calculate all participant distances from correct destination
- **Leaderboard Generation**: System ranks participants by proximity to correct answer
- **Results Management**: View rankings and participant accuracy

## Database Architecture

### Current Table: `destination_guesses`
```sql
CREATE TABLE destination_guesses (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    guess TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Required Database Alterations

#### Option 1: Extend Existing Table (Recommended)
```sql
-- Clear existing data
DELETE FROM destination_guesses;

-- Add new columns to existing table
ALTER TABLE destination_guesses ADD COLUMN city_name TEXT;
ALTER TABLE destination_guesses ADD COLUMN country TEXT;
ALTER TABLE destination_guesses ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE destination_guesses ADD COLUMN longitude DECIMAL(11,8);
ALTER TABLE destination_guesses ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE destination_guesses ADD COLUMN distance_km DECIMAL(10,2);
ALTER TABLE destination_guesses ADD COLUMN is_correct_destination BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_destination_guesses_active ON destination_guesses(participant_id, is_active);
CREATE INDEX idx_destination_guesses_correct ON destination_guesses(is_correct_destination);
```

#### Table Structure After Enhancement:
- `id` (existing) - Primary key
- `participant_id` (existing) - Participant identifier  
- `guess` (existing) - Original free-text guess (for backward compatibility)
- `created_at` (existing) - Timestamp
- `city_name` (new) - Standardized city name (e.g., "Oslo")
- `country` (new) - Country name (e.g., "Norway")
- `latitude` (new) - City coordinates for distance calculation
- `longitude` (new) - City coordinates for distance calculation
- `is_active` (new) - Whether this is the participant's current active guess
- `distance_km` (new) - Calculated distance from correct destination
- `is_correct_destination` (new) - True if this row represents the host-set correct answer

### Data Management Strategy
1. **Backward Compatibility**: Keep existing `guess` column for historical data
2. **Active Guess Logic**: Only one `is_active = true` per participant
3. **Correct Destination**: One row with `is_correct_destination = true` for the application
4. **Distance Calculation**: Populate `distance_km` when host triggers calculation

## World Cities Data Integration

### Recommended Package: `world-cities`
```bash
npm install world-cities
```

**Features**:
- 44,000+ cities worldwide
- Population filtering (>100K easily achievable)
- Coordinates included for distance calculation
- Country information included
- Regular updates and maintenance

### Alternative Packages:
1. **`cities.json`** - Simple JSON file with city data
2. **`country-state-city`** - Comprehensive location data
3. **Custom GeoNames API** - Direct API integration (requires API key)

### Implementation Approach:
```typescript
// Example city data structure
interface CityData {
  name: string;
  country: string;
  population: number;
  latitude: number;
  longitude: number;
}

// Filter cities by population > 100K
const majorCities = worldCities.filter(city => city.population > 100000);
```

## Component Architecture

### Enhanced Components Required:

#### 1. **CitySelector Component**
- Location: `components/CitySelector.tsx`
- Purpose: Searchable dropdown for city selection
- Features: Autocomplete, filtering, city display with country

#### 2. **Enhanced DestinationGuess Component**
- Modify existing: `components/DestinationGuess.tsx`
- Purpose: Replace text input with CitySelector
- Features: Active guess display, guess history, city-based submission

#### 3. **DestinationControl Component** (Host)
- Location: `components/DestinationControl.tsx`
- Purpose: Host interface for setting correct destination and calculating results
- Features: City selection, distance calculation trigger, leaderboard display

#### 4. **DistanceCalculator Utility**
- Location: `utils/distanceCalculator.ts`
- Purpose: Calculate distances between coordinates
- Features: Haversine formula implementation for accurate distance calculation

## API Endpoints

### Enhanced Existing Endpoints:

#### POST `/api/destination-guesses`
**Enhanced Request Body:**
```json
{
  "participantId": "emilie",
  "cityName": "Oslo",
  "country": "Norway", 
  "latitude": 59.9139,
  "longitude": 10.7522
}
```

### New Endpoints Required:

#### POST `/api/destination-control/set-correct`
Set the correct destination (host only).
```json
{
  "cityName": "Prague",
  "country": "Czech Republic",
  "latitude": 50.0755,
  "longitude": 14.4378
}
```

#### POST `/api/destination-control/calculate-distances`
Calculate distances and generate leaderboard.
```json
{}
```

#### GET `/api/destination-control/leaderboard`
Get ranked leaderboard.

## Distance Calculation Logic

### Haversine Formula Implementation:
```typescript
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  // Implementation returns distance in kilometers
}
```

### Calculation Workflow:
1. Host sets correct destination coordinates
2. System retrieves all active participant guesses  
3. Calculate distance from each guess to correct destination
4. Update `distance_km` column for all active guesses
5. Generate leaderboard ordered by distance (ascending)

## Testing Strategy

### Component Tests:
- CitySelector autocomplete and selection functionality
- DestinationGuess integration with city selection
- DestinationControl host interface validation

### API Tests:
- Enhanced destination submission with city data
- Correct destination setting (host authorization)
- Distance calculation accuracy and leaderboard generation

### Integration Tests:
- End-to-end workflow: participant selection → host setup → distance calculation → leaderboard
- Active guess management (ensuring only one active guess per participant)

## Definition of Done

- [ ] World cities package integrated with population filtering (>100K)
- [ ] Database table enhanced with city coordinates and ranking columns
- [ ] CitySelector component with autocomplete search functionality
- [ ] DestinationGuess component converted to city selection interface
- [ ] DestinationControl component for host management
- [ ] Distance calculation utility with Haversine formula
- [ ] Enhanced API endpoints for city-based guesses and host controls
- [ ] Active guess management (one active guess per participant)
- [ ] Distance calculation and leaderboard generation functionality
- [ ] Backward compatibility maintained with existing free-text guesses
- [ ] Comprehensive test coverage for new city selection functionality
- [ ] Host interface integrated into HostControls section
- [ ] Database migration strategy for existing data

## Technical Considerations

### Data Migration:
- Existing free-text guesses remain in `guess` column
- New city-based guesses populate structured columns
- Migration script to attempt parsing existing guesses to cities (optional)

### Performance:
- City data cached in memory for fast autocomplete
- Database indexes on active guesses and session tokens
- Efficient distance calculation with bulk updates

### User Experience:
- Progressive enhancement: if city not found, fallback to free-text
- Clear indication of active vs. historical guesses
- Intuitive city search with country context

## Dependencies

This issue should be implemented **after** completing [host-interface-restructure.md](./host-interface-restructure.md) to ensure DestinationControl component can be properly integrated into the HostControls section.

## Future Considerations

The leaderboard animation and visual presentation will be addressed in a separate issue focused on results display and user engagement features.

## Implementation Decisions & Clarifications

### Session Management
- **Decision**: Single-use application - no session token management needed
- **Rationale**: One trip, one set of guesses per participant
- **Implementation**: Remove `session_token` column from database schema
- **Active Guess**: Only one active guess per participant (no session filtering needed)

### Host Authorization
- **Decision**: No authentication middleware required
- **Rationale**: Privately deployed, all hosts trusted
- **Implementation**: Host endpoints can rely on participant ID without verification
- **Note**: Hosts identified by their role in `data/participants.ts`

### City Data Loading Strategy
- **Phase 1**: Load all cities client-side (simple implementation)
- **Phase 2**: Implement progressive loading with alphabetical pre-load + dynamic search
- **Bundle Size**: Accept larger initial bundle for Phase 1, optimize in Phase 2
- **UX**: Immediate search without API calls initially

### Data Migration
- **Decision**: Clear existing database data before schema update
- **Rationale**: Nothing deployed to production yet
- **Action**: Run `DELETE FROM destination_guesses;` before deploying new schema
- **No Migration Script Needed**: Fresh start with enhanced schema

### Leaderboard Display
- **Decision**: Deferred to future iteration
- **Current Scope**: Focus on city selection and data capture
- **Future Work**: Distance calculation and leaderboard visualization in separate phase

### Development Mode
- **Phase 1 Priority**: City search and selection functionality
- **Phase 2**: Distance calculation and scoring logic
- **Dev Mode**: Continue using existing mock data patterns for both phases

### UX Design Decisions

#### City Display Format
- **Previous Guesses**: Display as "City, Country" with timestamp
- **Active Guess Indicator**: Show badge/label "Current Guess" on most recent
- **Visual Distinction**: Lighter text/subtle styling for inactive guesses
- **Active Guess Display**: Show "Currently guessing: [City, Country]" above selector

#### CitySelector Behavior
- **Post-Selection**: Keep selected city visible in input field
- **Search Activation**: Start filtering after 2 characters typed
- **Results Display**: Show top 20 matching cities in dropdown
- **Display Format**: "City, Country" with country in lighter text
- **No Flags**: Text-only for simplicity in Phase 1
- **Dropdown Height**: Max 400px with scroll for overflow

#### Guess Replacement
- **No Confirmation**: Instant submission with automatic replacement
- **Feedback**: Success message "Guess updated to [City]"
- **Previous Guess**: Automatically moved to inactive history
- **Loading State**: Disable selector during submission

### Database Schema Updates

**Updated ALTER TABLE statements** (session_token removed):
```sql
-- Clear existing data
DELETE FROM destination_guesses;

-- Add new columns to existing table
ALTER TABLE destination_guesses ADD COLUMN city_name TEXT;
ALTER TABLE destination_guesses ADD COLUMN country TEXT;
ALTER TABLE destination_guesses ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE destination_guesses ADD COLUMN longitude DECIMAL(11,8);
ALTER TABLE destination_guesses ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE destination_guesses ADD COLUMN distance_km DECIMAL(10,2);
ALTER TABLE destination_guesses ADD COLUMN is_correct_destination BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_destination_guesses_active ON destination_guesses(participant_id, is_active);
CREATE INDEX idx_destination_guesses_correct ON destination_guesses(is_correct_destination);
```

### Testing Strategy

#### Unit Tests
- **CitySelector Component**: Search filtering, selection handling, clear functionality
- **cityData Utility**: Population filtering, data structure validation
- **API Route Logic**: Request validation, database interaction mocking

#### Integration Tests
- **DestinationGuess Component**: Full flow with CitySelector integration
- **API Endpoints**: POST/GET with real database service mocks
- **Active Guess Logic**: Verify only one active guess per participant

#### End-to-End Test
- **Complete User Journey**: 
  1. Participant searches for city
  2. Selects city from dropdown
  3. Submits guess
  4. Verifies active guess displayed
  5. Submits second guess
  6. Verifies first guess moved to history
  7. Verifies second guess marked active

## Implementation Phases

### Phase 1: City Selection Foundation ⭐ (Current Focus)
**Goal**: Replace free-text input with functional city selector

**Estimated Effort**: 8-12 hours

#### 1.1 City Data Setup (1-2 hours)
- Install `world-cities` package: `npm install world-cities`
- Create `utils/cityData.ts`:
  - Import and filter cities by population > 100K
  - Export `City` interface with name, country, latitude, longitude
  - Export `getMajorCities()` function returning filtered array
  - Sort cities alphabetically by name

#### 1.2 CitySelector Component (3-4 hours)
- Create `components/CitySelector.tsx`:
  - Searchable input field with dropdown
  - Filter cities after 2+ characters typed
  - Display top 20 results in scrollable dropdown
  - Format: "City, Country" with styled country text
  - Handle selection, clear, keyboard navigation
  - Loading/disabled states
- Create `__tests__/CitySelector.test.tsx`:
  - Test search filtering (2 char minimum)
  - Test city selection callback
  - Test keyboard navigation (up/down/enter)
  - Test clear functionality

#### 1.3 Database Schema Update (30 min)
- Execute schema alterations on database:
  - Clear existing data: `DELETE FROM destination_guesses;`
  - Add columns: city_name, country, latitude, longitude, is_active, distance_km, is_correct_destination
  - Create indexes
- Update `lib/schema.sql` with complete table definition
- Update TypeScript interface in `lib/db.ts`:
  ```typescript
  interface DestinationGuess {
    id: number;
    participant_id: string;
    guess: string | null;
    city_name: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
    distance_km: number | null;
    is_correct_destination: boolean;
    created_at: string;
  }
  ```

#### 1.4 Database Service Enhancement (1-2 hours)
- Update `DatabaseService` class in `lib/db.ts`:
  - Modify `saveDestinationGuess()` to accept city data parameters
  - Add active guess logic: Set previous guesses to `is_active = false`
  - Update `getDestinationGuessesByParticipant()` to order by created_at DESC
  - Update `initializeDestinationGuessesTable()` with new columns
- Add dev mode mock data with city fields

#### 1.5 Update DestinationGuess Component (2-3 hours)
- Modify `components/DestinationGuess.tsx`:
  - Replace text input with `<CitySelector />`
  - Add "Currently guessing:" display above selector
  - Update form submission to send city object
  - Update previous guesses display:
    - Show "City, Country" format
    - Add "Current Guess" badge on active guess
    - Style inactive guesses with lighter text
  - Handle null city_name for backward compatibility
- Update `__tests__/DestinationGuess.test.tsx`:
  - Update all tests for CitySelector integration
  - Test active guess display
  - Test guess replacement flow
  - Mock city selection interactions

#### 1.6 API Endpoint Enhancement (1-2 hours)
- Update `app/api/destination-guesses/route.ts`:
  - Modify POST handler to accept city data in request body
  - Validate city fields (cityName, country, latitude, longitude required)
  - Update database call with new parameters
  - Maintain dev mode with mock city data
  - Update GET handler to return all columns
- Update `app/api/destination-guesses/[participant]/route.ts`:
  - Return city columns in response
  - Update dev mode mock data
- Write API tests:
  - Test POST with city data
  - Test active guess logic (only one active per participant)
  - Test GET returns city information
  - Test validation errors

#### 1.7 End-to-End Testing (1 hour)
- Create E2E test covering complete flow:
  - Participant opens page
  - Types in city selector (triggers search)
  - Selects city from dropdown
  - Submits guess
  - Verifies "Currently guessing" display
  - Submits second guess
  - Verifies first guess in history with lighter styling
  - Verifies second guess marked as current

**Phase 1 Definition of Done**:
- ✅ City selector with search and autocomplete working
- ✅ Database updated with city columns
- ✅ Active guess logic implemented (one active per participant)
- ✅ Previous guesses display city names with active indicator
- ✅ API endpoints handle city data
- ✅ All tests passing (unit, integration, E2E)
- ✅ Dev mode functional with mock city data

---

### Phase 2: Progressive City Loading (Future Optimization)
**Goal**: Improve performance with on-demand city data loading

**Estimated Effort**: 4-6 hours

#### Tasks:
- Create API endpoint `/api/cities/search?q={query}` for server-side filtering
- Pre-load first 100 cities alphabetically in CitySelector
- Implement debounced API calls for additional cities
- Add loading indicator during API fetch
- Update tests for async city loading

**Benefits**:
- Smaller initial bundle size
- Faster page load
- Scalable for larger city datasets

---

### Phase 3: Distance Calculation & Scoring (Future Feature)
**Goal**: Enable host destination setting and participant ranking

**Estimated Effort**: 6-8 hours

#### Tasks:
- Create `utils/distanceCalculator.ts` with Haversine formula
- Create `components/DestinationControl.tsx` for host interface
- Add API endpoints:
  - POST `/api/destination-control/set-correct`
  - POST `/api/destination-control/calculate-distances`
  - GET `/api/destination-control/leaderboard`
- Implement distance calculation workflow
- Update DatabaseService with distance methods
- Write comprehensive tests for distance calculations

---

### Phase 4: Leaderboard Visualization (Future Enhancement)
**Goal**: Display rankings with engaging UI

**Estimated Effort**: 4-6 hours

#### Tasks:
- Design leaderboard component with rankings
- Add animations for reveal effect
- Display participant names with distances
- Show medal/trophy icons for top 3
- Integrate into host and participant views
- Create state for "results revealed"

---

## Phase 1 Implementation Checklist

Use this checklist to track Phase 1 progress:

- [ ] Install `world-cities` package
- [ ] Create `utils/cityData.ts` with filtered cities (>100K population)
- [ ] Create `components/CitySelector.tsx` with search and autocomplete
- [ ] Write CitySelector component tests
- [ ] Execute database schema alterations (clear data + add columns)
- [ ] Update `lib/schema.sql` with complete table definition
- [ ] Update TypeScript `DestinationGuess` interface in `lib/db.ts`
- [ ] Update `DatabaseService.saveDestinationGuess()` with city parameters
- [ ] Implement active guess logic in database service
- [ ] Update dev mode mock data with city fields
- [ ] Modify `DestinationGuess.tsx` to use CitySelector
- [ ] Add "Currently guessing" display
- [ ] Update previous guesses display with active indicator
- [ ] Update DestinationGuess component tests
- [ ] Update POST `/api/destination-guesses` to handle city data
- [ ] Update GET endpoints to return city columns
- [ ] Write API tests for city data submission
- [ ] Write E2E test for complete guess flow
- [ ] Verify all tests passing
- [ ] Manual testing in dev mode
- [ ] Manual testing with real database connection