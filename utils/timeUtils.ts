import { TIMELINE } from '@/data/timeline';
import { TRIP_CONFIG } from '@/data/participants';

export function shouldShowContent(contentKey: string): boolean {
  const now = new Date();
  const timelineEvent = TIMELINE.find(event => event.key === contentKey);
  
  if (!timelineEvent) {
    return false;
  }
  
  return now >= new Date(timelineEvent.revealDate);
}

export function getTimeUntilDeparture(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = new Date();
  const departure = new Date(TRIP_CONFIG.departureDate);
  const diffMs = departure.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, totalMs: diffMs };
}

export function getCurrentPhase(): 'preTrip' | 'airport' | 'trip' | 'completed' {
  const now = new Date();
  const phases = TRIP_CONFIG.phases;
  
  if (now < new Date(phases.airport.startDate)) {
    return 'preTrip';
  } else if (now < new Date(phases.trip.startDate)) {
    return 'airport';
  } else if (now < new Date('2026-05-10T00:00:00Z')) { // Assume trip lasts 9 days
    return 'trip';
  } else {
    return 'completed';
  }
}

export function formatTimeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value !== 1 ? 's' : ''}`;
}
