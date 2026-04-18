-- Database schema for destination guesses
-- Run this in your Vercel Postgres dashboard

-- Clear existing data (run this FIRST if updating existing table)
-- DELETE FROM destination_guesses;

CREATE TABLE IF NOT EXISTS destination_guesses (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    guess TEXT,
    city_name TEXT,
    country TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT true,
    distance_km DECIMAL(10,2),
    is_correct_destination BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries by participant
CREATE INDEX IF NOT EXISTS idx_destination_guesses_participant 
ON destination_guesses(participant_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_destination_guesses_created_at 
ON destination_guesses(created_at DESC);

-- Index for active guesses
CREATE INDEX IF NOT EXISTS idx_destination_guesses_active 
ON destination_guesses(participant_id, is_active);

-- Index for correct destination
CREATE INDEX IF NOT EXISTS idx_destination_guesses_correct 
ON destination_guesses(is_correct_destination);

-- =====================================================
-- Trip State Management
-- =====================================================
-- Stores the current active state of the trip
-- This is a single-row table that tracks which phase of the trip is active
-- Examples: 'pre-trip', 'pre-trip-packing', 'flight', 'day-1', etc.

CREATE TABLE IF NOT EXISTS trip_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    state_id VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(50),
    CHECK (id = 1)  -- Only allow one row
);

-- Insert the initial/default state
INSERT INTO trip_state (id, state_id, updated_by)
VALUES (1, 'pre-trip', 'system')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Zone Challenge Game — Zones
-- =====================================================
-- Geographic zone definitions for the Riga Zone Challenge Game.
-- Circle-based zones (center + radius). polygon_geojson stubbed for future upgrade.

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    center_lat DECIMAL(10,8) NOT NULL,
    center_lng DECIMAL(11,8) NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 50,
    polygon_geojson TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Zone Challenge Game — Challenges
-- =====================================================
-- One challenge per zone per game phase (day1 = exploration, day2 = drinking).

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    phase VARCHAR(10) NOT NULL CHECK (phase IN ('day1', 'day2')),
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('generic', 'geography')),
    participant_scope VARCHAR(10) NOT NULL DEFAULT 'team' CHECK (participant_scope IN ('team', 'one')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (zone_id, phase)
);

-- =====================================================
-- Zone Challenge Game — Zone Claims
-- =====================================================
-- Tracks which team currently holds each zone in each phase.

CREATE TABLE IF NOT EXISTS zone_claims (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    team_color VARCHAR(10) NOT NULL CHECK (team_color IN ('red', 'yellow', 'blue', 'green')),
    phase VARCHAR(10) NOT NULL CHECK (phase IN ('day1', 'day2')),
    claimed_by_participant VARCHAR(50) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    steal_locked BOOLEAN NOT NULL DEFAULT false,
    points_awarded BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (zone_id, phase)
);

-- =====================================================
-- Zone Challenge Game — Zone Claim History
-- =====================================================
-- Archives stolen claims from Day 2. When a zone is stolen, the old
-- claim row is moved here before being replaced in zone_claims.

