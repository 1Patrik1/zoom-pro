// Sleduje synchronizovaná data a při nové kritické události spustí hlasitý alarm (3× 5 s)
// Pokrytí: chat, poruchy, havárie, kolize, sklad pod minimem, docházka mimo rádius
import { useEffect, useRef } from 'react';
import { playCriticalAlarm } from '../utils/alerts.js';

export function useCriticalAlerts(db, { enabled = true, onAlert } = {}) {
  const seenRef = useRef(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !db) return;
    const seen = seenRef.current;
    const fresh = [];

    const consider = (id, label, severity) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      if (initializedRef.current && (severity === 'CRITICAL' || severity === 'WARNING')) {
        fresh.push({ id, text: label, severity, time: Date.now() });
      }
    };

    // Kolize (kolize lidí, materiál pod minimum, rozpočet, překryvy)
    (db.collisions || []).forEach((c) =>
      consider(`col:${c.id}`, `Kolize: ${c.kind}`, String(c.severity || 'WARNING').toUpperCase()));

    // Poruchy / havárie / troubleshooting
    (db.troubleshooting || []).forEach((t) =>
      consider(`trb:${t.id}`, `Porucha: ${t.title || ''}`, String(t.severity || 'INFO').toUpperCase()));

    // Sklad pod minimem
    (db.inventoryItems || []).forEach((i) => {
      if (Number(i.quantity) <= Number(i.minQuantity)) {
        consider(`low:${i.id}:${i.quantity}`, `Sklad pod minimem: ${i.name}`, 'WARNING');
      }
    });

    // Docházka mimo rádius projektu
    (db.attendance || []).forEach((a) => {
      if (a.geoStatus === 'OUT_OF_RADIUS') {
        consider(`att:${a.id}`, `Docházka mimo rádius: ${a.email || ''}`, 'WARNING');
      }
    });

    // Platforma: firmy bez aktivní licence (allCompanies dostává jen SUPERADMIN)
    (db.allCompanies || []).forEach((c) => {
      if (!c.isActive) consider(`co:${c.id}:license`, `Firma bez aktivní licence: ${c.name}`, 'WARNING');
    });

    // Chat — nové zprávy v projektech
    (db.chats || []).forEach((m) =>
      consider(`chat:${m.id}`, `Nová zpráva (${m.projectName || 'projekt'}): ${m.authorName || ''}`, 'WARNING'));

    // První naplnění = baseline bez alarmu; až nové události zvoní
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (fresh.length) {
      // eslint-disable-next-line no-console
      console.warn('[ALERT]', fresh);
      // Důvod alarmu se vždy zanesene do seznamu (viditelný na hlavní liště),
      // siréna zazní jen když není alarm vypnutý.
      try { onAlert && onAlert(fresh); } catch { /* ignore */ }
      if (enabled) playCriticalAlarm({ times: 3, seconds: 5 }).catch(() => {});
    }
  }, [db, enabled]);
}
