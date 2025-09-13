export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'guest';
}

export const PARTICIPANTS: Record<string, Participant> = {
  'oskar': { id: 'oskar', name: 'Oskar', role: 'host' },
  'odd': { id: 'odd', name: 'Odd', role: 'host' },
  'aasmund': { id: 'aasmund', name: 'Aasmund', role: 'host' },
  'emilie': { id: 'emilie', name: 'Emilie', role: 'guest' },
  'mathias': { id: 'mathias', name: 'Mathias', role: 'guest' },
  'brage': { id: 'brage', name: 'Brage', role: 'guest' },
  'sara': { id: 'sara', name: 'Sara', role: 'guest' },
  'johanna': { id: 'johanna', name: 'Johanna', role: 'guest' },
};

export const TRIP_CONFIG = {
  tripId: 'blatur-2026',
  departureDate: '2026-05-01T00:00:00Z',
  name: 'Blåtur',
  phases: {
    preTrip: { startDate: '2025-09-07T00:00:00Z' },
    airport: { startDate: '2026-05-01T00:00:00Z' },
    trip: { startDate: '2026-05-01T06:00:00Z' },
  }
};