CREATE TABLE IF NOT EXISTS zone_claim_history (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    team_color VARCHAR(10) NOT NULL CHECK (team_color IN ('red', 'yellow', 'blue', 'green')),
    phase VARCHAR(10) NOT NULL CHECK (phase IN ('day1', 'day2')),
    claimed_by_participant VARCHAR(50) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_awarded BOOLEAN NOT NULL DEFAULT false,
    stolen_by_team VARCHAR(10) NOT NULL CHECK (stolen_by_team IN ('red', 'yellow', 'blue', 'green')),
    stolen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Zone Challenge Game — Day 2 Team Assignments
-- =====================================================
-- Stores dynamically calculated Day 2 team merges.
-- Merge algorithm: fewest-points team joins most-points team; second joins second.
-- The merged team takes the color of the higher-ranked team in each pair.

CREATE TABLE IF NOT EXISTS day2_team_assignments (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    day1_team_color VARCHAR(10) NOT NULL CHECK (day1_team_color IN ('red', 'yellow', 'blue', 'green')),
    day2_team_color VARCHAR(10) NOT NULL CHECK (day2_team_color IN ('red', 'yellow', 'blue', 'green')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (participant_id)
);

-- =====================================================
-- Zone Challenge Game — Participant Locations
-- =====================================================
-- Stores the last known GPS position per participant.
-- Upserted by the location service every ~15 seconds.
-- Used by the host dashboard to show all participant dots on the map.

CREATE TABLE IF NOT EXISTS participant_locations (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL,
    team_color VARCHAR(10) NOT NULL CHECK (team_color IN ('red', 'yellow', 'blue', 'green')),
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(8,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (participant_id)
);

-- =====================================================
-- Zone Challenge Game — Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_zone_claims_zone_phase ON zone_claims(zone_id, phase);
CREATE INDEX IF NOT EXISTS idx_zone_claims_team ON zone_claims(team_color, phase);
CREATE INDEX IF NOT EXISTS idx_challenges_zone_phase ON challenges(zone_id, phase);
CREATE INDEX IF NOT EXISTS idx_day2_assignments_participant ON day2_team_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_locations_participant ON participant_locations(participant_id);
CREATE INDEX IF NOT EXISTS idx_zone_claim_history_zone ON zone_claim_history(zone_id, phase);

-- =====================================================
-- Dev Settings
-- =====================================================
-- Simple key/value store for host-controlled dev flags.
-- Run this once on your Neon database.

CREATE TABLE IF NOT EXISTS dev_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO dev_settings (key, value) VALUES ('mock_gps_active', 'false') ON CONFLICT DO NOTHING;

-- =====================================================
-- Meet-up Spots
-- =====================================================
-- One row per participant. Hosts upsert address + meetup time via the API.
-- Participants see this data read-only when the trip state is 'meetup'.

CREATE TABLE IF NOT EXISTS meetup_spots (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    meetup_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetup_spots_participant
ON meetup_spots(participant_id);

-- =====================================================
-- Zone Challenge Game — Seed Data: Zones
-- =====================================================
-- 20 Riga zones, coordinates verified against OpenStreetMap (March 2026).

INSERT INTO zones (name, center_lat, center_lng, radius_m) VALUES
  ('Freedom Monument',          56.95151,  24.11338,  50),
  ('Doma Cathedral',            56.94910,  24.10477,  60),
  ('St. Peter''s Church',       56.94752,  24.10931,  50),
  ('Riga Castle',               56.95097,  24.10115,  70),
  ('Three Brothers',            56.95035,  24.10429,  40),
  ('Swedish Gate',              56.95145,  24.10638,  40),
  ('Powder Tower',              56.95122,  24.10868,  40),
  ('Laima Clock',               56.95044,  24.11198,  40),
  ('Livu Square',               56.94944,  24.10930,  60),
  ('Bastejkalns Park',          56.95155,  24.11112,  80),
  ('National Opera',            56.94933,  24.11437,  60),
  ('Black Magic Bar',           56.94866,  24.10892,  40),
  ('Riga Central Market',       56.94396,  24.11673, 100),
  ('Vansu Bridge Viewpoint',    56.95200,  24.10050,  50),
  ('Mentzendorff House',        56.94677,  24.10825,  40),
  ('Cat House',                 56.95018,  24.10854,  40),
  ('Konventa Seta',             56.94824,  24.11033,  50),
  ('Riga Art Nouveau District', 56.95961,  24.10852,  80),
  ('Esplanade Park',            56.95428,  24.11338,  80),
  ('Daugava Riverbank',         56.94680,  24.10200,  80);

-- =====================================================
-- Zone Challenge Game — Seed Data: Challenges
-- =====================================================
-- 40 challenges: 1 day1 + 1 day2 per zone.
-- day1 = exploration/activity, day2 = drinking-focused.
-- geography = tied to the specific location, generic = could be done anywhere.

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

-- =====================================================
-- Packing List — Items
-- =====================================================
-- DB-backed packing items. Each item belongs to a specific participant
-- or to 'everyone' (shown in all lists).
-- No required/notes fields — lean schema.
-- emoji_override, if set, replaces the default category icon in the UI.

CREATE TABLE IF NOT EXISTS packing_items (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('clothing', 'electronics', 'personal', 'documents', 'special')),
    emoji_override TEXT,
    participant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for participant-scoped queries (fetches '{participant}' + 'everyone' rows)
CREATE INDEX IF NOT EXISTS idx_packing_items_participant
ON packing_items(participant_id);

-- Index for stable display ordering
CREATE INDEX IF NOT EXISTS idx_packing_items_created_at
ON packing_items(created_at ASC);

-- =====================================================
-- Packing List — Seed Data
-- =====================================================
-- Items present in all 8 lists → 'everyone'
-- All others → specific participant ID
-- Derived from data/packing-lists.ts (static data replaced by this table)

INSERT INTO packing_items (text, category, participant_id) VALUES
  -- Everyone (present in all 8 participant lists)
  ('Camera or phone',           'electronics', 'everyone'),
  ('Passport',                  'documents',   'everyone'),

  -- Emilie
  ('Warm jacket',               'clothing',    'emilie'),
  ('Comfortable walking shoes', 'clothing',    'emilie'),
  ('Swimwear',                  'clothing',    'emilie'),
  ('Portable charger',          'electronics', 'emilie'),
  ('Sunglasses',                'personal',    'emilie'),
  ('Waterproof bag',            'special',     'emilie'),

  -- Mathias
  ('Hiking boots',              'clothing',    'mathias'),
  ('Rain jacket',               'clothing',    'mathias'),
  ('Quick-dry clothes',         'clothing',    'mathias'),
  ('Portable charger',          'electronics', 'mathias'),
  ('Head torch/flashlight',     'special',     'mathias'),
  ('Waterproof bag',            'special',     'mathias'),

  -- Brage
  ('Formal shirt',              'clothing',    'brage'),
  ('Casual comfortable clothes','clothing',    'brage'),
  ('Swimwear',                  'clothing',    'brage'),
  ('Portable charger',          'electronics', 'brage'),
  ('Sunscreen',                 'personal',    'brage'),
  ('Reusable water bottle',     'special',     'brage'),

  -- Sara
  ('Layered clothing',          'clothing',    'sara'),
  ('Comfortable shoes',         'clothing',    'sara'),
  ('Swimwear',                  'clothing',    'sara'),
  ('Portable charger',          'electronics', 'sara'),
  ('Personal medications',      'personal',    'sara'),
  ('Small backpack',            'special',     'sara'),

  -- Johanna
  ('Versatile outfits',         'clothing',    'johanna'),
  ('Good walking shoes',        'clothing',    'johanna'),
  ('Swimwear',                  'clothing',    'johanna'),
  ('Portable charger',          'electronics', 'johanna'),
  ('Journal or notebook',       'personal',    'johanna'),
  ('Travel pillow',             'special',     'johanna'),

  -- Hosts
  ('Host materials',            'special',     'oskar'),
  ('Host materials',            'special',     'odd'),
  ('Host materials',            'special',     'aasmund');