import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export function PoTab({ token }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);
  const [recv, setRecv] = useState(null); // { id, po, lines, qtys }
  const [busy, setBusy] = useState(false);

  const load = () => api.request('/api/distribution/po', { token }).then((r) => setRows(r.rows || [])).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await api.request(`/api/distribution/po/${id}/approve`, { method: 'POST', token, body: {} });
      setMsg('PO schváleno.');
      load();
    } catch (e) { setMsg(e.message); }
  };

  const openReceive = async (id) => {
    try {
      const r = await api.request(`/api/distribution/po/${id}`, { token });
      const qtys = {};
      (r.lines || []).forEach((l) => { qtys[l.catalogItemId] = Number(l.qty); });
      setRecv({ id, po: r.po, lines: r.lines || [], qtys });
      setMsg(null);
    } catch (e) { setMsg(e.message); }
  };

  const confirmReceive = async () => {
    if (!recv) return;
    setBusy(true);
    try {
      const lines = recv.lines
        .map((l) => ({ catalogItemId: l.catalogItemId, qty: Number(recv.qtys[l.catalogItemId]) || 0 }))
        .filter((l) => l.qty > 0);
      const r = await api.request(`/api/distribution/po/${recv.id}/receive`, { method: 'POST', token, body: { lines } });
      setMsg(`✅ Dodávka přijata — naskladněno ${r.received} položek${r.skipped ? `, přeskočeno ${r.skipped}` : ''}${r.errors?.length ? ` (chyby: ${r.errors.join('; ')})` : ''}.`);
      setRecv(null);
      load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Objednávky (PO)</h3>
        <p className="mt-1 text-xs text-slate-500">
          PO se zakládají z <b>Poptávky → Porovnat nabídky → Vytvořit PO</b>.
          Po schválení (Vedoucí / Ředitel) se převzetím naskladní do skladu.
        </p>
        {msg && <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{msg}</p>}
      </section>

      {recv && (
        <section className="rounded-3xl border border-blue-300 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-slate-900">Převzetí dodávky — {recv.po.poNumber || recv.id.slice(0, 8)}</h3>
          <p className="text-xs text-slate-500">Zadej přijaté množství po řádcích. Položky se automaticky naskladní (podle SKU).</p>
          <div className="mt-3 space-y-2">
            {recv.lines?.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl bg-white p-2 text-sm">
                <span className="font-black">{l.sku}</span>
                <span className="flex-1 truncate">{l.name}</span>
                <input
                  type="number" min="0"
                  value={recv.qtys[l.catalogItemId] ?? ''}
                  onChange={(e) => setRecv({ ...recv, qtys: { ...recv.qtys, [l.catalogItemId]: e.target.value } })}
                  className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-center"
                />
                <span className="text-xs text-slate-400">{l.unit || 'ks'}</span>
              </div>
            ))}
            {!recv.lines.length && <p className="text-xs text-slate-500">PO nemá žádné položky.</p>}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setRecv(null)} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-black">Zrušit</button>
            <button onClick={confirmReceive} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              {busy ? 'Ukládám…' : 'Převzít a naskladnit'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Číslo</th><th>Dodavatel</th><th>Projekt</th><th>Stav</th><th>Celkem</th><th>Položek</th><th></th></tr>
          </thead>
          <tbody>
            {rows?.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{p.poNumber || p.id.slice(0, 8)}</td>
                <td>{p.supplierName || '—'}</td>
                <td className="text-xs">{p.projectName || '—'}</td>
                <td><span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">{p.status}</span></td>
                <td className="font-black">{p.totalAmount != null ? `${Number(p.totalAmount).toLocaleString('cs-CZ')} ${p.currency || 'CZK'}` : '—'}</td>
                <td>{p.lineCount ?? 0}</td>
                <td className="text-right pr-3">
                  {(p.status === 'DRAFT' || p.status === 'PENDING') && (
                    <button onClick={() => approve(p.id)} className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white">Schválit</button>
                  )}
                  {['APPROVED', 'SENT', 'CONFIRMED', 'SHIPPED'].includes(p.status) && (
                    <button onClick={() => openReceive(p.id)} className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-black text-white">Převzít</button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Zatím žádné PO.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
