'use client';

import { useEffect, useState } from 'react';
import { TripState } from '@/data/states';
import { getCurrentStateFromAPI } from '@/utils/stateManager';

export function useCurrentState(): TripState {
  const [currentState, setCurrentState] = useState<TripState>('pre-trip');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the current state from API on mount
    const fetchState = async () => {
      setIsLoading(true);
      const state = await getCurrentStateFromAPI();
      setCurrentState(state);
      setIsLoading(false);
    };

    fetchState();

    // Optional: Poll for state changes every 10 seconds
    // This ensures participants see state changes without manual refresh
    const intervalId = setInterval(fetchState, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return currentState;
}
