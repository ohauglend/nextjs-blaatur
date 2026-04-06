'use client';

import { useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TeamColor, ZoneWithClaim, Day2TeamAssignment } from '@/types/zones';
import { useParticipantLocation } from '@/utils/locationService';
import { mapDay1ColorToDay2 } from '@/utils/gamePhaseUtils';

// -- Color mapping -----------------------------------------------------------

const TEAM_COLORS: Record<TeamColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
};

const UNCLAIMED_COLOR = '#9ca3af';

function getZoneColor(claim: ZoneWithClaim['claim'], phase?: string, day2Assignments?: Day2TeamAssignment[] | null): string {
  if (!claim) return UNCLAIMED_COLOR;
  // In Day 2, map the claim's team_color through day2_team_assignments
  if (phase === 'day2' && day2Assignments && day2Assignments.length > 0) {
    const day2Color = mapDay1ColorToDay2(claim.team_color, day2Assignments);
    if (day2Color) return TEAM_COLORS[day2Color] ?? UNCLAIMED_COLOR;
  }
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
  onZoneTap?: (zone: ZoneWithClaim) => void;
  /** Called once after first render so parent can trigger SWR revalidation */
  onMutateRef?: (mutate: () => void) => void;
  /** In dev mode, called when user clicks the map to set a fake GPS position */
  onDevPositionSet?: (coords: { lat: number; lng: number }) => void;
  /** Dev-mode override position shown on the map */
  devPosition?: { lat: number; lng: number } | null;
  /** Whether dev GPS click-to-pin mode is active */
  devGpsActive?: boolean;
  /** Called when the dev GPS toggle button is clicked */
  onDevGpsToggle?: () => void;
  /** Day 2 team assignments for color mapping */
  day2Assignments?: Day2TeamAssignment[] | null;
}

// -- Sub-component: dev-mode map click to set position ----------------------

function DevMapClickHandler({ onClickMap }: { onClickMap: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClickMap(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// -- Sub-component: dev GPS toggle button (outside the map, no Leaflet interference) --

function DevGpsToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={active ? 'Dev GPS mode ON — click map to move pin' : 'Dev GPS mode OFF'}
      style={{ position: 'absolute', bottom: 88, right: 12, zIndex: 1000 }}
      className={`px-2.5 py-1.5 rounded-lg shadow text-xs font-semibold border transition-colors ${
        active
          ? 'bg-orange-500 border-orange-600 text-white'
          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      📍 {active ? 'GPS: ON' : 'GPS: OFF'}
    </button>
  );
}

export default function ZoneMap({
  participantId,
  teamColor,
  phase,
  height = '85dvh',
  width = '100%',
  onZoneTap,
  onMutateRef,
  onDevPositionSet,
  devPosition,
  devGpsActive = false,
  onDevGpsToggle,
  day2Assignments,
}: ZoneMapProps) {
  const { coords, error: locationError, loading: locationLoading } = useParticipantLocation(participantId);

  const { data: zones, error: fetchError, isLoading: zonesLoading, mutate } = useSWR<ZoneWithClaim[]>(
    `/api/zones/claims?phase=${phase}`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  // Expose mutate to parent
  const mutateRefSet = useRef(false);
  useEffect(() => {
    if (onMutateRef && !mutateRefSet.current) {
      mutateRefSet.current = true;
      onMutateRef(() => { mutate(); });
    }
  }, [onMutateRef, mutate]);

  const isDev = process.env.NODE_ENV === 'development';

  // Destroy the Leaflet map instance on unmount so React StrictMode's
  // double-invoke doesn't leave a stale _leaflet_id on the container DOM node.
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const handleDevClick = useCallback((lat: number, lng: number) => {
    if (isDev && onDevPositionSet) {
      onDevPositionSet({ lat, lng });
    }
  }, [isDev, onDevPositionSet]);

  const myColor = TEAM_COLORS[teamColor];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg" style={{ position: 'relative' }}>
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
          ref={mapRef}
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

          {/* Dev mode: click-to-pin handler (only active when GPS mode is ON) */}
          {isDev && devGpsActive && onDevPositionSet && (
            <DevMapClickHandler onClickMap={handleDevClick} />
          )}

          {/* Zone circles */}
          {zones?.map((zone) => {
            const color = getZoneColor(zone.claim, phase, day2Assignments);
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
                eventHandlers={{
                  click: (e) => {
                    // Stop propagation so dev map-click doesn't also fire
                    e.originalEvent.stopPropagation();
                    onZoneTap?.(zone);
                  },
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

          {/* Dev-mode override position marker */}
          {isDev && devPosition && (
            <CircleMarker
              center={[devPosition.lat, devPosition.lng]}
              radius={10}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.8,
                weight: 3,
                dashArray: '4 2',
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} permanent>
                📍 Dev GPS
              </Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
      )}

      {/* Dev GPS toggle button — outside MapContainer so Leaflet can't swallow the click */}
      {isDev && onDevGpsToggle && (
        <DevGpsToggle active={devGpsActive} onToggle={onDevGpsToggle} />
      )}

      {/* Location loading indicator */}
      {locationLoading && !locationError && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-blue-700 text-xs text-center">
          Getting your location…
        </div>
      )}

      {/* Dev mode GPS banner */}
      {isDev && devGpsActive && (
        <div className="bg-orange-50 border-t border-orange-200 px-4 py-2 text-orange-700 text-xs text-center">
          {devPosition
            ? `📍 Dev GPS: ${devPosition.lat.toFixed(5)}, ${devPosition.lng.toFixed(5)} — click map to move`
            : '🗺️ Click anywhere on the map to place your dev GPS pin'}
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
