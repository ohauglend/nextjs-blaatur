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
-- Add new columns to existing table
ALTER TABLE destination_guesses ADD COLUMN city_name TEXT;
ALTER TABLE destination_guesses ADD COLUMN country TEXT;
ALTER TABLE destination_guesses ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE destination_guesses ADD COLUMN longitude DECIMAL(11,8);
ALTER TABLE destination_guesses ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE destination_guesses ADD COLUMN distance_km DECIMAL(10,2);

-- Add correct destination columns
ALTER TABLE destination_guesses ADD COLUMN is_correct_destination BOOLEAN DEFAULT false;
ALTER TABLE destination_guesses ADD COLUMN session_token TEXT;

-- Create indexes for performance
CREATE INDEX idx_destination_guesses_active ON destination_guesses(participant_id, is_active);
CREATE INDEX idx_destination_guesses_session ON destination_guesses(session_token);
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
- `session_token` (new) - Links to current trip session

### Data Management Strategy
1. **Backward Compatibility**: Keep existing `guess` column for historical data
2. **Active Guess Logic**: Only one `is_active = true` per participant per session
3. **Correct Destination**: One row with `is_correct_destination = true` per session
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
  "longitude": 10.7522,
  "sessionToken": "current-session-id"
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
  "longitude": 14.4378,
  "sessionToken": "current-session-id"
}
```

#### POST `/api/destination-control/calculate-distances`
Calculate distances and generate leaderboard.
```json
{
  "sessionToken": "current-session-id"
}
```

#### GET `/api/destination-control/leaderboard?session={token}`
Get ranked leaderboard for session.

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