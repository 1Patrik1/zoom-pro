import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

const EMPTY_DB = {
  company: {},
  users: [],
  projects: [],
  attendance: [],
  logs: [],
  invoices: [],
  inventoryItems: [],
  inventoryMovements: [],
  collisions: [],
  troubleshooting: [],
  components: [],
  consumables: {},
  allCompanies: [],
  assignments: [],
  chats: [],
  projectGallery: []
};

export function useSync(token) {
  const [db, setDb] = useState(EMPTY_DB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastSyncRef = useRef(null);

  const reload = useCallback(async ({ full = false } = {}) => {
    if (!token) {
      setDb(EMPTY_DB);
      lastSyncRef.current = null;
      return;
    }
    setLoading(true);
    try {
      // Delta-sync: první načtení je plné, periodický polling posílá ?since= a
      // backend vrací jen změněné kolekce → menší payload a menší zátěž DB.
      const fullLoad = full || !lastSyncRef.current;
      const since = fullLoad ? '' : `?since=${encodeURIComponent(lastSyncRef.current)}`;
      const result = await api.request(`/api/sync${since}`, { token });

      if (result?.delta) {
        setDb((prev) => {
          const next = { ...prev };
          for (const [key, rows] of Object.entries(result.changed || {})) {
            if (Array.isArray(rows)) next[key] = rows;
          }
          return next;
        });
      } else {
        setDb(result);
      }
      lastSyncRef.current = result?.serverTime || new Date().toISOString();
      setError('');
    } catch (err) {
      // delta selhala → příště plný sync (self-healing)
      lastSyncRef.current = null;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const postAction = useCallback(async (endpoint, payload) => {
    if (!token) throw new Error('Chybí token');
    await api.post(endpoint, token, payload);
    await reload();
  }, [token, reload]);

  useEffect(() => {
    if (!token) return;
    reload({ full: true });
    const interval = setInterval(() => reload(), 5000);
    return () => clearInterval(interval);
  }, [token, reload]);

  return {
    db,
    loading,
    error,
    reload,
    postAction,
    setDb
  };
}
