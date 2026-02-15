import { getParticipantByToken, isValidToken } from './secureAccess';
import { PARTICIPANTS } from '@/data/participants';

/**
 * Check if a token belongs to a host participant
 */
export function isHostToken(token: string): boolean {
  if (!isValidToken(token)) {
    return false;
  }
  
  const participantId = getParticipantByToken(token);
  if (!participantId) {
    return false;
  }
  
  const participant = PARTICIPANTS[participantId];
  return participant?.role === 'host';
}

/**
 * Validate that a token belongs to a host and return the participant ID
 */
export function validateHostToken(token: string): { isValid: boolean; participantId: string | null } {
  if (!isValidToken(token)) {
    return { isValid: false, participantId: null };
  }
  
  const participantId = getParticipantByToken(token);
  if (!participantId) {
    return { isValid: false, participantId: null };
  }
  
  const participant = PARTICIPANTS[participantId];
  if (participant?.role !== 'host') {
    return { isValid: false, participantId: null };
  }
  
  return { isValid: true, participantId };
}

/**
 * Get host participant IDs (oskar, odd, aasmund)
 */
export function getHostIds(): string[] {
  return Object.values(PARTICIPANTS)
    .filter(p => p.role === 'host')
    .map(p => p.id);
}
