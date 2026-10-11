import { useEffect, useState } from 'react';
import { MapPin, LogIn, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { getPosition } from '../lib/media.js';

export function AttendanceScreen({ token, user }) {
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [pos, setPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.request('/api/sync', { token }).then((r) => {
      setProjects(r?.projects || []);
      setAttendance(r?.attendance || []);
      const ownAssignments = (r?.assignments || []).filter((item) => item.userId === user?.id);
      setAssignments(ownAssignments);
      if (user?.role !== 'MONTER' && ownAssignments.length) setProjectId(ownAssignments[0].projectId);
    }).catch(() => {});
  }, []);
  const isMonter = user?.role === 'MONTER';
  const assignedProjects = assignments.map((item) => projects.find((project) => project.id === item.projectId)).filter(Boolean);
  const todayKey = new Date().toLocaleDateString('sv-SE');
  const latestOwnToday = attendance.filter((item) => item.userId === user?.id
    && new Date(item.createdAt || item.checkIn).toLocaleDateString('sv-SE') === todayKey)
    .sort((a, b) => new Date(b.createdAt || b.checkIn) - new Date(a.createdAt || a.checkIn))[0];
  const nextKind = latestOwnToday?.type === 'PRICHOD' ? 'OUT' : 'IN';

  const locate = async () => {
    setErr(''); setMsg('');
    try {
      setLoading(true);
      const p = await getPosition();
      setPos(p);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const submit = async (kind, status = 'PRACE') => {
    setErr(''); setMsg('');
    if (status === 'PRACE' && !pos) { setErr('Nejdřív klikni „Zjistit polohu".'); return; }
    setLoading(true);
    try {
      const r = await api.requestOrQueue('/api/attendance', {
        method: 'POST', token,
        body: {
          projectId: status === 'PRACE' ? (isMonter ? null : projectId || null) : null,
          type: status === 'PRACE' ? (kind === 'IN' ? 'PRICHOD' : 'ODCHOD') : 'ABSENCE',
          status,
          lat: pos?.lat,
          lng: pos?.lng,
          note: status === 'PRACE' ? `Mobile ${kind}` : ''
        }
      });
      setAttendance((current) => [r.attendance || {
        id: `local-${Date.now()}`,
        userId: user?.id,
        projectId: status === 'PRACE' ? (isMonter ? null : projectId || null) : null,
        type: status === 'PRACE' ? (kind === 'IN' ? 'PRICHOD' : 'ODCHOD') : 'ABSENCE',
        status,
        createdAt: new Date().toISOString()
      }, ...current]);
      if (r.queued) setMsg('Offline — uloženo do fronty (odešle se v Sync).');
      else setMsg(status === 'PRACE' ? (kind === 'IN' ? 'Příchod zaznamenán ✅' : 'Odchod zaznamenán ✅') : 'Nepřítomnost nahlášena ✅');
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
        {!isMonter ? <label className="block text-sm">
          <span className="font-black text-slate-300">Projekt</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-2xl bg-slate-800 px-3 py-3 text-white outline-none">
            <option value="">— bez projektu —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label> : <div className="rounded-2xl bg-slate-800 px-3 py-3 text-sm">
          <span className="font-black text-slate-300">Přiřazený projekt</span>
          <p className="mt-1 text-white">{assignedProjects.find((p) => p.id === projectId)?.name || 'Automaticky podle přiřazení'}</p>
        </div>}

        <button onClick={locate} className="btn-ghost w-full mt-3" disabled={loading}>
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <MapPin size={16} />}
          {pos ? `📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)} m)` : 'Zjistit polohu'}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button onClick={() => submit(nextKind)} disabled={loading || !pos}
          className={`col-span-2 rounded-3xl p-6 shadow-lg active:scale-[0.98] disabled:opacity-50 ${nextKind === 'IN' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          {nextKind === 'IN' ? <LogIn size={24} className="mx-auto" /> : <LogOut size={24} className="mx-auto" />}
          <p className="mt-2 text-center text-base font-black">Zaznamenat {nextKind === 'IN' ? 'příchod' : 'odchod'}</p>
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button onClick={() => submit(null, 'NEMOC')} disabled={loading} className="rounded-3xl bg-amber-600 p-4 font-black shadow-lg disabled:opacity-50">Nahlásit nemoc</button>
        <button onClick={() => submit(null, 'DOVOLENA')} disabled={loading} className="rounded-3xl bg-rose-600 p-4 font-black shadow-lg disabled:opacity-50">Nahlásit dovolenou</button>
      </section>

      {msg && <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-sm text-emerald-200 flex items-center gap-2"><CheckCircle2 size={16} />{msg}</div>}
      {err && <div className="rounded-2xl bg-rose-500/20 border border-rose-500/40 p-3 text-sm text-rose-200">{err}</div>}
    </div>
  );
}
