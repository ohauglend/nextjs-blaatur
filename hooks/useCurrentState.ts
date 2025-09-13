'use client';

import { useEffect, useState } from 'react';
import { TripState } from '@/data/states';
import { getEffectiveCurrentState } from '@/utils/stateManager';

export function useCurrentState(): TripState {
  const [currentState, setCurrentState] = useState<TripState>('pre-trip-packing');

  useEffect(() => {
    // Load the current state from localStorage on client side
    setCurrentState(getEffectiveCurrentState());
  }, []);

  return currentState;
}
