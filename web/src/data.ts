/**
 * Illustrative sample vessel/teleport data ONLY.
 * Satellite overlays are imported separately from the original legacy GIS data.
 */
export type Vessel = { id: string; name: string; mmsi: string; latitude: number; longitude: number; heading: number; speedKnots: number; destination: string; status: string };
export type GeoPoint = { name: string; latitude: number; longitude: number; detail: string };

export const vessels: Vessel[] = [
  { id: 'demo-1', name: 'DEMO ATLANTIC', mmsi: 'SIM-001', latitude: 26.2, longitude: -79.4, heading: 32, speedKnots: 15.4, destination: 'Nassau (demo)', status: 'Under way' },
  { id: 'demo-2', name: 'DEMO PACIFIC', mmsi: 'SIM-002', latitude: 23.4, longitude: -75.8, heading: 205, speedKnots: 11.8, destination: 'Miami (demo)', status: 'Under way' },
  { id: 'demo-3', name: 'DEMO CARIBBEAN', mmsi: 'SIM-003', latitude: 20.2, longitude: -74.1, heading: 95, speedKnots: 9.6, destination: 'San Juan (demo)', status: 'Under way' }
];
export const ports: GeoPoint[] = [
  { name: 'PortMiami', latitude: 25.776, longitude: -80.178, detail: 'Miami, Florida' },
  { name: 'Port Everglades', latitude: 26.094, longitude: -80.118, detail: 'Fort Lauderdale, Florida' },
  { name: 'Port of Nassau', latitude: 25.084, longitude: -77.339, detail: 'Nassau, Bahamas' },
  { name: 'Port of San Juan', latitude: 18.459, longitude: -66.096, detail: 'San Juan, Puerto Rico' }
];
export const teleports: GeoPoint[] = [
  { name: 'Demo teleport — Florida', latitude: 26.5, longitude: -80.65, detail: 'Illustrative location, not an operational facility' }
];
