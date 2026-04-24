export type VotePresetType = 'closest_destination';

export interface VoteSession {
  id: string;
  session_day: 1 | 2;
  title: string;
  preset_type: VotePresetType | null;
  points_tally: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface VoteSessionParticipant {
  id: string;
  vote_session_id: string;
  participant_id: string;
  photo_url: string | null;
  added_at: string;
}

export interface ParticipantVote {
  id: string;
  vote_session_id: string;
  voter_name: string;
  voted_for: string;
  voted_at: string;
}

export interface ScoreAdjustment {
  id: string;
  participant_id: string;
  delta: number;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface VoteSessionResults {
  vote_session_id: string;
  tally: Array<{
    participant_id: string;
    vote_count: number;
  }>;
  winner_ids: string[];
  total_voters: number;
  eligible_voter_count: number;
  is_complete: boolean;
}

export interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  zone_points: number;
  voting_points: number;
  adjustment_points: number;
  total: number;
}
