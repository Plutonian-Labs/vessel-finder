# Vessel Finder — frontend prototype

This is a **standalone demo** under `web/`. The original PHP application at the repository root is preserved.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```bash
cd web
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Features

- Responsive maritime operations layout and interactive Leaflet map using OpenStreetMap tiles
- Layer toggles for demo vessel markers, actual port coordinates, **illustrative** teleport location and **schematic** satellite coverage
- Search and select demonstration vessels to pan/inspect map markers
- No secrets, no backend connection, no AIS subscription needed

**Data disclaimer:** All vessel coordinates, vessel identifiers, and satellite coverage geometry are fictional examples. Teleport location is illustrative, not a real facility. No live AIS information is provided. Do not use the demo for navigation, coverage planning, or operational decisions.

## Next

- Add map UI tests, validation and source attribution for licensed historical datasets
- Create server-side AIS data adapter with caching, timestamps and a clearly marked data freshness indicator
- Replace placeholder coverage with verified, licensed satellite datasets and a separate link geometry calculation
- Review OSM tile usage policy for public deployments or configure a commercial tile provider
