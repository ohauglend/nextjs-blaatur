# Zone Challenge Game — Issue #1: Data & Database Foundation

## Context Summary

This is the first of six issues implementing the Riga Zone Challenge Game: a location-based team game where participants explore Riga, claim geographic zones by physically visiting them, and complete challenges. This issue establishes all data definitions, database schema, and SQL seeds before any UI or API work begins.

Day 1 (before lunch): 4 teams of 2 (Red, Yellow, Blue, Green) explore and claim zones.
Day 2 (after lunch): Teams merge based on Day 1 scores. Drinking-focused challenges. Other teams can steal your zones.

This is the prerequisite issue for all other zone game issues. No other issue should begin until this one is complete.

## Scope

Define zones, challenges, and zone claims in the database. Establish TypeScript interfaces. This issue contains no UI and no API logic — purely data layer.

## Database Architecture

### Table 1: `zones`

**Purpose**: Store geographic zone definitions for Riga. Start with circle-based zones (center + radius). A `polygon_geojson` column is stubbed for a future upgrade to natural geographic shapes.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `name` (TEXT NOT NULL) — Human-readable zone name, e.g. "Freedom Monument"
- `center_lat` (DECIMAL(10,8) NOT NULL) — Latitude of zone center
- `center_lng` (DECIMAL(11,8) NOT NULL) — Longitude of zone center
- `radius_m` (INTEGER NOT NULL DEFAULT 50) — Radius in meters. 50m default. Not all zones need the same size.
- `polygon_geojson` (TEXT) — NULL for now. Future: GeoJSON polygon string for natural geographic shapes.
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

**Notes**:
- Zone sizes can vary. Larger landmarks (e.g. Central Market) warrant a larger radius than a single bar entrance.
- The `polygon_geojson` column is a forward-compatibility stub only; no logic should reference it in this issue.

### Table 2: `challenges`

**Purpose**: Store one challenge per zone per game phase. Each zone has two challenges: a Day 1 exploration challenge and a Day 2 drinking-focused challenge.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `zone_id` (INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE)
- `phase` (VARCHAR(10) NOT NULL CHECK (phase IN ('day1', 'day2')))
- `text` (TEXT NOT NULL) — The challenge instruction shown to participants
- `type` (VARCHAR(20) NOT NULL CHECK (type IN ('generic', 'geography'))) — `geography` = tied to the specific location; `generic` = could be done anywhere
- `participant_scope` (VARCHAR(10) NOT NULL DEFAULT 'team' CHECK (participant_scope IN ('team', 'one'))) — `team` = all members must participate; `one` = team picks one member to do it
- `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

**Constraint**: One challenge per zone per phase (UNIQUE on `zone_id, phase`).

### Table 3: `zone_claims`

**Purpose**: Track which team currently holds each zone in each phase, whether the challenge is completed, and whether the zone is steal-locked in Day 2.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `zone_id` (INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE)
- `team_color` (VARCHAR(10) NOT NULL CHECK (team_color IN ('red', 'yellow', 'blue', 'green')))
- `phase` (VARCHAR(10) NOT NULL CHECK (phase IN ('day1', 'day2')))
- `claimed_by_participant` (VARCHAR(50) NOT NULL) — Participant ID who triggered the claim
- `claimed_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())
- `completed` (BOOLEAN NOT NULL DEFAULT false) — True when team marks challenge done
- `completed_at` (TIMESTAMP WITH TIME ZONE)
- `steal_locked` (BOOLEAN NOT NULL DEFAULT false) — Day 2 only: true after a zone has been stolen once, preventing further steals
- `points_awarded` (BOOLEAN NOT NULL DEFAULT false) — True once the 1-point credit is confirmed

**Constraints**:
- UNIQUE on (`zone_id`, `phase`) — only one active claim per zone per phase. When a Day 2 steal occurs, the existing row is archived into `zone_claim_history`, then deleted and replaced by a new row for the stealing team with `steal_locked = true`.

### Table 4: `day2_team_assignments`

