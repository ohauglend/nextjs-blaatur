export interface TimelineEvent {
  key: string;
  name: string;
  revealDate: string;
  description?: string;
}

export const TIMELINE: TimelineEvent[] = [
  {
    key: 'packing-list',
    name: 'Packing List Available',
    revealDate: '2025-09-07T00:00:00Z',
    description: 'Personal packing list becomes available'
  },
  {
    key: 'departure-reminder',
    name: 'Final Departure Instructions',
    revealDate: '2026-04-30T12:00:00Z',
    description: 'Last minute instructions and reminders'
  },
  {
    key: 'flight-info',
    name: 'Flight Information',
    revealDate: '2026-05-01T00:00:00Z',
    description: 'QR codes and boarding information'
  },
  {
    key: 'destination-reveal',
    name: 'Destination Revealed',
    revealDate: '2026-05-01T06:00:00Z',
    description: 'Finally discover where you are going!'
  }
];
