import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const CATEGORIES = [
  { code: '',            label: 'Vše' },
  { code: 'duct_round',  label: 'Potrubí kruhové' },
  { code: 'duct_rect',   label: 'Potrubí hranaté' },
  { code: 'elbow',       label: 'Kolena' },
  { code: 'reducer',     label: 'Redukce' },
  { code: 'tee',         label: 'T-kusy' },
  { code: 'damper',      label: 'Klapky' },
  { code: 'ahu',         label: 'VZT jednotky' },
  { code: 'insulation',  label: 'Izolace' },
  { code: 'filter',      label: 'Filtry' },
  { code: 'fasteners',   label: 'Spojovací materiál' },
  { code: 'flex',        label: 'Flexi hadice' },
  { code: 'other',       label: 'Ostatní' },
];

export function CatalogTab({ token, onPick }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState({ sku: '', name: '', category: 'duct_round', shape: 'round', diameterMm: 200, unit: 'ks' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    const qp = new URLSearchParams();
    if (search) qp.set('search', search);
    if (category) qp.set('category', category);
    api.request(`/api/distribution/catalog?${qp}`, { token }).then((r) => setRows(r.rows || []));
  };
  useEffect(() => { load(); }, [search, category]);

  const save = async () => {
    try {
      await api.request('/api/distribution/catalog', { method: 'POST', token, body: form });
      setForm({ sku: '', name: '', category: 'duct_round', shape: 'round', diameterMm: 200, unit: 'ks' });
      setMsg('Uloženo.');
      load();
      setTimeout(() => setMsg(null), 1500);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input placeholder="Hledat SKU / název" value={search} onChange={(e) => setSearch(e.target.value)}
            className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Rychlé přidání SKU</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-6">
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {CATEGORIES.filter((c) => c.code).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <select value={form.shape} onChange={(e) => setForm({ ...form, shape: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="round">Kruhové</option><option value="rect">Hranaté</option>
          </select>
          <input type="number" placeholder="Ø / W (mm)" value={form.diameterMm} onChange={(e) => setForm({ ...form, diameterMm: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-500">{msg}</p>
          <button onClick={save} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">Uložit SKU</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">SKU</th><th>Název</th><th>Kategorie</th><th>Tvar</th><th>Rozměry</th><th>Jednotka</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{r.sku}</td>
                <td>{r.name}</td>
                <td>{r.category}</td>
                <td>{r.shape}</td>
                <td className="text-xs">
                  {r.shape === 'round' ? `Ø ${r.diameterMm || '—'}` : `${r.widthMm || '—'}×${r.heightMm || '—'}`}
                  {r.lengthMm ? ` · L${r.lengthMm}` : ''}
                </td>
                <td>{r.unit}</td>
                <td className="text-right pr-3">
                  <button onClick={() => onPick && onPick(r)}
                    className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-black text-white">Ceníky</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Prázdné.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
