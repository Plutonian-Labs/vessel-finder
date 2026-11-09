import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { teleports, vessels, vesselCompanies, type Vessel, type PortRecord } from './data';

export type LayerName = 'vessels' | 'ports' | 'teleports' | 'satelliteFootprints' | 'satelliteElevation';
export type VisibleLayers = Record<LayerName, boolean>;
export type SatelliteKey = 'anik' | 'eutelsat' | 'abs';
type LegacyCollection = { name: string; slot: string; footprints: GeoJSON.Feature[]; elevation: GeoJSON.Feature[] };
type LegacyPayload = { source: string; status: string; satelliteCollections: Record<SatelliteKey, LegacyCollection> };
const satelliteColors: Record<SatelliteKey, string> = { anik: '#bc5ee6', eutelsat: '#de8e3b', abs: '#39ac99' };
const formatPoint = (latitude: number, longitude: number) => `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;
const safeText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/**
 * The legacy ship PNGs are 23 x 7 px, not square. Scale their *visible*
 * size with the map container width (not zoom level or entire screen width).
 * Keep a fixed 30 x 30 px hit target so small symbols remain easy to select.
 */
function vesselDisplaySize(mapWidth: number): { width: number; height: number } {
  const width = Math.max(14, Math.min(26, Math.round(14 + (mapWidth - 400) / 120)));
  return { width, height: Math.round(width * 7 / 23 * 10) / 10 };
}

function vesselIcon(v: Vessel, mapWidth: number): L.DivIcon {
  const asset = vesselCompanies.find(company => company.id === v.companyId)?.icon ?? '/legacy/vessels/atlantic.png';
  const { width, height } = vesselDisplaySize(mapWidth);
  return L.divIcon({
    className: 'original-ship-icon',
    html: `<img src="${asset}" alt="" style="width:${width}px;height:${height}px;transform:rotate(${v.heading}deg)" />`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -17]
  });
}

function vesselPopup(v: Vessel) {
  return `<div class="map-popup"><strong>${safeText(v.name)}</strong><p>Demo identifier: ${safeText(v.mmsi)}</p><p>Position: ${formatPoint(v.latitude,v.longitude)}</p><p>Course: ${v.heading}° · Speed: ${v.speedKnots} kn</p><p>Destination: ${safeText(v.destination)}</p><small>Simulated data — not live AIS</small></div>`;
}
export default function MapView({ visible, selectedId, selectedSatellite, activeCompanies, mapMode, mapCommand, onSelect }: {
  visible: VisibleLayers; selectedId: string | null; selectedSatellite: SatelliteKey | 'all'; activeCompanies: string[]; mapMode: 'standard' | 'muted'; mapCommand: { id: number; type: 'reset' | 'fit' }; onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<LayerName, L.LayerGroup> | null>(null);
  const markerRef = useRef<Map<string, L.Marker>>(new Map());
  const satelliteRef = useRef<Record<SatelliteKey, { footprints: L.LayerGroup; elevation: L.LayerGroup }> | null>(null);
  const renderPortsRef = useRef<() => void>(() => {});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = L.map(container.current, { zoomControl: false }).setView([25.5,-75], 5);
    mapRef.current = map;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 130 }).addTo(map);
    const groups: Record<LayerName, L.LayerGroup> = {
      vessels: L.layerGroup(), ports: L.layerGroup(), teleports: L.layerGroup(),
      satelliteFootprints: L.layerGroup(), satelliteElevation: L.layerGroup()
    };
    layersRef.current = groups;
    const initialMapWidth = map.getContainer().clientWidth;
    vessels.forEach(v => {
      const marker = L.marker([v.latitude, v.longitude], { icon: vesselIcon(v, initialMapWidth) })
        .bindPopup(vesselPopup(v))
        .bindTooltip(v.name, { direction: 'top', offset: [0, -13] });
      marker.on('click', () => onSelectRef.current(v.id));
      marker.addTo(groups.vessels);
      markerRef.current.set(v.id, marker);
    });
    // Render nearby historical ports only. Keeping a bounded number of
    // markers on-screen avoids clutter and expensive global DOM layers.
    let portsCatalog: PortRecord[] = [];
    let disposed = false;
    const portIcon = L.icon({
      iconUrl: '/legacy/ports/port.png', iconSize: [15, 15],
      iconAnchor: [7, 12], popupAnchor: [0, -12]
    });
    const renderVisiblePorts = () => {
      groups.ports.clearLayers();
      if (!portsCatalog.length || map.getZoom() < 4) return;
      const bounds = map.getBounds().pad(0.06);
      const center = map.getCenter();
      const nearby = portsCatalog.filter(p => bounds.contains([p.latitude, p.longitude]));
      nearby.sort((a, b) =>
        center.distanceTo([a.latitude, a.longitude]) - center.distanceTo([b.latitude, b.longitude]));
      nearby.slice(0, 150).forEach(p => L.marker([p.latitude, p.longitude], { icon: portIcon })
        .bindTooltip(p.name)
        .bindPopup(`<div class="map-popup"><strong>${safeText(p.name)}</strong><p>Country: ${safeText(p.country)} · WPI ID: ${safeText(p.id)}</p><small>Historic, unverified port catalog. Not navigation data.</small></div>`)
        .addTo(groups.ports));
    };
    renderPortsRef.current = renderVisiblePorts;
    map.on('moveend zoomend', renderVisiblePorts);
    fetch('/data/historical-world-ports.json').then(response => {
      if (!response.ok) throw new Error('Historical world ports unavailable');
      return response.json() as Promise<{ ports: PortRecord[] }>;
    }).then(payload => {
      if (disposed) return;
      portsCatalog = payload.ports;
      renderVisiblePorts();
    }).catch(error => { if (!disposed) console.error('Port catalog could not load', error); });
    const teleportIcon = L.icon({
      iconUrl: '/legacy/teleports/antenna.png',
      iconSize: [23, 24], iconAnchor: [11, 22], popupAnchor: [0, -20]
    });
    teleports.forEach(p => L.marker([p.latitude, p.longitude], { icon: teleportIcon })
      .bindPopup(`<div class="map-popup"><strong>${safeText(p.name)}</strong><p>${safeText(p.detail)}</p><small>Demonstration location — not an active teleport listing.</small></div>`)
      .addTo(groups.teleports));
    // Resize only when the *visible* marker size changes (not on every pixel).
    // The 30px transparent icon hit area does not grow with the artwork.
    let lastVesselWidth = vesselDisplaySize(initialMapWidth).width;
    const observer = new ResizeObserver(() => {
      const mapWidth = map.getContainer().clientWidth;
      const nextWidth = vesselDisplaySize(mapWidth).width;
      if (nextWidth !== lastVesselWidth) {
        lastVesselWidth = nextWidth;
        vessels.forEach(v => markerRef.current.get(v.id)?.setIcon(vesselIcon(v, mapWidth)));
      }
      map.invalidateSize({ pan: false });
    });
    observer.observe(map.getContainer());

    // Satellite layers are loaded independently below.
    return () => {
      disposed = true;
      observer.disconnect();
      map.off('moveend zoomend', renderVisiblePorts);
      renderPortsRef.current = () => {};
      map.remove(); mapRef.current = null; layersRef.current = null;
      markerRef.current.clear(); satelliteRef.current = null;
    };
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
                const shape = L.geoJSON(feature as Parameters<typeof L.geoJSON>[0], { style: {
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
    mapRef.current?.getContainer().classList.toggle('map-muted', mapMode === 'muted');
  }, [mapMode]);

  useEffect(() => {
    if (mapCommand.id === 0 || !mapRef.current) return;
    const map = mapRef.current;
    if (mapCommand.type === 'reset') map.setView([25.5, -75], 5, { animate: true });
    else {
      const shown = vessels.filter(v => activeCompanies.includes(v.companyId));
      if (shown.length) map.fitBounds(L.latLngBounds(shown.map(v => [v.latitude, v.longitude] as [number, number])), {
        padding: [55, 55], maxZoom: 9, animate: true
      });
    }
  }, [mapCommand]);

  useEffect(() => {
    if (visible.ports) renderPortsRef.current();
  }, [visible.ports]);

  useEffect(() => {
    vessels.forEach(v => {
      const marker = markerRef.current.get(v.id);
      const group = layersRef.current?.vessels;
      if (!marker || !group) return;
      if (activeCompanies.includes(v.companyId)) group.addLayer(marker);
      else group.removeLayer(marker);
    });
  }, [activeCompanies]);

  useEffect(() => {
    const marker = selectedId && markerRef.current.get(selectedId);
    if (marker && visible.vessels && vessels.some(v => v.id === selectedId && activeCompanies.includes(v.companyId))) {
      mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }, [selectedId, visible.vessels, activeCompanies]);

  return <div ref={container} className="map-canvas" aria-label="Interactive maritime demo map" />;
}
