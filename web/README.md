# Vessel Finder — modernization frontend

This is a standalone React/TypeScript maritime map under `web/`. The original PHP app and legacy JavaScript data remain at the repository root.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```bash
cd web
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`).

```bash
npm run build
npm run preview
```

The `predev` and `prebuild` tasks convert the original satellite GIS JavaScript arrays into JSON at `web/public/data/legacy-satellite-geometry.json`. No MySQL database is required. The conversion runs the **checked-in legacy script** inside a restricted and time-limited Node VM. Review legacy source before running on untrusted forks.

## Features

- Search and select simulated vessels; responsive map/sidebar UI
- Port and illustrative teleport markers
- **Restored original geometry:** Anik F1R, Eutelsat 113 West A and ABS-3A footprint shapes, along with legacy elevation contours
- Independently toggle footprint/elevation layers and filter by satellite
- OpenStreetMap base layer

**Data disclaimer:** Vessel positions are fictional. Historical satellite geometry is sourced from the original project and has not been checked for accuracy or current service coverage. The teleport is illustrative. This tool is not suitable for navigation, telecom operational decisions, or current satellite service planning.

## Still to migrate

- Legacy vessel-company marker icons and company filtering
- Database-backed port and teleport records, after sanitization and schema review
- Per-satellite visibility controls, original map backgrounds and radar
- Operational AIS adapter, data freshness, backend caching and key protection
- Unit/UI tests and licensing reviews

## Original vessel icon restoration

The asset-import step copies three of the **original** ship graphics from `images/markers/vessels/0.25x` into the frontend's public assets for demonstration company filters. These are fictitious demonstration companies; do not interpret their names, sample coordinates or membership as real cruise-line records. Historical company mappings remain in the legacy database and will require a separate validated import.

## Responsive vessel marker sizing

Ship markers retain the original PNG's 23:7 aspect ratio. Visible sizes are tied to the **map container width** rather than map zoom or browser dimensions: approximately 14 px on compact maps, around 17–21 px on typical desktop maps, capped at 26 px on very wide maps. The transparent clickable target remains 30 × 30 px for usability. Resizing the window or the sidebar updates symbols automatically.

## Historical world ports and map controls

The checked-in legacy `temp/WPIports.csv` contains **3,630 historic WPI-derived records**; a build-time parser validates coordinates and exports `web/public/data/historical-world-ports.json` without a database. The world ports toggle is off by default. At zoom 4 or greater, the map displays only the **150 closest port markers within the viewport**, updating after map movement; on wider views, zoom in for more detail.

The original port graphic and antenna artwork are copied into `web/public/legacy`. Teleport positions previously came from a MySQL `Teleports` table that is **not checked in**; the only teleport remains a conspicuously marked illustrative location.

Map tools can reset to the Caribbean, fit the currently selected demo ships and switch between standard/muted OSM map styling. The muted option applies a local CSS filter to the **same OSM tiles**, not another provider or secret API key. Public deployment requires following [OSM's tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and verifying the historic WPI dataset's provenance/licensing and accuracy.

