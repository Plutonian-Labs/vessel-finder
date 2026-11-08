# Vessel Finder modernization

## Current state

The legacy app is a PHP/MySQL + JavaScript/Leaflet maritime map. Existing modules include cruise-company vessel markers, satellite footprint/elevation overlays, ports, teleports, and rain/radar layers. Its main entry point is `index.php`; it expects an existing MySQL schema and records.

## Security gate (before any public deployment)

- [x] Stop embedding database credentials in the active `php/dbconfig.php` source on the modernization branch.
- [ ] Rotate **all** credentials exposed in any previous public commits, even if currently unused.
- [ ] Revoke old database accounts and review database access logs where available.
- [ ] Assess all tracked files and Git history for additional tokens, secrets, and private datasets.
- [ ] Configure environment variables `VESSEL_DB_HOST`, `VESSEL_DB_PORT`, `VESSEL_DB_USER`, `VESSEL_DB_PASSWORD`, `VESSEL_DB_NAME` on the server; never commit a real .env.
- [ ] Validate application behavior locally before merging or deploying.

Removing a secret from a new commit does **not** erase it from Git history.

## Delivery milestones

1. **Legacy baseline:** recover database schema or create a sanitized fixture, run locally, capture maps and behavior; inventory third-party assets and licensing.
2. **Frontend foundation:** Vite + React + TypeScript; retain Leaflet initially. Implement map and independently toggleable vessels, teleports, ports and satellite layers.
3. **Data model:** normalize vessel metadata and position records, timestamps with freshness labels, and satellite datasets; distinguish live AIS from simulated/archived positions.
4. **API integration:** a backend adapter for a properly licensed AIS provider, rate limiting, caching and server-side credentials. Keep a zero-cost demo mode.
5. **Quality/deployment:** tests, accessible responsive UI, CI, preview deployments and Cloudflare Pages frontend; choose backend hosting only when needed.

## Known issues from source review

- `index.php` references data through `$_SESSION` and uses PHP includes; require MySQL data to render complete map.
- `js/companymmsiposition.js` uses a nested-loop join of vessel positions to vessel metadata, which can be simplified using an MMSI index.
- `js/positioning.js` appears unfinished and is not an authoritative source for the current map behavior.
- A large binary `images/icons/GitHubDesktop-linux-3.1.1-linux1.deb` is checked into the repository; review and remove from a subsequent tracked version if unnecessary.
- `index.php` contains a malformed `popup.sbs3aetLatLng` call and other prototype remnants.

This branch deliberately preserves the legacy implementation while the replacement app is developed and verified.
