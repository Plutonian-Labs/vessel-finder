/**
 * Convert the repository's historic JavaScript GIS arrays into data-only JSON.
 * This executes the checked-in legacy file in a time-limited VM context with
 * no access to process, filesystem, network or Node built-ins.
 */
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPath = path.resolve(webRoot, '../js/satellite_geoJSON.js');
const outputPath = path.join(webRoot, 'public/data/legacy-satellite-geometry.json');
const source = await readFile(legacyPath, 'utf8');
const names = [
  'AnikF1R_Footprint', 'AnikF1R_Elevation',
  'ABS3A_Footprint_345', 'ABS3A_Elevation',
  'Eutelsat113W_Footprint', 'Eutelsat113W_Elevation'
];
const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
new vm.Script(source, { filename: 'satellite_geoJSON.js' }).runInContext(context, { timeout: 3000 });
const extracted = Object.fromEntries(names.map(name => {
  const result = context[name];
  if (!Array.isArray(result)) throw new Error('Missing historic satellite array: ' + name);
  return [name, JSON.parse(JSON.stringify(result))];
}));
const validate = features => features.filter(feature =>
  feature?.type === 'Feature' &&
  ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(feature.geometry?.type) &&
  Array.isArray(feature.geometry?.coordinates)
);
const collections = {
  anik: {
    name: 'Anik F1R', slot: 'Historic dataset',
    footprints: validate(extracted.AnikF1R_Footprint),
    elevation: validate(extracted.AnikF1R_Elevation)
  },
  eutelsat: {
    name: 'Eutelsat 113 West A', slot: 'Historic dataset',
    footprints: validate(extracted.Eutelsat113W_Footprint),
    elevation: validate(extracted.Eutelsat113W_Elevation)
  },
  abs: {
    name: 'ABS-3A', slot: 'Historic dataset',
    footprints: validate(extracted.ABS3A_Footprint_345),
    elevation: validate(extracted.ABS3A_Elevation)
  }
};
const payload = {
  source: 'Original Vessel Finder js/satellite_geoJSON.js',
  status: 'historic-unverified', satelliteCollections: collections
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(payload));
console.log('Imported historical satellite geometry: ' + Object.entries(collections)
  .map(([, group]) => group.name + ' (' + group.footprints.length + ' footprint / ' + group.elevation.length + ' elevation)').join(', '));

const legacyVesselIcons = {
  atlantic: 'icon_ship_32-redbluewhite@0.25x.png',
  pacific: 'icon_ship_25-bluered@0.25x.png',
  caribbean: 'icon_ship_15-multiorange@0.25x.png'
};
const iconDirectory = path.join(webRoot, 'public/legacy/vessels');
await mkdir(iconDirectory, { recursive: true });
for (const [name, filename] of Object.entries(legacyVesselIcons)) {
  await copyFile(path.resolve(webRoot, '../images/markers/vessels/0.25x', filename), path.join(iconDirectory, name + '.png'));
}
console.log('Imported original vessel marker graphics for demo company layers');

/**
 * Historical port catalog from the original project.
 * The legacy CSV is headerless: WPI ID, region ID, name, country, lat, lon.
 * Parsed at build time and shipped as a static, unsynchronized demonstration
 * catalog; do not represent it as a current operational port database.
 */
const worldPortCsv = await readFile(path.resolve(webRoot, '../temp/WPIports.csv'), 'utf8');
const historicalPorts = worldPortCsv.split(/\r?\n/).filter(Boolean).map(line => {
  const fields = line.split(',');
  if (fields.length !== 6) return null;
  const [id, , name, country, latitudeText, longitudeText] = fields;
  const latitude = Number(latitudeText), longitude = Number(longitudeText);
  if (!id || !name || !country || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { id, name, country, latitude, longitude };
}).filter(Boolean);
if (historicalPorts.length < 1000) throw new Error('World port catalog missing or unexpectedly small');
await writeFile(path.join(webRoot, 'public/data/historical-world-ports.json'), JSON.stringify({
  source: 'Legacy Vessel Finder temp/WPIports.csv (WPI-derived archive)',
  status: 'historic-unverified',
  ports: historicalPorts
}));
const portAssetDirectory = path.join(webRoot, 'public/legacy/ports');
await mkdir(portAssetDirectory, { recursive: true });
await copyFile(path.resolve(webRoot, '../images/icons/ports-icon.png'),
  path.join(portAssetDirectory, 'port.png'));
const teleportAssetDirectory = path.join(webRoot, 'public/legacy/teleports');
await mkdir(teleportAssetDirectory, { recursive: true });
await copyFile(path.resolve(webRoot, '../images/markers/antennas/0.1x/antenna_green_01x.png'),
  path.join(teleportAssetDirectory, 'antenna.png'));
console.log('Imported historical port catalog: ' + historicalPorts.length + ' records, plus original port and teleport icons');
