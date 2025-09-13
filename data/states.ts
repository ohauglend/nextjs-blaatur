export type TripState = 
  | 'pre-trip'
  | 'pre-trip-packing'
  | 'flight'
  | 'day-1'
  | 'day-2'
  | 'flight-home'
  | 'after-trip';

export interface StateInfo {
  id: TripState;
  name: string;
  description: string;
  emoji: string;
  participantView: string;
}

export const TRIP_STATES: Record<TripState, StateInfo> = {
  'pre-trip': {
    id: 'pre-trip',
    name: 'Pre-Trip',
    description: 'Countdown and destination guessing phase',
    emoji: '⏰',
    participantView: 'The mystery awaits...'
  },
  'pre-trip-packing': {
    id: 'pre-trip-packing',
    name: 'Packing Time',
    description: 'Packing lists are now available',
    emoji: '🎒',
    participantView: 'Time to pack for your adventure!'
  },
  'flight': {
    id: 'flight',
    name: 'Flight Day',
    description: 'Flight information and boarding',
    emoji: '✈️',
    participantView: 'Your flight details are ready'
  },
  'day-1': {
    id: 'day-1',
    name: 'Day 1 - Team Adventures',
    description: 'Pairs exploration and challenges',
    emoji: '🎯',
    participantView: 'Team challenges await!'
  },
  'day-2': {
    id: 'day-2',
    name: 'Day 2 - Group Activities',
    description: 'Larger team competitions',
    emoji: '🏆',
    participantView: 'Group competition day!'
  },
  'flight-home': {
    id: 'flight-home',
    name: 'Journey Home',
    description: 'Return flight information',
    emoji: '🏠',
    participantView: 'Time to head home'
  },
  'after-trip': {
    id: 'after-trip',
    name: 'Trip Complete',
    description: 'Memories and thank you',
    emoji: '📸',
    participantView: 'Thank you for an amazing trip!'
  }
};

// Current state - in a real app this could be from an API or environment variable
export let CURRENT_STATE: TripState = 'pre-trip-packing';

export function getCurrentState(): TripState {
  return CURRENT_STATE;
}

export function getStateInfo(state: TripState): StateInfo {
  return TRIP_STATES[state];
}

export function getAllStates(): StateInfo[] {
  return Object.values(TRIP_STATES);
}
