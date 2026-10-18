import { store, queue } from './storage.js';
import { canSyncQueuedItem, queueOwnerId, queueOwnershipError, stripQueuedCredentials } from './offline-queue-policy.js';
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
  if (!res.ok) throw new Error(data?.error || data?.message || data?.msg || `HTTP ${res.status}`);
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
  const ownerUserId = queueOwnerId(await store.getUser());
  if (!ownerUserId) {
    throw new Error('Nelze zařadit offline požadavek bez přihlášeného uživatele.');
  }
  const storedToken = await store.getToken();
  if (opts.token && opts.token !== storedToken) {
    throw new Error('Nelze bezpečně zařadit požadavek s jiným přihlašovacím tokenem.');
  }
  await queue.push({ path, opts: stripQueuedCredentials(opts), ownerUserId });
  return { queued: true };
}

async function syncQueue(onProgress) {
  const items = await queue.list();
  const currentUserId = queueOwnerId(await store.getUser());
  let ok = 0, fail = 0;
  for (const { key, val } of items) {
    if (!canSyncQueuedItem(val, currentUserId)) {
      if (!val.blocked) {
        await queue.update(key, {
          blocked: true,
          attempts: (val.attempts || 0) + 1,
          lastError: queueOwnershipError(val, currentUserId)
        });
      }
      fail += 1;
      onProgress && onProgress({ ok, fail, total: items.length });
      continue;
    }
    try {
      await request(val.path, stripQueuedCredentials(val.opts));
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
