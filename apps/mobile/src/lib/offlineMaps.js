// (8) Offline mapy — stáhne OSM tiles do IndexedDB pro dané bbox
import { get, set } from 'idb-keyval';

const TILE_SERVER = 'https://tile.openstreetmap.org';

function lon2tile(lon, z) { return Math.floor(((lon + 180) / 360) * Math.pow(2, z)); }
function lat2tile(lat, z) {
  return Math.floor(
    (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * Math.pow(2, z)
  );
}

export async function downloadTilesForProject(project, { zoomMin = 14, zoomMax = 17, onProgress } = {}) {
  if (!project?.lat || !project?.lng) throw new Error('Projekt nemá GPS.');
  const buffer = 0.003; // ~300 m
  const bbox = { minLat: project.lat - buffer, maxLat: project.lat + buffer, minLng: project.lng - buffer, maxLng: project.lng + buffer };

  let total = 0, done = 0;
  const jobs = [];
  for (let z = zoomMin; z <= zoomMax; z++) {
    const x1 = lon2tile(bbox.minLng, z), x2 = lon2tile(bbox.maxLng, z);
    const y1 = lat2tile(bbox.maxLat, z), y2 = lat2tile(bbox.minLat, z);
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) jobs.push({ z, x, y });
  }
  total = jobs.length;

  for (const j of jobs) {
    const key = `tile:${j.z}/${j.x}/${j.y}`;
    if (await get(key)) { done++; onProgress?.({ done, total }); continue; }
    try {
      const r = await fetch(`${TILE_SERVER}/${j.z}/${j.x}/${j.y}.png`);
      const blob = await r.blob();
      await set(key, blob);
    } catch { /* skip */ }
    done++;
    onProgress?.({ done, total });
  }
  return { total, done };
}

export async function getTile(z, x, y) {
  return await get(`tile:${z}/${x}/${y}`);
}
