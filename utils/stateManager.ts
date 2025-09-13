import { TripState } from '@/data/states';

// In a real app, this would be stored in a database or API
// For this demo, we'll use localStorage on the client side
export function saveCurrentState(state: TripState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('blatur-current-state', state);
  }
}

export function loadCurrentState(): TripState | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('blatur-current-state');
    return saved as TripState | null;
  }
  return null;
}

export function getEffectiveCurrentState(): TripState {
  // Try to load from localStorage first (for demo purposes)
  const saved = loadCurrentState();
  if (saved) {
    return saved;
  }
  
  // Fallback to default state from states.ts
  return 'pre-trip-packing';
}
