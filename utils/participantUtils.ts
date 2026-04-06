import { PARTICIPANTS } from '@/data/participants';
import { DAY_1_TEAMS, DAY_2_TEAMS, TeamColor } from '@/data/teams';
import type { GamePhase } from '@/types/zones';

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

export function getParticipantTeamColor(participantId: string, phase: GamePhase): TeamColor | null {
  const teams = phase === 'day1' ? DAY_1_TEAMS : DAY_2_TEAMS;
  const team = teams.find((t) => t.members.includes(participantId));
  return team?.color ?? null;
}
