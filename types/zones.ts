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
  /** Before-lunch (day1) challenge */
  challenge: Challenge | null;
  /** After-lunch (day2) challenge — shown once the host triggers the merge */
  afterLunchChallenge: Challenge | null;
}

export interface Day2TeamAssignment {
  participant_id: string;
  day1_team_color: TeamColor;
  day2_team_color: TeamColor;
}

export interface ZoneClaimHistory {
  id: number;
  zone_id: number;
  team_color: TeamColor;
  phase: GamePhase;
  claimed_by_participant: string;
  claimed_at: string;
  completed: boolean;
  completed_at: string | null;
  points_awarded: boolean;
  stolen_by_team: TeamColor;
  stolen_at: string;
}

export interface ParticipantLocation {
  id: number;
  participant_id: string;
  team_color: TeamColor;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
}
