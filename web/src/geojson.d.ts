declare namespace GeoJSON {
  type Feature = {
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties?: Record<string, unknown> | null;
  };
}
