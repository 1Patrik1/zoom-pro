import { useEffect, useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';

export function InvoicesScreen({ token }) {
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ projectId: '', hoursWorked: 8, hourlyRate: '', periodFrom: '', periodTo: '', note: '' });
  const [projects, setProjects] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const r = await api.request('/api/monter-invoices/mine', { token });
      setMine(r.invoices || []);
    } catch { /* offline */ }
    try {
      const s = await api.request('/api/sync', { token });
      setProjects(s?.projects || []);
    } catch { /* offline */ }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setMsg('');
    try {
      const payload = { ...form, hoursWorked: Number(form.hoursWorked), hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined };
      const r = await api.requestOrQueue('/api/monter-invoices/create', { method: 'POST', token, body: payload });
      setMsg(r.queued ? '📦 Fronta (Sync)' : '✅ Výkaz vytvořen');
      setForm({ projectId: '', hoursWorked: 8, hourlyRate: '', periodFrom: '', periodTo: '', note: '' });
      load();
    } catch (e) { setMsg('Chyba: ' + e.message); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black">Můj výkaz</h2>
        <p className="text-xs text-slate-400">Hodiny × sazba → schvaluje vedoucí.</p>
      </header>

      <div className="card space-y-2">
        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white">
          <option value="">— bez projektu —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" step="0.25" placeholder="Hodiny" value={form.hoursWorked}
            onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
            className="rounded-2xl bg-slate-800 px-3 py-3 text-white" />
          <input type="number" placeholder="Sazba Kč/h" value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            className="rounded-2xl bg-slate-800 px-3 py-3 text-white" />
          <input type="date" value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })}
            className="rounded-2xl bg-slate-800 px-3 py-3 text-white" />
          <input type="date" value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })}
            className="rounded-2xl bg-slate-800 px-3 py-3 text-white" />
        </div>
        <textarea rows={2} placeholder="Poznámka" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white" />
        <button onClick={submit} className="btn-primary w-full"><Send size={16} /> Vytvořit výkaz</button>
        {msg && <p className="text-center text-sm font-black">{msg}</p>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black">Moje výkazy</h3>
          <button onClick={load} className="text-xs text-slate-400"><RefreshCw size={14} /></button>
        </div>
        <div className="mt-2 space-y-2">
          {mine.map((inv) => (
            <div key={inv.id} className="rounded-2xl bg-slate-800 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-black">{Number(inv.totalAmount).toLocaleString('cs-CZ')} Kč</p>
                <span className="chip">{inv.status}</span>
              </div>
              <p className="text-xs text-slate-400">{inv.hoursWorked} h × {inv.hourlyRate} Kč</p>
            </div>
          ))}
          {!mine.length && <p className="text-center text-xs text-slate-500 py-3">Nic zatím.</p>}
        </div>
      </div>
    </div>
  );
}
