import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export function PricesTab({ token, selectedItem }) {
  const [suppliers, setSuppliers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [form, setForm] = useState({ supplierId: '', supplierSku: '', price: 0, currency: 'CZK', moq: 1, leadTimeDays: 3, priority: 100 });

  useEffect(() => {
    api.request('/api/distribution/suppliers', { token }).then((r) => setSuppliers(r.rows || []));
  }, []);

  useEffect(() => {
    if (selectedItem?.id) {
      api.request(`/api/distribution/prices/${selectedItem.id}`, { token }).then((r) => setPrices(r.rows || []));
    } else setPrices([]);
  }, [selectedItem]);

  if (!selectedItem) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Vyber položku v záložce <b>Katalog</b> (tlačítko <b>Ceníky</b> u řádku).
      </div>
    );
  }

  const save = async () => {
    await api.request('/api/distribution/prices', {
      method: 'POST', token, body: { ...form, catalogItemId: selectedItem.id },
    });
    const r = await api.request(`/api/distribution/prices/${selectedItem.id}`, { token });
    setPrices(r.rows || []);
    setForm({ supplierId: '', supplierSku: '', price: 0, currency: 'CZK', moq: 1, leadTimeDays: 3, priority: 100 });
  };

  const best = prices[0];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow">
        <p className="text-xs font-black uppercase opacity-80">Aktivní položka</p>
        <p className="text-lg font-black">{selectedItem.name}</p>
        <p className="text-xs opacity-80">SKU: {selectedItem.sku} · {selectedItem.category}</p>
        {best && (
          <p className="mt-2 text-sm">
            <b>Nejlepší cena:</b> {best.price} {best.currency} u <b>{best.supplierName}</b> ({best.leadTimeDays} d)
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Přidat cenu dodavatele</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-7">
          <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2">
            <option value="">— dodavatel —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="SKU dodavatele" value={form.supplierSku} onChange={(e) => setForm({ ...form, supplierSku: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Cena" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option>CZK</option><option>EUR</option><option>USD</option>
          </select>
          <input type="number" placeholder="MOQ" value={form.moq} onChange={(e) => setForm({ ...form, moq: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Dodání (d)" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex justify-end">
          <button onClick={save} disabled={!form.supplierId} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Uložit cenu</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Dodavatel</th><th>SKU</th><th>Cena</th><th>Měna</th><th>MOQ</th><th>Dodání</th><th>Priorita</th></tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={p.id} className={`border-t border-slate-100 ${i === 0 ? 'bg-emerald-50' : ''}`}>
                <td className="p-3 font-black">{p.supplierName} {i === 0 && <span className="ml-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white">TOP</span>}</td>
                <td className="text-xs">{p.supplierSku || '—'}</td>
                <td className="font-black">{Number(p.price).toLocaleString('cs-CZ')}</td>
                <td>{p.currency}</td>
                <td>{p.moq}</td>
                <td>{p.leadTimeDays} d</td>
                <td>{p.priority}</td>
              </tr>
            ))}
            {!prices.length && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Bez ceníků.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
