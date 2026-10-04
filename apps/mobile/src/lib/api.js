import { store, queue } from './storage.js';
import { Network } from '@capacitor/network';

async function request(path, { method = 'GET', body, token, apiUrl } = {}) {
  const base = apiUrl || (await store.getApiUrl());
  const auth = token || (await store.getToken());
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function online() {
  try { const s = await Network.getStatus(); return s.connected; } catch { return navigator.onLine; }
}

/**
 * Zavolá endpoint. Když je offline, zařadí do fronty a vrátí { queued: true }.
 * Fronta se synchronizuje ze SyncScreen.
 */
async function requestOrQueue(path, opts = {}) {
  if (await online()) {
    return request(path, opts);
  }
  await queue.push({ path, opts });
  return { queued: true };
}

async function syncQueue(onProgress) {
  const items = await queue.list();
  let ok = 0, fail = 0;
  for (const { key, val } of items) {
    try {
      await request(val.path, val.opts);
      await queue.remove(key);
      ok += 1;
    } catch (e) {
      await queue.update(key, { attempts: (val.attempts || 0) + 1, lastError: e.message });
      fail += 1;
    }
    onProgress && onProgress({ ok, fail, total: items.length });
  }
  return { ok, fail };
}

export const api = { request, requestOrQueue, online, syncQueue };
