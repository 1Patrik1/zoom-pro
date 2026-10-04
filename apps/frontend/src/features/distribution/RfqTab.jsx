import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export function RfqTab({ token, db }) {
  const [rfqs, setRfqs] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [lines, setLines] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [compareId, setCompareId] = useState(null);
  const [compare, setCompare] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busySup, setBusySup] = useState(null);

  const projects = db?.projects || [];

  const loadAll = () => {
    api.request('/api/distribution/rfq', { token }).then((r) => setRfqs(r.rows || []));
    api.request('/api/distribution/catalog?', { token }).then((r) => setCatalog(r.rows || []));
  };
  useEffect(() => { loadAll(); }, []);

  const addLine = () => setLines((l) => [...l, { catalogItemId: '', quantity: 1, note: '' }]);
  const patchLine = (i, patch) => setLines((l) => l.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const rmLine = (i) => setLines((l) => l.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!lines.length) return;
    await api.request('/api/distribution/rfq', {
      method: 'POST', token,
      body: { projectId: projectId || null, deadline: deadline || null, note, lines },
    });
    setLines([]); setNote(''); setDeadline('');
    loadAll();
  };

  const openCompare = async (id) => {
    setCompareId(id);
    setMsg(null);
    const r = await api.request(`/api/distribution/rfq/${id}/compare`, { token });
    setCompare(r);
  };

  const makePO = async (rfqId, supplierId) => {
    setBusySup(supplierId);
    try {
      const r = await api.request(`/api/distribution/rfq/${rfqId}/convert`, { method: 'POST', token, body: { supplierId } });
      setMsg(`✅ Objednávka ${r.po?.poNumber || r.po?.id?.slice(0, 8)} vytvořena (${r.lineCount} položek${r.missing?.length ? `, bez ceny: ${r.missing.join(', ')}` : ''}).`);
      setCompare(null);
      setCompareId(null);
      loadAll();
    } catch (e) { setMsg(e.message); }
    finally { setBusySup(null); }
  };

  return (
    <div className="space-y-4">
      {msg && <div className="rounded-2xl bg-slate-800 p-3 text-sm font-black text-white">{msg}</div>}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Nová poptávka (RFQ)</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">— bez projektu —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Poznámka" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="mt-3 space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select value={l.catalogItemId} onChange={(e) => patchLine(i, { catalogItemId: e.target.value })}
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">— položka —</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.sku} — {c.name}</option>)}
              </select>
              <input type="number" min="1" value={l.quantity} onChange={(e) => patchLine(i, { quantity: Number(e.target.value) })}
                className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="pozn." value={l.note} onChange={(e) => patchLine(i, { note: e.target.value })}
                className="w-40 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={() => rmLine(i)} className="rounded-xl bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addLine} className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black">+ Řádek</button>
            <button onClick={create} disabled={!lines.length} className="rounded-xl bg-blue-600 px-4 py-1 text-xs font-black text-white disabled:opacity-50">Vytvořit RFQ</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Vytvořeno</th><th>Projekt</th><th>Deadline</th><th>Stav</th><th></th></tr>
          </thead>
          <tbody>
            {rfqs.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</td>
                <td>{r.projectId || '—'}</td>
                <td>{r.deadline ? new Date(r.deadline).toLocaleDateString('cs-CZ') : '—'}</td>
                <td><span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">{r.status}</span></td>
                <td className="text-right pr-3">
                  <button onClick={() => openCompare(r.id)} className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white">Porovnat nabídky</button>
                </td>
              </tr>
            ))}
            {!rfqs.length && <tr><td colSpan={5} className="p-6 text-center text-slate-400">Žádné poptávky.</td></tr>}
          </tbody>
        </table>
      </section>

      {compare && (
        <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-4">
          <h3 className="text-sm font-black text-emerald-900">Srovnání nabídek — RFQ {compareId?.slice(0, 8)}</h3>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs uppercase text-emerald-800">
              <tr><th className="p-2">Dodavatel</th><th>Celkem</th><th>Měna</th><th>Dodání</th><th>Chybí položek</th><th></th></tr>
            </thead>
            <tbody>
              {compare.table.map((row, i) => (
                <tr key={row.supplierId} className={`border-t border-emerald-200 ${i === 0 ? 'bg-white/50' : ''}`}>
                  <td className="p-2 font-black">{row.supplierName} {i === 0 && <span className="ml-2 rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white">TOP</span>}</td>
                  <td className="font-black">{Number(row.total).toLocaleString('cs-CZ')}</td>
                  <td>{row.currency}</td>
                  <td>{row.leadTimeDays} d</td>
                  <td>{row.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
