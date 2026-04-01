'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Per-participant mock coordinates — all placed at Riga Old Town center for dev testing.
// Scattered positions are preserved as comments for reference when proximity testing is needed.
const RIGA_CENTER_MOCK: LocationCoords = { lat: 56.9496, lng: 24.1052 };

const MOCK_LOCATIONS: Record<string, LocationCoords> = {
  oskar:    RIGA_CENTER_MOCK, // scattered: { lat: 56.9496, lng: 24.1052 }
  odd:      RIGA_CENTER_MOCK, // scattered: { lat: 56.9492, lng: 24.1038 }
  aasmund:  RIGA_CENTER_MOCK, // scattered: { lat: 56.9510, lng: 24.1070 }
  emilie:   RIGA_CENTER_MOCK, // scattered: { lat: 56.9465, lng: 24.1077 }
  mathias:  RIGA_CENTER_MOCK, // scattered: { lat: 56.9487, lng: 24.1120 }
  brage:    RIGA_CENTER_MOCK, // scattered: { lat: 56.9479, lng: 24.1062 }
  sara:     RIGA_CENTER_MOCK, // scattered: { lat: 56.9503, lng: 24.1130 }
  johanna:  RIGA_CENTER_MOCK, // scattered: { lat: 56.9507, lng: 24.1020 }
};

export function getMockLocation(participantId: string): LocationCoords {
  return MOCK_LOCATIONS[participantId] ?? { lat: 56.9496, lng: 24.1052 };
}

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_LOCATION === 'true';

// Throttle interval for location pushes to server (ms)
const PUSH_THROTTLE_MS = 15_000;

export function useParticipantLocation(participantId: string): {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
} {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPushRef = useRef<number>(0);

  // TODO: Implement POST /api/locations to upsert participant_locations table.
  // For now this is a no-op. Will be wired up in a later issue.
  const pushLocation = useCallback(async (_coords: LocationCoords) => {
    const now = Date.now();
    if (now - lastPushRef.current < PUSH_THROTTLE_MS) return;
    lastPushRef.current = now;

    // TODO: POST /api/locations with { participant_id, team_color, lat, lng, accuracy }
  }, []);

  useEffect(() => {
    // Mock mode — return hardcoded coordinates immediately
    if (isMockMode()) {
      const mock = getMockLocation(participantId);
      setCoords(mock);
      setLoading(false);
      pushLocation(mock);
      return;
    }

    // Real GPS mode
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newCoords: LocationCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCoords(newCoords);
        setLoading(false);
        setError(null);
        pushLocation(newCoords);
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access was denied. Please enable location permissions in your browser settings to use the map.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable. Please try again in an open area.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while getting your location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [participantId, pushLocation]);

  return { coords, error, loading };
}
