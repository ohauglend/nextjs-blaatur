import type { Zone } from '@/types/zones';

/**
 * Seed zone data for local development (mirrors schema.sql inserts).
 * Used by API routes when DATABASE_URL is absent.
 */
export const MOCK_ZONES: (Zone & { polygon_geojson: null })[] = [
  { id: 1,  name: 'Freedom Monument',          center_lat: 56.95151, center_lng: 24.11338, radius_m: 50,  polygon_geojson: null },
  { id: 2,  name: 'Doma Cathedral',            center_lat: 56.94910, center_lng: 24.10477, radius_m: 60,  polygon_geojson: null },
  { id: 3,  name: "St. Peter's Church",        center_lat: 56.94752, center_lng: 24.10931, radius_m: 50,  polygon_geojson: null },
  { id: 4,  name: 'Riga Castle',               center_lat: 56.95097, center_lng: 24.10115, radius_m: 70,  polygon_geojson: null },
  { id: 5,  name: 'Three Brothers',            center_lat: 56.95035, center_lng: 24.10429, radius_m: 40,  polygon_geojson: null },
  { id: 6,  name: 'Swedish Gate',              center_lat: 56.95145, center_lng: 24.10638, radius_m: 40,  polygon_geojson: null },
  { id: 7,  name: 'Powder Tower',              center_lat: 56.95122, center_lng: 24.10868, radius_m: 40,  polygon_geojson: null },
  { id: 8,  name: 'Laima Clock',               center_lat: 56.95044, center_lng: 24.11198, radius_m: 40,  polygon_geojson: null },
  { id: 9,  name: 'Livu Square',               center_lat: 56.94944, center_lng: 24.10930, radius_m: 60,  polygon_geojson: null },
  { id: 10, name: 'Bastejkalns Park',          center_lat: 56.95155, center_lng: 24.11112, radius_m: 80,  polygon_geojson: null },
  { id: 11, name: 'National Opera',            center_lat: 56.94933, center_lng: 24.11437, radius_m: 60,  polygon_geojson: null },
  { id: 12, name: 'Black Magic Bar',           center_lat: 56.94866, center_lng: 24.10892, radius_m: 40,  polygon_geojson: null },
  { id: 13, name: 'Riga Central Market',       center_lat: 56.94396, center_lng: 24.11673, radius_m: 100, polygon_geojson: null },
  { id: 14, name: 'Vansu Bridge Viewpoint',    center_lat: 56.95200, center_lng: 24.10050, radius_m: 50,  polygon_geojson: null },
  { id: 15, name: 'Mentzendorff House',        center_lat: 56.94677, center_lng: 24.10825, radius_m: 40,  polygon_geojson: null },
  { id: 16, name: 'Cat House',                 center_lat: 56.95018, center_lng: 24.10854, radius_m: 40,  polygon_geojson: null },
  { id: 17, name: 'Konventa Seta',             center_lat: 56.94824, center_lng: 24.11033, radius_m: 50,  polygon_geojson: null },
  { id: 18, name: 'Riga Art Nouveau District', center_lat: 56.95961, center_lng: 24.10852, radius_m: 80,  polygon_geojson: null },
  { id: 19, name: 'Esplanade Park',            center_lat: 56.95428, center_lng: 24.11338, radius_m: 80,  polygon_geojson: null },
  { id: 20, name: 'Daugava Riverbank',         center_lat: 56.94680, center_lng: 24.10200, radius_m: 80,  polygon_geojson: null },
];

/**
 * Calculate the distance in metres between two GPS coordinates.
 * Uses the spherical law of cosines, accurate for distances under 1km.
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  return (
    Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ),
    ) * R
  );
}
