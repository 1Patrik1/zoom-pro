// (9) Zoom Pro Watch companion — v mobilní app zobrazí jen ovládací panel
// (samotný Wear OS / watchOS target se přidá do android/wear a ios/watchos vazbě)
import { useState } from 'react';
import { Watch, Clock, MapPin, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { getPosition } from '../lib/media.js';

export function WatchScreen({ token }) {
  const [msg, setMsg] = useState('');

  const quick = async (kind) => {
    setMsg('');
    try {
      const pos = await getPosition();
      const r = await api.requestOrQueue('/api/attendance', {
        method: 'POST', token,
        body: { type: kind === 'IN' ? 'PRICHOD' : 'ODCHOD', status: 'PRACE', lat: pos.lat, lng: pos.lng, note: 'watch' }
      });
      setMsg(r.queued ? '📦 Fronta' : `✅ ${kind}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><Watch size={20} className="text-brand-500" /> Zoom Pro Watch</h2>
        <p className="text-xs text-slate-400">Rychlé akce pro hodinky — chodí přes Wear OS / watchOS companion.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => quick('IN')} className="rounded-3xl bg-emerald-600 p-6 shadow-lg active:scale-95">
          <Clock size={22} className="mx-auto" />
          <p className="mt-1 font-black text-center">Příchod</p>
        </button>
        <button onClick={() => quick('OUT')} className="rounded-3xl bg-rose-600 p-6 shadow-lg active:scale-95">
          <Clock size={22} className="mx-auto" />
          <p className="mt-1 font-black text-center">Odchod</p>
        </button>
      </div>

      <div className="card text-xs text-slate-400">
        <p className="font-black text-slate-300 mb-1"><MapPin size={12} className="inline" /> Watch integrace</p>
        <p>1. <b>Wear OS</b>: propoj přes companion aplikaci — přidej modul <code>android/wear</code>.</p>
        <p>2. <b>watchOS</b>: přidej WatchKit target v Xcode a WCSession bridging.</p>
        <p>3. Hodinky posílají eventy přes tuto app — token, offline queue.</p>
      </div>

      {msg && <p className="text-center text-sm font-black">{msg}</p>}
    </div>
  );
}
