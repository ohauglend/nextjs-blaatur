import { PARTICIPANTS } from '@/data/participants';

// Secure access tokens for each participant
// In production, these would be randomly generated GUIDs
export const PARTICIPANT_TOKENS: Record<string, string> = {
  'oskar': 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'odd': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
  'aasmund': '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  'emilie': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'mathias': '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  'brage': '01234567-89ab-cdef-0123-456789abcdef',
  'sara': 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  'johanna': '550e8400-e29b-41d4-a716-446655440000'
};

// Reverse lookup: token -> participant
export const TOKEN_TO_PARTICIPANT: Record<string, string> = Object.fromEntries(
  Object.entries(PARTICIPANT_TOKENS).map(([participant, token]) => [token, participant])
);

export function getParticipantToken(participantId: string): string | null {
  return PARTICIPANT_TOKENS[participantId] || null;
}

export function getParticipantByToken(token: string): string | null {
  return TOKEN_TO_PARTICIPANT[token] || null;
}

export function isValidToken(token: string): boolean {
  return token in TOKEN_TO_PARTICIPANT;
}

export function generateSecureUrl(participantId: string): string | null {
  const token = getParticipantToken(participantId);
  if (!token) return null;
  return `/${token}/${participantId}`;
}

export function parseSecureUrl(token: string, participant: string): { isValid: boolean; participantId: string | null } {
  // Check if the token is valid
  if (!isValidToken(token)) {
    return { isValid: false, participantId: null };
  }
  
  // Get the participant ID associated with this token
  const tokenOwner = getParticipantByToken(token);
  
  if (!tokenOwner) {
    return { isValid: false, participantId: null };
  }
  
  // Check if the requested participant exists
  if (!PARTICIPANTS[participant]) {
    return { isValid: false, participantId: null };
  }
  
  // Check if token owner is a host
  const tokenOwnerData = PARTICIPANTS[tokenOwner];
  const isHost = tokenOwnerData?.role === 'host';
  
  // Allow access if:
  // 1. Token matches the participant (own page), OR
  // 2. Token owner is a host (hosts can view all participants)
  if (tokenOwner === participant || isHost) {
    return { isValid: true, participantId: participant };
  }
  
  // Guests cannot access other participants' pages
  return { isValid: false, participantId: null };
}
