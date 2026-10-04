// Souhrn diagnostiky a integrací
import { useEffect, useState } from 'react';
import { Activity, Fingerprint, Bell, ScanLine, Compass, Map, Watch, PenTool } from 'lucide-react';
import { bio } from '../lib/biometric.js';
import { registerPush } from '../lib/push.js';
import { geofence } from '../lib/geofence.js';
import { api } from '../lib/api.js';

export function DiagnosticsScreen({ token }) {
  const [bioOk, setBioOk] = useState(false);
  const [gfRunning, setGfRunning] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { bio.isAvailable().then(setBioOk); }, []);

  const toggleGf = async () => {
    if (gfRunning) { await geofence.stop(); setGfRunning(false); return; }
    const s = await api.request('/api/sync', { token }).catch(() => null);
    await geofence.start(s?.projects || [], { autoAttendance: true });
    setGfRunning(true);
    setMsg('Geofence běží na pozadí.');
  };

  const activatePush = async () => {
    const r = await registerPush(token);
    setMsg(r.ok ? `✅ Push token: ${r.token?.slice(0, 12)}…` : `❌ ${r.reason}`);
  };

  const Row = ({ icon: I, title, desc, action }) => (
    <div className="card flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600/20 text-brand-400"><I size={18} /></div>
        <div>
          <p className="font-black text-sm">{title}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><Activity size={20} className="text-brand-500" /> Integrace</h2>
        <p className="text-xs text-slate-400">Zapni pokročilé funkce montážní aplikace.</p>
      </header>

      <Row icon={Bell} title="Push notifikace (FCM)" desc="Firebase Cloud Messaging"
        action={<button onClick={activatePush} className="btn-ghost text-xs">Aktivovat</button>} />
      <Row icon={Fingerprint} title="Biometrie" desc={bioOk ? 'Dostupné (Face ID / Fingerprint)' : 'Není dostupné'}
        action={<span className={`chip ${bioOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{bioOk ? 'OK' : '—'}</span>} />
      <Row icon={Map} title="Auto docházka (geofence)" desc="Auto pípnutí při vstupu na projekt"
        action={<button onClick={toggleGf} className={`btn ${gfRunning ? 'bg-rose-600' : 'bg-emerald-600'} text-white text-xs`}>{gfRunning ? 'Vypnout' : 'Zapnout'}</button>} />
      <Row icon={ScanLine} title="QR/EAN skener" desc="Kamera + ML Kit" action={<span className="chip">Screen: Skener</span>} />
      <Row icon={Compass} title="Kompas + úhloměr" desc="Gyroskop + accelerometer" action={<span className="chip">Screen: Úhloměr</span>} />
      <Row icon={PenTool} title="Podpis prstem" desc="Canvas SVG pro protokoly" action={<span className="chip">Screen: Podpis</span>} />
      <Row icon={Watch} title="Wear OS / watchOS" desc="Companion pro hodinky" action={<span className="chip">Screen: Watch</span>} />

      {msg && <div className="rounded-2xl bg-slate-800 p-3 text-sm">{msg}</div>}
    </div>
  );
}
