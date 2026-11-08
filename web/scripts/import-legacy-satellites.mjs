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
