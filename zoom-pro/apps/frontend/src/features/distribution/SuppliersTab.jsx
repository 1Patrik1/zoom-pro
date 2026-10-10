import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const API_TYPES = ['API', 'EDI', 'ISDOC', 'CSV', 'EMAIL', 'SCRAPE'];

export function SuppliersTab({ token }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', ico: '', dic: '', email: '', phone: '', apiType: 'EMAIL', currency: 'CZK', paymentTermDays: 14, discountPct: 0, active: true });

  const load = () => api.request('/api/distribution/suppliers', { token }).then((r) => setRows(r.rows || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    await api.request('/api/distribution/suppliers', { method: 'POST', token, body: form });
    setForm({ name: '', ico: '', dic: '', email: '', phone: '', apiType: 'EMAIL', currency: 'CZK', paymentTermDays: 14, discountPct: 0, active: true });
    load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Nový dodavatel</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-6">
          <input placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <input placeholder="IČO" value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="DIČ" value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Tel." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.apiType} onChange={(e) => setForm({ ...form, apiType: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {API_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option>CZK</option><option>EUR</option><option>USD</option>
          </select>
          <input type="number" placeholder="Splatnost (dny)" value={form.paymentTermDays} onChange={(e) => setForm({ ...form, paymentTermDays: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="0.1" placeholder="Sleva %" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex justify-end">
          <button onClick={save} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">Uložit</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Název</th><th>Typ</th><th>Kontakt</th><th>Splatnost</th><th>Sleva</th><th>Měna</th><th>Aktivní</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{s.name} <span className="text-xs text-slate-500">({s.ico})</span></td>
                <td><span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">{s.apiType}</span></td>
                <td className="text-xs">{s.email}<br />{s.phone}</td>
                <td>{s.paymentTermDays} d</td>
                <td>{s.discountPct}%</td>
                <td>{s.currency}</td>
                <td>{s.active ? '✅' : '⛔'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Prázdné.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
