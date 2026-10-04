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
