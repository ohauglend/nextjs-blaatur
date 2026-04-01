'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TeamColor, ZoneWithClaim } from '@/types/zones';
import { useParticipantLocation } from '@/utils/locationService';

// -- Color mapping -----------------------------------------------------------

const TEAM_COLORS: Record<TeamColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
};

const UNCLAIMED_COLOR = '#9ca3af';

function getZoneColor(claim: ZoneWithClaim['claim']): string {
  if (!claim) return UNCLAIMED_COLOR;
  return TEAM_COLORS[claim.team_color] ?? UNCLAIMED_COLOR;
}

// -- Riga center -------------------------------------------------------------

const RIGA_CENTER: [number, number] = [56.9496, 24.1052];
const DEFAULT_ZOOM = 15;

// -- SWR fetcher -------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// -- Sub-component: recenter map on own location once available ---------------

function RecenterOnLocation({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (coords && !hasCentered.current) {
      hasCentered.current = true;
      map.setView([coords.lat, coords.lng], map.getZoom(), { animate: true });
    }
  }, [coords, map]);

  return null;
}

// -- Sub-component: custom zoom buttons -------------------------------------

function ZoomControls() {
  const map = useMap();

  return (
    <div
      style={{ position: 'absolute', bottom: 24, right: 12, zIndex: 1000 }}
      className="flex flex-col gap-1"
    >
      <button
        onClick={() => map.zoomIn()}
        className="w-9 h-9 bg-white border border-gray-300 rounded-lg shadow text-gray-700 text-xl font-bold leading-none hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-9 h-9 bg-white border border-gray-300 rounded-lg shadow text-gray-700 text-xl font-bold leading-none hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center"
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
}

// -- Main component ----------------------------------------------------------

interface ZoneMapProps {
  participantId: string;
  teamColor: TeamColor;
  phase: 'day1' | 'day2';
  height?: string;
  width?: string;
}

export default function ZoneMap({
  participantId,
  teamColor,
  phase,
  height = '85dvh',
  width = '100%',
}: ZoneMapProps) {
  const { coords, error: locationError, loading: locationLoading } = useParticipantLocation(participantId);

  const { data: zones, error: fetchError, isLoading: zonesLoading } = useSWR<ZoneWithClaim[]>(
    `/api/zones/claims?phase=${phase}`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  const myColor = TEAM_COLORS[teamColor];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      {/* GPS error banner */}
      {locationError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-800 text-sm flex items-start gap-2">
          <span className="text-lg leading-none">⚠️</span>
          <span>{locationError}</span>
        </div>
      )}

      {/* Fetch error banner */}
      {fetchError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-red-800 text-sm flex items-start gap-2">
          <span className="text-lg leading-none">❌</span>
          <span>Failed to load zone data. Retrying automatically…</span>
        </div>
      )}

      {/* Loading skeleton */}
      {zonesLoading && (
        <div
          style={{ height, width }}
          className="bg-gray-100 flex items-center justify-center text-gray-400 animate-pulse"
        >
          Loading map…
        </div>
      )}

      {/* Map */}
      {!zonesLoading && (
        <MapContainer
          center={RIGA_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height, width }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterOnLocation coords={coords} />

          <ZoomControls />

          {/* Zone circles */}
          {zones?.map((zone) => {
            const color = getZoneColor(zone.claim);
            const isClaimed = !!zone.claim;
            const isCompleted = zone.claim?.completed === true;

            return (
              <Circle
                key={zone.id}
                center={[zone.center_lat, zone.center_lng]}
                radius={zone.radius_m}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.25,
                  weight: 2,
                  dashArray: isClaimed ? undefined : '6 4',
                }}
              >
                {/* Zone name tooltip on click */}
                <Tooltip direction="top" offset={[0, -10]}>
                  {isCompleted ? `✓ ${zone.name}` : zone.name}
                </Tooltip>
              </Circle>
            );
          })}

          {/* Own location dot */}
          {coords && (
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={8}
              pathOptions={{
                color: myColor,
                fillColor: myColor,
                fillOpacity: 0.9,
                weight: 2,
                className: 'location-pulse',
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent>
                You
              </Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
      )}

      {/* Location loading indicator */}
      {locationLoading && !locationError && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-blue-700 text-xs text-center">
          Getting your location…
        </div>
      )}

      {/* Pulsing animation style (injected once) */}
      <style jsx global>{`
        .location-pulse {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