**Purpose**: Store the dynamically calculated Day 2 team merges. Generated at transition time based on Day 1 scores. The merge algorithm: fewest-points team joins the most-points team; second-fewest joins second-most.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `participant_id` (VARCHAR(50) NOT NULL) — References participant id
- `day1_team_color` (VARCHAR(10) NOT NULL) — Team color from Day 1
- `day2_team_color` (VARCHAR(10) NOT NULL CHECK (day2_team_color IN ('red', 'yellow'))) — Day 2 merged team (always resolves to 2 teams)
- `calculated_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

**UNIQUE** on `participant_id` — each participant has exactly one Day 2 assignment.

### Table 5: `team_locations`

**Purpose**: Store each participant's last known GPS position. Updated periodically by the client. Used by the host dashboard to show all team dots on a live map. The application is always-online, so this table is the source of truth for participant positions.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `participant_id` (VARCHAR(50) NOT NULL UNIQUE) — One row per participant, upserted on each location update
- `team_color` (VARCHAR(10) NOT NULL)
- `lat` (DECIMAL(10,8) NOT NULL)
- `lng` (DECIMAL(11,8) NOT NULL)
- `accuracy` (DECIMAL(10,2)) — GPS accuracy in metres, nullable
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

### Table 6: `zone_claim_history`

**Purpose**: Audit trail for zone claims. When a steal occurs in Day 2, the original claim is preserved here before a new row replaces it in `zone_claims`. This enables host review and point withdrawal.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `zone_id` (INTEGER NOT NULL REFERENCES zones(id))
- `team_color` (VARCHAR(10) NOT NULL)
- `phase` (VARCHAR(10) NOT NULL)
- `claimed_by_participant` (VARCHAR(50) NOT NULL)
- `claimed_at` (TIMESTAMP WITH TIME ZONE NOT NULL)
- `completed` (BOOLEAN NOT NULL DEFAULT false)
- `points_awarded` (BOOLEAN NOT NULL DEFAULT false)
- `stolen_by_team` (VARCHAR(10)) — Which team stole this zone, NULL if not stolen
- `archived_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

## TypeScript Interfaces

Create new file: `types/zones.ts`

```typescript
export type TeamColor = 'red' | 'yellow' | 'blue' | 'green';
export type GamePhase = 'day1' | 'day2';
export type ChallengeType = 'generic' | 'geography';

export interface Zone {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  polygon_geojson: string | null; // reserved for future polygon upgrade
}

export interface Challenge {
  id: number;
  zone_id: number;
  phase: GamePhase;
  text: string;
  type: ChallengeType;
  participant_scope: 'team' | 'one';
}

export interface TeamLocation {
  participant_id: string;
  team_color: TeamColor;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
}

export interface ZoneClaimHistory {
  id: number;
  zone_id: number;
  team_color: TeamColor;
  phase: GamePhase;
  claimed_by_participant: string;
  claimed_at: string;
  completed: boolean;
  points_awarded: boolean;
  stolen_by_team: TeamColor | null;
  archived_at: string;
}

export interface ZoneClaim {
  id: number;
  zone_id: number;
  team_color: TeamColor;
  phase: GamePhase;
  claimed_by_participant: string;
  claimed_at: string;
  completed: boolean;
  completed_at: string | null;
  steal_locked: boolean;
  points_awarded: boolean;
}

export interface ZoneWithClaim extends Zone {
  claim: ZoneClaim | null;
  challenge: Challenge | null;
}

export interface Day2TeamAssignment {
  participant_id: string;
  day1_team_color: TeamColor;
  day2_team_color: 'red' | 'yellow';
}
```

## SQL Seed Data

### Riga Zones (15–20 zones)

The following zones cover Riga Old Town (Vecrīga) and immediate surroundings. All coordinates are approximate centers; verify and adjust against OpenStreetMap before finalizing.

<!-- TODO: ask for more context — verify these coordinates are accurate before using in production. Cross-check each against OpenStreetMap (openstreetmap.org) or Google Maps. The radius for each zone should also be reviewed — larger landmarks like Central Market may need 80–100m while a single bar entrance may stay at 50m. -->

```sql
INSERT INTO zones (name, center_lat, center_lng, radius_m) VALUES
  ('Freedom Monument',          56.95120,  24.11330,  50),
  ('Doma Cathedral',            56.94920,  24.10380,  60),
  ('St. Peter''s Church',       56.94650,  24.10770,  50),
  ('Riga Castle',               56.95030,  24.09920,  70),
  ('Three Brothers',            56.94980,  24.10330,  40),
  ('Swedish Gate',              56.95070,  24.10190,  40),
  ('Powder Tower',              56.95200,  24.10660,  40),
  ('Laima Clock',               56.95060,  24.11200,  40),
  ('Livu Square',               56.94790,  24.10620,  60),
  ('Bastejkalns Park',          56.95310,  24.10740,  80),
  ('National Opera',            56.95070,  24.11050,  60),
  ('Black Magic Bar',           56.94700,  24.10450,  40),
  ('Riga Central Market',       56.94380,  24.11380, 100),
  ('Vansu Bridge Viewpoint',    56.95600,  24.10200,  50),
  ('Mentzendorff House',        56.94760,  24.10560,  40),
  ('Cat House',                 56.94950,  24.10580,  40),
  ('Konventa Seta',             56.94800,  24.10580,  50),
  ('Riga Art Nouveau District', 56.95820,  24.12840,  80),
  ('Esplanade Park',            56.95630,  24.11720,  80),
  ('Daugava Riverbank',         56.94700,  24.09800,  80);
```

