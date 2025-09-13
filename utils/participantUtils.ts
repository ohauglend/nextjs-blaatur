import { PARTICIPANTS } from '@/data/participants';

export function isValidParticipant(participantId: string): boolean {
  return participantId in PARTICIPANTS;
}

export function getParticipant(participantId: string) {
  return PARTICIPANTS[participantId];
}

export function getAllParticipants() {
  return Object.values(PARTICIPANTS);
}

export function getParticipantsByRole(role: 'host' | 'guest') {
  return Object.values(PARTICIPANTS).filter(p => p.role === role);
}
