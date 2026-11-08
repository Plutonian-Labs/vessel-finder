import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ports, satellites, teleports, vessels, type Vessel } from './data';

export type LayerName = 'vessels' | 'ports' | 'teleports' | 'satellites';
export type VisibleLayers = Record<LayerName, boolean>;

const formatPoint = (latitude: number, longitude: number) => `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
const safeText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function vesselPopup(v: Vessel) {
  return `<div class="map-popup"><strong>${safeText(v.name)}</strong><p>Demo identifier: ${safeText(v.mmsi)}</p><p>Position: ${formatPoint(v.latitude,v.longitude)}</p><p>Course: ${v.heading}° · Speed: ${v.speedKnots} kn</p><p>Destination: ${safeText(v.destination)}</p><small>Simulated data — not live AIS</small></div>`;
}

export default function MapView({ visible, selectedId, onSelect }: { visible: VisibleLayers; selectedId: string | null; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<LayerName, L.LayerGroup> | null>(null);
  const markerRef = useRef<Map<string, L.Marker>>(new Map());
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
      vessels: L.layerGroup(), ports: L.layerGroup(), teleports: L.layerGroup(), satellites: L.layerGroup()
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
    satellites.forEach(s => {
      L.polygon(s.coverage, { color: '#0e9ca4', fillColor: '#19a8ae', fillOpacity: .12, weight: 2, dashArray: '6 5' })
        .bindPopup(`<strong>${safeText(s.name)}</strong><p>${safeText(s.detail)}</p>`).addTo(groups.satellites);
      L.circleMarker([s.latitude,s.longitude], { radius: 7, color: '#0e9ca4', fillColor: '#80f0ed', fillOpacity: 1 })
        .bindPopup(`<strong>${safeText(s.name)}</strong><p>Illustrative sub-satellite point</p>`).addTo(groups.satellites);
    });
    return () => { map.remove(); mapRef.current = null; layersRef.current = null; markerRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current, groups = layersRef.current;
    if (!map || !groups) return;
    (Object.keys(groups) as LayerName[]).forEach(name => {
      if (visible[name] && !map.hasLayer(groups[name])) map.addLayer(groups[name]);
      if (!visible[name] && map.hasLayer(groups[name])) map.removeLayer(groups[name]);
    });
  }, [visible]);

  useEffect(() => {
    const marker = selectedId && markerRef.current.get(selectedId);
    if (marker && visible.vessels) {
      mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }, [selectedId, visible.vessels]);

  return <div ref={container} className="map-canvas" aria-label="Interactive maritime demo map" />;
}
