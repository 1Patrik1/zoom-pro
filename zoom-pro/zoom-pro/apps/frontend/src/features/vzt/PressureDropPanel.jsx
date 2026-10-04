import { useMemo, useState } from 'react';
import { DUCT_MATERIALS, FITTING_ZETA } from './constants.js';
import { pressureDropSegment, velocityCheck } from './engine.js';

// Tlaková ztráta úseku podle EN 13779 (Colebrook) + místní ztráty (zeta)

const FITTING_LIST = Object.keys(FITTING_ZETA);

export function PressureDropPanel() {
  const [f, setF] = useState({
    shape: 'round', diameterMm: 200, widthMm: 400, heightMm: 200,
    lengthM: 10, flowM3h: 500, material: 'galvanized_steel', category: 'branch_duct',
    fittings: [{ type: 'elbow_90_round', count: 2 }, { type: 'filter_g4', count: 1 }],
  });

  const setFit = (i, patch) => setF({ ...f, fittings: f.fittings.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
  const removeFit = (i) => setF({ ...f, fittings: f.fittings.filter((_, k) => k !== i) });
  const addFit = () => setF({ ...f, fittings: [...f.fittings, { type: 'elbow_90_round', count: 1 }] });

  const result = useMemo(() => pressureDropSegment(f), [f]);
  const vCheck = velocityCheck(result.velocityMs, f.category);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Tlaková ztráta úseku</h3>
      <p className="text-xs text-slate-500">Třecí (Colebrook + Reynolds) + místní (zeta z VDI 2087 / ASHRAE).</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setF({ ...f, shape: 'round' })} className={`btn-pill ${f.shape === 'round' ? 'active' : ''}`}>Kruhové</button>
        <button onClick={() => setF({ ...f, shape: 'rect' })}  className={`btn-pill ${f.shape === 'rect' ? 'active' : ''}`}>Hranaté</button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        {f.shape === 'round'
          ? <Field label="Ø (mm)"><input type="number" value={f.diameterMm} onChange={(e) => setF({ ...f, diameterMm: Number(e.target.value) })} className="input" /></Field>
          : (<>
              <Field label="A (mm)"><input type="number" value={f.widthMm}  onChange={(e) => setF({ ...f, widthMm: Number(e.target.value) })} className="input" /></Field>
              <Field label="B (mm)"><input type="number" value={f.heightMm} onChange={(e) => setF({ ...f, heightMm: Number(e.target.value) })} className="input" /></Field>
            </>)}
        <Field label="Délka L (m)"><input type="number" step="0.1" value={f.lengthM} onChange={(e) => setF({ ...f, lengthM: Number(e.target.value) })} className="input" /></Field>
        <Field label="Průtok Q (m³/h)"><input type="number" value={f.flowM3h} onChange={(e) => setF({ ...f, flowM3h: Number(e.target.value) })} className="input" /></Field>
        <Field label="Materiál">
          <select value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} className="input">
            {Object.entries(DUCT_MATERIALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Kategorie potrubí">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="input">
            <option value="main_duct">Hlavní tah</option>
            <option value="branch_duct">Odbočka</option>
            <option value="terminal_duct">Před koncovkou</option>
            <option value="low_noise">Tichý provoz</option>
            <option value="extraction_kitchen">Odsávání kuchyň</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-black uppercase text-slate-500">Tvarovky / lokální ztráty (zeta)</p>
          <button onClick={addFit} className="btn btn-primary">➕ Přidat</button>
        </div>
        <div className="space-y-2">
          {f.fittings.map((fit, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select value={fit.type} onChange={(e) => setFit(i, { type: e.target.value })} className="input flex-1">
                {FITTING_LIST.map((t) => <option key={t} value={t}>{t} (ζ={FITTING_ZETA[t]})</option>)}
              </select>
              <input type="number" min={1} value={fit.count || 1} onChange={(e) => setFit(i, { count: Number(e.target.value) })} className="input w-20" />
              <button onClick={() => removeFit(i)} className="text-sm font-black text-red-600">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <Metric label="Průřez" value={`${result.areaM2} m²`} />
        <Metric label="Rychlost" value={`${result.velocityMs} m/s`} accent />
        <Metric label="Reynolds" value={result.reynolds.toLocaleString('cs-CZ')} />
        <Metric label="λ (třecí)" value={result.frictionFactor} />
        <Metric label="Dyn. tlak" value={`${result.dynamicPressurePa} Pa`} />
        <Metric label="Třecí ztráta" value={`${result.frictionPa} Pa`} />
        <Metric label="Místní ztráty" value={`${result.localPa} Pa`} />
        <Metric label="Celkem" value={`${result.totalPa} Pa`} accent />
      </div>

      <div className={`mt-3 rounded-xl border p-3 text-sm ${vCheck.level === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : vCheck.level === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
        {vCheck.text}
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.9rem; }
        .btn { border-radius: 0.75rem; padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 800; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-pill { border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.85rem; font-weight: 800; background: #f1f5f9; color: #334155; }
        .btn-pill.active { background: #2563eb; color: #fff; }
      `}</style>
    </section>
  );
}

function Field({ label, children }) {
  return <label className="block text-sm"><span className="font-black text-slate-700">{label}</span><div className="mt-1">{children}</div></label>;
}
function Metric({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent ? 'text-blue-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
