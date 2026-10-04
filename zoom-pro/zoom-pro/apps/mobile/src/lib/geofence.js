// (1) Background docházka — geofence watcher pro projekty
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { store, queue } from './storage.js';
import { criticalNotify } from './alerts.js';

let watchId = null;
let insideProjectId = null;

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function startGeofence(projects, { autoAttendance = true } = {}) {
  await stopGeofence();
  const perm = await Geolocation.requestPermissions();
  if (perm.location !== 'granted') return false;

  watchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    async (pos, err) => {
      if (err || !pos) return;
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let hit = null;
      for (const p of projects || []) {
        if (!p.lat || !p.lng) continue;
        const d = haversineM(me, { lat: p.lat, lng: p.lng });
        if (d <= (p.radius || 100)) { hit = p; break; }
      }
      if (hit && insideProjectId !== hit.id) {
        insideProjectId = hit.id;
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 100000,
            title: `📍 ${hit.name}`,
            body: 'Jsi na projektu — pípnout příchod?',
            extra: { projectId: hit.id, action: 'attendance_in' },
          }],
        }).catch(() => {});
        if (autoAttendance) {
          await queue.push({
            path: '/api/attendance',
            opts: { method: 'POST', body: { projectId: hit.id, type: 'PRICHOD', status: 'PRACE', lat: me.lat, lng: me.lng, note: 'geofence:auto' } },
          });
          criticalNotify({ title: `📍 ${hit.name}`, body: 'Automatický příchod zaznamenán (GPS geofence).' }).catch(() => {});
        }
      } else if (!hit && insideProjectId) {
        const leftId = insideProjectId;
        insideProjectId = null;
        await LocalNotifications.schedule({
          notifications: [{ id: Date.now() % 100000, title: 'Opouštíš projekt', body: 'Pípnout odchod?', extra: { projectId: leftId } }],
        }).catch(() => {});
        if (autoAttendance) {
          await queue.push({
            path: '/api/attendance',
            opts: { method: 'POST', body: { projectId: leftId, type: 'ODCHOD', status: 'PRACE', lat: me.lat, lng: me.lng, note: 'geofence:auto' } },
          });
          criticalNotify({ title: 'Opouštíš projekt', body: 'Automatický odchod zaznamenán (GPS geofence).' }).catch(() => {});
        }
      }
    }
  );
  await store.setToken.call(store, await store.getToken()); // keep alive
  return true;
}

export async function stopGeofence() {
  if (watchId) { await Geolocation.clearWatch({ id: watchId }); watchId = null; insideProjectId = null; }
}

export const geofence = { start: startGeofence, stop: stopGeofence };