### Challenges Seed

One `day1` and one `day2` challenge per zone. Day 1 = exploration/activity. Day 2 = drinking-focused.

`geography` type = challenge requires being at that specific location. `generic` = could be done anywhere but placed here thematically.

```sql
INSERT INTO challenges (zone_id, phase, text, type, participant_scope) VALUES
  -- Freedom Monument (zone 1)
  ((SELECT id FROM zones WHERE name = 'Freedom Monument'), 'day1', 'Take a team photo with the Freedom Monument. At least one person must strike a heroic pose.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Freedom Monument'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter B. Photo proof of beverages required.', 'generic', 'team'),

  -- Doma Cathedral (zone 2)
  ((SELECT id FROM zones WHERE name = 'Doma Cathedral'), 'day1', 'Find and photograph the oldest visible part of Doma Cathedral. Bonus: read the year aloud.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Doma Cathedral'), 'day2', 'One team member must finish a beverage beginning with the letter D. Team picks who drinks.', 'generic', 'one'),

  -- St. Peter''s Church (zone 3)
  ((SELECT id FROM zones WHERE name = 'St. Peter''s Church'), 'day1', 'Go to the top of St. Peter''s Church observation deck and take a photo of the view over Riga.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'St. Peter''s Church'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter P. Photo proof of beverages required.', 'generic', 'team'),

  -- Riga Castle (zone 4)
  ((SELECT id FROM zones WHERE name = 'Riga Castle'), 'day1', 'Photograph the official Latvian flag flying over Riga Castle.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Riga Castle'), 'day2', 'One team member must finish a beverage beginning with the letter R. Team picks who drinks.', 'generic', 'one'),

  -- Three Brothers (zone 5)
  ((SELECT id FROM zones WHERE name = 'Three Brothers'), 'day1', 'Photograph all three of the Three Brothers houses in a single shot. No cropping allowed.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Three Brothers'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter T. Photo proof of beverages required.', 'generic', 'team'),

  -- Swedish Gate (zone 6)
  ((SELECT id FROM zones WHERE name = 'Swedish Gate'), 'day1', 'Walk through the Swedish Gate. Take a photo from the inside looking out.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Swedish Gate'), 'day2', 'One team member must finish a beverage beginning with the letter S. Team picks who drinks.', 'generic', 'one'),

  -- Powder Tower (zone 7)
  ((SELECT id FROM zones WHERE name = 'Powder Tower'), 'day1', 'Count how many cannonballs are embedded in the Powder Tower walls and report the number to the host.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Powder Tower'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter W. Photo proof of beverages required.', 'generic', 'team'),

  -- Laima Clock (zone 8)
  ((SELECT id FROM zones WHERE name = 'Laima Clock'), 'day1', 'Take a photo at the Laima Clock showing the current time on your phone and the clock.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Laima Clock'), 'day2', 'One team member must finish a beverage beginning with the letter L. Team picks who drinks.', 'generic', 'one'),

  -- Livu Square (zone 9)
  ((SELECT id FROM zones WHERE name = 'Livu Square'), 'day1', 'Buy a coffee or snack sitting in Livu Square. Photo proof required.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Livu Square'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter C. Photo proof of beverages required.', 'generic', 'team'),

  -- Bastejkalns Park (zone 10)
  ((SELECT id FROM zones WHERE name = 'Bastejkalns Park'), 'day1', 'Find the canal in Bastejkalns park and take a photo with it in the background.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Bastejkalns Park'), 'day2', 'One team member must finish a beverage beginning with the letter G. Team picks who drinks.', 'generic', 'one'),

  -- National Opera (zone 11)
  ((SELECT id FROM zones WHERE name = 'National Opera'), 'day1', 'Impersonate an opera singer in front of the National Opera for a photo. Bonus points for dramatic pose.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'National Opera'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter M. Photo proof of beverages required.', 'generic', 'team'),

  -- Black Magic Bar (zone 12)
  ((SELECT id FROM zones WHERE name = 'Black Magic Bar'), 'day1', 'Try the Riga Black Balsam at Black Magic Bar. Photo of the glass as proof.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Black Magic Bar'), 'day2', 'One team member must finish a beverage beginning with the letter V. Team picks who drinks.', 'generic', 'one'),

  -- Central Market (zone 13)
  ((SELECT id FROM zones WHERE name = 'Riga Central Market'), 'day1', 'Buy a fridge magnet at Riga Central Market. Show the purchase to the host.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Riga Central Market'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter A. Photo proof of beverages required.', 'generic', 'team'),

  -- Vansu Bridge Viewpoint (zone 14)
  ((SELECT id FROM zones WHERE name = 'Vansu Bridge Viewpoint'), 'day1', 'Take a wide photo of the Daugava River with the bridge in frame.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Vansu Bridge Viewpoint'), 'day2', 'One team member must finish a beverage beginning with the letter F. Team picks who drinks.', 'generic', 'one'),

  -- Mentzendorff House (zone 15)
  ((SELECT id FROM zones WHERE name = 'Mentzendorff House'), 'day1', 'Photograph the facade of Mentzendorff House and find the date it was built.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Mentzendorff House'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter J. Photo proof of beverages required.', 'generic', 'team'),

  -- Cat House (zone 16)
  ((SELECT id FROM zones WHERE name = 'Cat House'), 'day1', 'Find the famous cats on top of Cat House and take a photo pointing at them.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Cat House'), 'day2', 'One team member must finish a beverage beginning with the letter K. Team picks who drinks.', 'generic', 'one'),

  -- Konventa Seta (zone 17)
  ((SELECT id FROM zones WHERE name = 'Konventa Seta'), 'day1', 'Walk through the Konventa Seta courtyard and photograph the inner courtyard (not the street entrance).', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Konventa Seta'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter H. Photo proof of beverages required.', 'generic', 'team'),

  -- Art Nouveau District (zone 18)
  ((SELECT id FROM zones WHERE name = 'Riga Art Nouveau District'), 'day1', 'Photograph two different Art Nouveau building facades on Alberta iela. Must show ornamental details.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Riga Art Nouveau District'), 'day2', 'One team member must finish a beverage beginning with the letter N. Team picks who drinks.', 'generic', 'one'),

  -- Esplanade Park (zone 19)
  ((SELECT id FROM zones WHERE name = 'Esplanade Park'), 'day1', 'Find a statue or monument in Esplanade Park and photograph the whole team with it.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Esplanade Park'), 'day2', 'Everyone on the team must finish a beverage beginning with the letter E. Photo proof of beverages required.', 'generic', 'team'),

  -- Daugava Riverbank (zone 20)
  ((SELECT id FROM zones WHERE name = 'Daugava Riverbank'), 'day1', 'Take a panoramic photo of the Daugava River including both banks if possible.', 'geography', 'team'),
  ((SELECT id FROM zones WHERE name = 'Daugava Riverbank'), 'day2', 'One team member must finish a beverage beginning with the letter I. Team picks who drinks.', 'generic', 'one');
```

