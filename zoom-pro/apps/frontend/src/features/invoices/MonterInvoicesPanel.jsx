import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export function MonterInvoicesPanel({ token, user, db }) {
  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [form, setForm] = useState({ projectId: '', hoursWorked: 8, hourlyRate: '', periodFrom: '', periodTo: '', note: '' });
  const [error, setError] = useState(null);

  const projects = db?.projects || [];
  const canApprove = ['VEDOUCI', 'ADMINISTRACE', 'REDITEL', 'SUPERADMIN'].includes(user?.role);

  const load = async () => {
    try {
      const r = await api.request('/api/monter-invoices/mine', { token });
      setMine(r.invoices || []);
      if (canApprove) {
        const p = await api.request('/api/monter-invoices/pending', { token });
        setPending(p.invoices || []);
      }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const payload = {
        ...form,
        hoursWorked: Number(form.hoursWorked),
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      };
      await api.request('/api/monter-invoices/create', { method: 'POST', token, body: payload });
      setForm({ projectId: '', hoursWorked: 8, hourlyRate: '', periodFrom: '', periodTo: '', note: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  const sendForApproval = async (id) => {
    await api.request('/api/monter-invoices/submit', { method: 'POST', token, body: { invoiceId: id } });
    load();
  };

  const approve = async (id) => {
    await api.request('/api/monter-invoices/approve', { method: 'POST', token, body: { invoiceId: id } });
    load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Můj výkaz práce (Montér)</h3>
        <p className="text-xs text-slate-500">Zadej hodiny, sazbu (pokud nemáš uloženou) a odešli ke schválení.</p>
        {error && <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</div>}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="font-black text-slate-700">Projekt (volitelně)</span>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="">— bez projektu —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-black text-slate-700">Hodiny</span>
            <input type="number" step="0.25" value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-black text-slate-700">Sazba Kč/hod (volitelně)</span>
            <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="použije se uložená" />
          </label>
          <label className="text-sm">
            <span className="font-black text-slate-700">Od</span>
            <input type="date" value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-black text-slate-700">Do</span>
            <input type="date" value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="font-black text-slate-700">Poznámka</span>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" rows={2} />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={submit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-emerald-700">
            Vytvořit výkaz
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Moje výkazy</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr><th>Období</th><th>Hodiny</th><th>Sazba</th><th>Celkem</th><th>Stav</th><th></th></tr>
          </thead>
          <tbody>
            {mine.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td>{inv.periodFrom ? new Date(inv.periodFrom).toLocaleDateString('cs-CZ') : '—'} → {inv.periodTo ? new Date(inv.periodTo).toLocaleDateString('cs-CZ') : '—'}</td>
                <td>{inv.hoursWorked} h</td>
                <td>{inv.hourlyRate} Kč</td>
                <td className="font-black">{Number(inv.totalAmount).toLocaleString('cs-CZ')} Kč</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>{inv.status === 'DRAFT' && <button onClick={() => sendForApproval(inv.id)} className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-black text-white">Odeslat ke schválení</button>}</td>
              </tr>
            ))}
            {!mine.length && <tr><td colSpan={6} className="py-4 text-center text-slate-400">Zatím žádné výkazy.</td></tr>}
          </tbody>
        </table>
      </section>

      {canApprove && (
        <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6">
          <h3 className="text-lg font-black text-amber-900">Ke schválení ({pending.length})</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-amber-800">
              <tr><th>Montér</th><th>Hodiny</th><th>Celkem</th><th>Poznámka</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv.id} className="border-t border-amber-200">
                  <td>{inv.monterName || inv.monterUserId}</td>
                  <td>{inv.hoursWorked} h × {inv.hourlyRate} Kč</td>
                  <td className="font-black">{Number(inv.totalAmount).toLocaleString('cs-CZ')} Kč</td>
                  <td className="text-xs">{inv.note}</td>
                  <td><button onClick={() => approve(inv.id)} className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white">Schválit</button></td>
                </tr>
              ))}
              {!pending.length && <tr><td colSpan={5} className="py-3 text-center text-amber-700">Nic ke schválení.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: 'bg-slate-200 text-slate-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    PAID: 'bg-purple-100 text-purple-800',
  };
  return <span className={`rounded-lg px-2 py-1 text-xs font-black ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}
