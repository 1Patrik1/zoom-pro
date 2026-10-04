import { useEffect, useState } from 'react';
import { MapPin, LogIn, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { getPosition } from '../lib/media.js';

export function AttendanceScreen({ token }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [pos, setPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.request('/api/sync', { token }).then((r) => setProjects(r?.projects || [])).catch(() => {});
  }, []);

  const locate = async () => {
    setErr(''); setMsg('');
    try {
      setLoading(true);
      const p = await getPosition();
      setPos(p);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const submit = async (kind) => {
    setErr(''); setMsg('');
    if (!pos) { setErr('Nejdřív klikni „Zjistit polohu".'); return; }
    setLoading(true);
    try {
      const r = await api.requestOrQueue('/api/attendance', {
        method: 'POST', token,
        body: {
          projectId: projectId || null,
          type: kind === 'IN' ? 'PRICHOD' : 'ODCHOD',
          status: 'PRACE',
          lat: pos.lat,
          lng: pos.lng,
          note: `Mobile ${kind}`
        }
      });
      if (r.queued) setMsg('Offline — uloženo do fronty (odešle se v Sync).');
      else setMsg(kind === 'IN' ? 'Příchod zaznamenán ✅' : 'Odchod zaznamenán ✅');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black">Docházka</h2>
        <p className="text-xs text-slate-400">GPS ověření proti projektu (radius z projektu).</p>
      </header>

      <section className="card">
        <label className="block text-sm">
          <span className="font-black text-slate-300">Projekt</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-2xl bg-slate-800 px-3 py-3 text-white outline-none">
            <option value="">— bez projektu —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <button onClick={locate} className="btn-ghost w-full mt-3" disabled={loading}>
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <MapPin size={16} />}
          {pos ? `📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)} m)` : 'Zjistit polohu'}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button onClick={() => submit('IN')} disabled={loading || !pos}
          className="rounded-3xl bg-emerald-600 p-6 shadow-lg active:scale-[0.98] disabled:opacity-50">
          <LogIn size={24} className="mx-auto" />
          <p className="mt-2 text-center text-base font-black">Příchod</p>
        </button>
        <button onClick={() => submit('OUT')} disabled={loading || !pos}
          className="rounded-3xl bg-rose-600 p-6 shadow-lg active:scale-[0.98] disabled:opacity-50">
          <LogOut size={24} className="mx-auto" />
          <p className="mt-2 text-center text-base font-black">Odchod</p>
        </button>
      </section>

      {msg && <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-sm text-emerald-200 flex items-center gap-2"><CheckCircle2 size={16} />{msg}</div>}
      {err && <div className="rounded-2xl bg-rose-500/20 border border-rose-500/40 p-3 text-sm text-rose-200">{err}</div>}
    </div>
  );
}
