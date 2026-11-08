import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ports, teleports, vessels, type Vessel } from './data';

export type LayerName = 'vessels' | 'ports' | 'teleports' | 'satelliteFootprints' | 'satelliteElevation';
export type VisibleLayers = Record<LayerName, boolean>;
export type SatelliteKey = 'anik' | 'eutelsat' | 'abs';
type LegacyCollection = { name: string; slot: string; footprints: GeoJSON.Feature[]; elevation: GeoJSON.Feature[] };
type LegacyPayload = { source: string; status: string; satelliteCollections: Record<SatelliteKey, LegacyCollection> };
const satelliteColors: Record<SatelliteKey, string> = { anik: '#bc5ee6', eutelsat: '#de8e3b', abs: '#39ac99' };
const formatPoint = (latitude: number, longitude: number) => `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
const safeText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function vesselPopup(v: Vessel) {
  return `<div class="map-popup"><strong>${safeText(v.name)}</strong><p>Demo identifier: ${safeText(v.mmsi)}</p><p>Position: ${formatPoint(v.latitude,v.longitude)}</p><p>Course: ${v.heading}° · Speed: ${v.speedKnots} kn</p><p>Destination: ${safeText(v.destination)}</p><small>Simulated data — not live AIS</small></div>`;
}
export default function MapView({ visible, selectedId, selectedSatellite, onSelect }: {
  visible: VisibleLayers; selectedId: string | null; selectedSatellite: SatelliteKey | 'all'; onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<LayerName, L.LayerGroup> | null>(null);
  const markerRef = useRef<Map<string, L.Marker>>(new Map());
  const satelliteRef = useRef<Record<SatelliteKey, { footprints: L.LayerGroup; elevation: L.LayerGroup }> | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = L.map(container.current, { zoomControl: false }).setView([25.5,-75], 5);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const groups: Record<LayerName, L.LayerGroup> = {
      vessels: L.layerGroup(), ports: L.layerGroup(), teleports: L.layerGroup(),
      satelliteFootprints: L.layerGroup(), satelliteElevation: L.layerGroup()
    };
    layersRef.current = groups;
    vessels.forEach(v => {
      const icon = L.divIcon({
        className: 'vessel-icon', html: `<span style="transform:rotate(${v.heading}deg)">▲</span>`,
        iconSize: [28,28], iconAnchor: [14,14]
      });
      const marker = L.marker([v.latitude,v.longitude], { icon }).bindPopup(vesselPopup(v));
      marker.on('click', () => onSelectRef.current(v.id));
      marker.addTo(groups.vessels);
      markerRef.current.set(v.id, marker);
    });
    ports.forEach(p => L.circleMarker([p.latitude,p.longitude], {
      radius: 6, color: '#081523', fillColor: '#f4b860', fillOpacity: 1, weight: 2
    }).bindPopup(`<strong>${safeText(p.name)}</strong><p>${safeText(p.detail)}</p>`).addTo(groups.ports));
    teleports.forEach(p => L.circleMarker([p.latitude,p.longitude], {
      radius: 8, color: '#b6bfff', fillColor: '#725bdb', fillOpacity: .85
    }).bindPopup(`<strong>${safeText(p.name)}</strong><p>${safeText(p.detail)}</p>`).addTo(groups.teleports));
    // Satellite layers are loaded independently below.
    return () => { map.remove(); mapRef.current = null; layersRef.current = null; markerRef.current.clear(); satelliteRef.current = null; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/data/legacy-satellite-geometry.json')
      .then(response => { if (!response.ok) throw new Error('Satellite data unavailable'); return response.json() as Promise<LegacyPayload>; })
      .then(payload => {
        if (!active || !layersRef.current) return;
        const satelliteGroups = {} as NonNullable<typeof satelliteRef.current>;
        (Object.keys(satelliteColors) as SatelliteKey[]).forEach(key => {
          const collection = payload.satelliteCollections[key];
          if (!collection) return;
          const makeLayers = (features: GeoJSON.Feature[], elevation: boolean) => {
            const layerGroup = L.layerGroup();
            features.forEach(feature => {
              try {
                const properties = feature.properties ?? {};
                const contour = String(properties.footprint ?? properties.elevation ?? collection.name);
                const shape = L.geoJSON(feature, { style: {
                  color: satelliteColors[key], weight: elevation ? 1.3 : 1.1,
                  opacity: elevation ? .75 : .9, fillColor: satelliteColors[key],
                  fillOpacity: elevation ? 0 : .11, dashArray: elevation ? '5 4' : undefined
                } });
                shape.bindPopup(`<div class="map-popup"><strong>${safeText(collection.name)}</strong><p>${safeText(contour)}</p><small>Historic legacy coverage geometry; not verified for current service.</small></div>`);
                shape.addTo(layerGroup);
              } catch (error) { console.warn('Skipped invalid legacy geometry feature', error); }
            });
            return layerGroup;
          };
          satelliteGroups[key] = { footprints: makeLayers(collection.footprints, false), elevation: makeLayers(collection.elevation, true) };
        });
        satelliteRef.current = satelliteGroups;
        // Rebuild the visible satellite composite layers; initial settings are synchronized below.
        setSatelliteGroups();
      })
      .catch(error => console.error('Historic satellite geometry could not load', error));
    function setSatelliteGroups() {
      // A custom event avoids duplicating the UI selection logic in the loader.
      window.dispatchEvent(new Event('vessel-satellite-loaded'));
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function synchronize() {
      const map = mapRef.current, groups = layersRef.current;
      if (!map || !groups) return;
      (Object.keys(groups) as LayerName[]).forEach(name => {
        if (name === 'satelliteFootprints' || name === 'satelliteElevation') return;
        if (visible[name] && !map.hasLayer(groups[name])) map.addLayer(groups[name]);
        if (!visible[name] && map.hasLayer(groups[name])) map.removeLayer(groups[name]);
      });
      groups.satelliteFootprints.clearLayers();
      groups.satelliteElevation.clearLayers();
      if (satelliteRef.current) {
        (Object.keys(satelliteColors) as SatelliteKey[]).forEach(key => {
          if (selectedSatellite !== 'all' && selectedSatellite !== key) return;
          const satellite = satelliteRef.current?.[key];
          if (satellite) {
            groups.satelliteFootprints.addLayer(satellite.footprints);
            groups.satelliteElevation.addLayer(satellite.elevation);
          }
        });
      }
      (['satelliteFootprints','satelliteElevation'] as const).forEach(name => {
        if (visible[name] && !map.hasLayer(groups[name])) map.addLayer(groups[name]);
        if (!visible[name] && map.hasLayer(groups[name])) map.removeLayer(groups[name]);
      });
    }
    synchronize();
    window.addEventListener('vessel-satellite-loaded', synchronize);
    return () => window.removeEventListener('vessel-satellite-loaded', synchronize);
  }, [visible, selectedSatellite]);

  useEffect(() => {
    const marker = selectedId && markerRef.current.get(selectedId);
    if (marker && visible.vessels) {
      mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }, [selectedId, visible.vessels]);

  return <div ref={container} className="map-canvas" aria-label="Interactive maritime demo map" />;
}
