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