## Index Creation

```sql
CREATE INDEX IF NOT EXISTS idx_zone_claims_zone_phase ON zone_claims(zone_id, phase);
CREATE INDEX IF NOT EXISTS idx_zone_claims_team ON zone_claims(team_color, phase);
CREATE INDEX IF NOT EXISTS idx_challenges_zone_phase ON challenges(zone_id, phase);
CREATE INDEX IF NOT EXISTS idx_day2_assignments_participant ON day2_team_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_participant ON team_locations(participant_id);
CREATE INDEX IF NOT EXISTS idx_zone_claim_history_zone ON zone_claim_history(zone_id, phase);
```

## File Changes

### New Files
- `types/zones.ts` — TypeScript interfaces (see above)
- SQL additions to `lib/schema.sql` — six new tables + indexes + seed data

### No Changes To
- `data/teams.ts` — existing team structure is referenced by zone_claims, not modified
- `data/participants.ts` — used as reference for participant IDs in claims

## Definition of Done

- [ ] All six tables created in Vercel Postgres without errors
- [ ] 20 zones seeded with valid coordinates (verified on a map)
- [ ] 40 challenges seeded (2 per zone × 20 zones), no missing entries
- [ ] All Day 2 challenges are letter-based beverage challenges with correct `participant_scope`
- [ ] TypeScript interfaces in `types/zones.ts` compile with no errors
- [ ] UNIQUE constraints prevent duplicate claims per zone per phase
- [ ] FK constraints prevent orphan challenges or claims
