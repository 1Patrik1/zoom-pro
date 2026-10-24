import { Preferences } from '@capacitor/preferences';
import { get, set, del, keys as idbKeys } from 'idb-keyval';

// Preferences pro krátká data (token, user), IDB pro fronty a foto
export const store = {
  async setToken(t) { await Preferences.set({ key: 'token', value: t || '' }); },
  async getToken() { const { value } = await Preferences.get({ key: 'token' }); return value || null; },
  async setUser(u) { await Preferences.set({ key: 'user', value: JSON.stringify(u || null) }); },
  async getUser() { const { value } = await Preferences.get({ key: 'user' }); try { return JSON.parse(value); } catch { return null; } },
  async setApiUrl(u) { await Preferences.set({ key: 'apiUrl', value: u }); },
  async getApiUrl() { const { value } = await Preferences.get({ key: 'apiUrl' }); return value || 'https://api.zoom-pro.app'; },
  async setAlarmMelody(value) { await Preferences.set({ key: 'alarmMelody', value: value || 'siren' }); },
  async getAlarmMelody() { const { value } = await Preferences.get({ key: 'alarmMelody' }); return value || 'siren'; },
  async setGpsAttendanceEnabled(enabled) { await Preferences.set({ key: 'gpsAttendanceEnabled', value: enabled ? 'true' : 'false' }); },
  async getGpsAttendanceEnabled() { const { value } = await Preferences.get({ key: 'gpsAttendanceEnabled' }); return value === 'true'; },
  async setGeofenceSession(session) { await Preferences.set({ key: 'geofenceSession', value: JSON.stringify(session || null) }); },
  async getGeofenceSession() { const { value } = await Preferences.get({ key: 'geofenceSession' }); try { return JSON.parse(value); } catch { return null; } },
  async setGeofenceConfig(config) { await Preferences.set({ key: 'geofenceConfig', value: JSON.stringify(config || null) }); },
  async getGeofenceConfig() { const { value } = await Preferences.get({ key: 'geofenceConfig' }); try { return JSON.parse(value); } catch { return null; } },
  async clear() { await Preferences.clear(); }
};

export const queue = {
  async push(item) {
    const id = `q:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await set(id, { ...item, id, ts: Date.now(), attempts: 0 });
    return id;
  },
  async list() {
    const ks = (await idbKeys()).filter((k) => String(k).startsWith('q:'));
    const items = await Promise.all(ks.map(async (k) => ({ key: k, val: await get(k) })));
    return items.sort((a, b) => (a.val?.ts || 0) - (b.val?.ts || 0));
  },
  async remove(key) { await del(key); },
  async update(key, patch) { const cur = await get(key); await set(key, { ...cur, ...patch }); }
};
