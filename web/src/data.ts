/**
 * Illustrative sample vessel/teleport data ONLY.
 * Satellite overlays are imported separately from the original legacy GIS data.
 */
export type Vessel = { id: string; name: string; companyId: string; mmsi: string; latitude: number; longitude: number; heading: number; speedKnots: number; destination: string; status: string };
export type PortRecord = { id: string; name: string; country: string; latitude: number; longitude: number };
export type GeoPoint = { name: string; latitude: number; longitude: number; detail: string };

export const vesselCompanies = [
  { id: 'demo-atlantic', name: 'Atlantic Demo Cruises', icon: '/legacy/vessels/atlantic.png' },
  { id: 'demo-pacific', name: 'Pacific Demo Cruises', icon: '/legacy/vessels/pacific.png' },
  { id: 'demo-caribbean', name: 'Caribbean Demo Cruises', icon: '/legacy/vessels/caribbean.png' }
] as const;

export const vessels: Vessel[] = [
  { id: 'demo-1', companyId: 'demo-atlantic', name: 'DEMO ATLANTIC', mmsi: 'SIM-001', latitude: 26.2, longitude: -79.4, heading: 32, speedKnots: 15.4, destination: 'Nassau (demo)', status: 'Under way' },
  { id: 'demo-2', companyId: 'demo-pacific', name: 'DEMO PACIFIC', mmsi: 'SIM-002', latitude: 23.4, longitude: -75.8, heading: 205, speedKnots: 11.8, destination: 'Miami (demo)', status: 'Under way' },
  { id: 'demo-3', companyId: 'demo-caribbean', name: 'DEMO CARIBBEAN', mmsi: 'SIM-003', latitude: 20.2, longitude: -74.1, heading: 95, speedKnots: 9.6, destination: 'San Juan (demo)', status: 'Under way' }
];
export const teleports: GeoPoint[] = [
  { name: 'Demo teleport — Florida', latitude: 26.5, longitude: -80.65, detail: 'Illustrative location, not an operational facility' }
];
