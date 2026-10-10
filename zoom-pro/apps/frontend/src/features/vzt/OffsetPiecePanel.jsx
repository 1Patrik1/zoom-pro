import { useMemo, useState } from 'react';
import { calculateOffsetPiece } from './calculations.js';

const DEFAULT = {
  shape: 'round',
  width: 250,
  height: 250,
  diameter: 250,
  offset: 300,
  angleDeg: 45,
  radiusRatio: 1.0,
  flangeAllowance: 20,
  totalAxialMm: '',
};

const ANGLE_PRESETS = [15, 30, 45, 60];

export function OffsetPiecePanel() {
  const [form, setForm] = useState(DEFAULT);

  const result = useMemo(() => calculateOffsetPiece({
    ...form,
    totalAxialMm: form.totalAxialMm === '' ? null : Number(form.totalAxialMm),
  }), [form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Porovnání pro všechny presety (živě)
  const comparisons = useMemo(() => ANGLE_PRESETS.map((deg) => ({
    deg,
    res: calculateOffsetPiece({
      ...form,
      angleDeg: deg,
      totalAxialMm: form.totalAxialMm === '' ? null : Number(form.totalAxialMm),
    }),
  })), [form]);

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Mezikus mezi dvěma koleny (změna osy)</h3>
          <p className="text-xs text-slate-500">Vzorec: {result.formula}. Kulaté i hranaté, úhly 15° / 30° / 45° / 60°.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => set({ shape: 'round' })}
            className={`rounded-2xl px-3 py-1 text-sm font-black ${form.shape === 'round' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Kulaté</button>
          <button type="button" onClick={() => set({ shape: 'rect' })}
            className={`rounded-2xl px-3 py-1 text-sm font-black ${form.shape === 'rect' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Hranaté</button>
        </div>
      </header>

      {/* Úhlové presety */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs font-black uppercase text-slate-500">Úhel kolena:</span>
        {ANGLE_PRESETS.map((deg) => (
          <button key={deg} type="button" onClick={() => set({ angleDeg: deg })}
            className={`rounded-xl px-3 py-1 text-xs font-black ${form.angleDeg === deg ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{deg}°</button>
        ))}
        <label className="ml-3 flex items-center gap-1 text-xs">
          <span className="text-slate-500">vlastní</span>
          <input type="number" min={5} max={75} value={form.angleDeg}
            onChange={(e) => set({ angleDeg: Number(e.target.value) })}
            className="w-16 rounded-xl border border-slate-300 px-2 py-1 text-xs" />
          <span className="text-slate-500">°</span>
        </label>
      </div>

      {/* Vstupy rozdělené do 3 skupin */}
      <div className="grid gap-4 lg:grid-cols-3">
        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-2 text-xs font-black uppercase text-slate-600">Rozměr potrubí</legend>
          {form.shape === 'round' ? (
            <label className="block text-sm">
              <span className="font-black text-slate-700">Průměr Ø (mm)</span>
              <input type="number" value={form.diameter} onChange={(e) => set({ diameter: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="font-black text-slate-700">Šířka W</span>
                <input type="number" value={form.width} onChange={(e) => set({ width: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="font-black text-slate-700">Výška H</span>
                <input type="number" value={form.height} onChange={(e) => set({ height: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-2 text-xs font-black uppercase text-slate-600">Geometrie sestavy</legend>
          <label className="block text-sm">
            <span className="font-black text-slate-700">Přesah osy (mm)</span>
            <input type="number" value={form.offset} onChange={(e) => set({ offset: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="mt-2 block text-sm">
            <span className="font-black text-slate-700">R / rozměr</span>
            <input type="number" step="0.1" value={form.radiusRatio} onChange={(e) => set({ radiusRatio: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            <span className="mt-1 block text-xs text-slate-500">Standard 1.0 (R = rozměr).</span>
          </label>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-2 text-xs font-black uppercase text-slate-600">Volitelné</legend>
          <label className="block text-sm">
            <span className="font-black text-slate-700">Přídavek na přírubu (mm/strana)</span>
            <input type="number" value={form.flangeAllowance} onChange={(e) => set({ flangeAllowance: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="mt-2 block text-sm">
            <span className="font-black text-slate-700">Celková osa (volitelně, mm)</span>
            <input type="number" value={form.totalAxialMm} onChange={(e) => set({ totalAxialMm: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Prázdné → z přesahu" />
          </label>
        </fieldset>
      </div>

      {/* Rozdělená vizualizace + výsledky */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <OffsetSvg result={result} shape={form.shape} />

        <div className="grid gap-3 md:grid-cols-2">
          <Metric label={`Řezaný mezikus L (${result.angleDeg}°)`} value={`${result.pieceLengthMm} mm`} accent />
          <Metric label="Mezikus po přírubách" value={`${result.pieceLengthNetMm} mm`} />
          <Metric label="Celková osa sestavy" value={`${result.totalAxialMm} mm`} />
          <Metric label="Projekce sestavy" value={`${result.projectedRunMm} mm`} />
          <Metric label="R kolena" value={`${result.elbowCenterRadiusMm} mm`} />
          <Metric label="Rozvin kolena (luk)" value={`${result.elbowArcMm} mm`} />
          <Metric label="Plocha mezikusu" value={`${result.surfaceAreaM2} m²`} />
          <Metric label="Plocha sestavy" value={`${result.totalAssemblySurfaceM2} m²`} />
          <Metric label="Hmotnost mezikusu" value={`${result.weightKg} kg`} />
          <Metric label="Hmotnost sestavy (2 kolena + L)" value={`${result.totalAssemblyWeightKg} kg`} accent />
        </div>
      </div>

      {result.warning && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">⚠ {result.warning}</div>
      )}

      {/* Porovnání úhlů */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-black uppercase text-slate-600">Porovnání úhlů (stejný přesah {form.offset} mm)</p>
        <div className="grid gap-2 md:grid-cols-4">
          {comparisons.map(({ deg, res }) => (
            <button key={deg} type="button" onClick={() => set({ angleDeg: deg })}
              className={`rounded-xl border p-3 text-left transition ${form.angleDeg === deg ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">{deg}°</span>
                <span className={`text-xs font-black ${res.pieceLengthMm > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {res.pieceLengthMm > 0 ? 'OK' : 'krátký'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">L = <b>{res.pieceLengthMm}</b> mm</p>
              <p className="text-xs text-slate-500">min. přesah {res.minimumOffsetPossibleMm} mm</p>
              <p className="text-xs text-slate-500">hmotnost {res.totalAssemblyWeightKg} kg</p>
            </button>
          ))}
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <summary className="cursor-pointer font-black">Jak to počítám</summary>
        <p className="mt-2">Dvě kolena zapojená proti sobě přenášejí osu o <code>2·R·(1 − cos α)</code>.</p>
        <p>Zbytek přesahu doplní rovný mezikus délky <code>L = (offset − 2·R·(1 − cos α)) / sin α</code>.</p>
        <p>U hranatého bereme R z většího rozměru, u kulatého z Ø. Rozvin kolena po střednici je <code>R·α (rad)</code>.</p>
      </details>
    </section>
  );
}

function OffsetSvg({ result, shape }) {
  // Sestavíme SVG cestu podle vypočítané geometrie
  const R = Math.max(result.elbowCenterRadiusMm, 30);
  const L = Math.max(result.pieceLengthMm, 0);
  const alpha = (result.angleDeg * Math.PI) / 180;
  const projected = result.projectedRunMm || 200;
  const offset = result.inputs.offset || 100;

  // Škálování do 460×220
  const scale = Math.min(420 / (projected + 60), 180 / (offset + 60));
  const s = Number.isFinite(scale) && scale > 0 ? scale : 0.4;

  const y0 = 180;
  const x0 = 30;
  const y1 = y0 - offset * s;
  const x1 = x0 + projected * s;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-black uppercase text-slate-500">Vizualizace ({shape === 'round' ? 'kulaté' : 'hranaté'}, {result.angleDeg}°)</p>
      <svg viewBox="0 0 480 220" className="w-full">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#0f172a" />
          </marker>
        </defs>

        {/* podklad */}
        <line x1={x0} y1={y0} x2={x0 + projected * s} y2={y0} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={x0 + projected * s} y1={y0} x2={x0 + projected * s} y2={y1} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

        {/* první rovný úsek */}
        <line x1={x0} y1={y0} x2={x0 + 40} y2={y0} stroke="#0369a1" strokeWidth="10" strokeLinecap="round" />

        {/* 1. koleno */}
        <path d={`M ${x0 + 40} ${y0} A ${R * s} ${R * s} 0 0 0 ${x0 + 40 + R * s * Math.sin(alpha)} ${y0 - R * s * (1 - Math.cos(alpha))}`}
          fill="none" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" />

        {/* mezikus L (skloněný) */}
        {L > 0 && (
          <line
            x1={x0 + 40 + R * s * Math.sin(alpha)}
            y1={y0 - R * s * (1 - Math.cos(alpha))}
            x2={x0 + 40 + R * s * Math.sin(alpha) + L * s * Math.cos(alpha)}
            y2={y0 - R * s * (1 - Math.cos(alpha)) - L * s * Math.sin(alpha)}
            stroke="#059669" strokeWidth="10" strokeLinecap="round" />
        )}

        {/* 2. koleno */}
        <path d={`M ${x0 + 40 + R * s * Math.sin(alpha) + L * s * Math.cos(alpha)} ${y0 - R * s * (1 - Math.cos(alpha)) - L * s * Math.sin(alpha)}
                 A ${R * s} ${R * s} 0 0 1 ${x0 + 40 + 2 * R * s * Math.sin(alpha) + L * s * Math.cos(alpha)} ${y0 - offset * s}`}
          fill="none" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" />

        {/* koncový rovný úsek */}
        <line x1={x0 + 40 + 2 * R * s * Math.sin(alpha) + L * s * Math.cos(alpha)} y1={y1}
              x2={x0 + 40 + 2 * R * s * Math.sin(alpha) + L * s * Math.cos(alpha) + 40} y2={y1}
              stroke="#0369a1" strokeWidth="10" strokeLinecap="round" />

        {/* kóty */}
        <line x1={x0} y1={y0 + 15} x2={x0 + projected * s + 40} y2={y0 + 15} stroke="#0f172a" strokeWidth="1" markerEnd="url(#arr)" markerStart="url(#arr)" />
        <text x={x0 + projected * s / 2} y={y0 + 30} fontSize="11" textAnchor="middle" fill="#0f172a" fontWeight="700">
          projekce {result.projectedRunMm} mm
        </text>

        <line x1={x0 + projected * s + 55} y1={y0} x2={x0 + projected * s + 55} y2={y1} stroke="#0f172a" strokeWidth="1" markerEnd="url(#arr)" markerStart="url(#arr)" />
        <text x={x0 + projected * s + 65} y={(y0 + y1) / 2} fontSize="11" fill="#0f172a" fontWeight="700">
          přesah {result.inputs.offset} mm
        </text>

        <text x="10" y="15" fontSize="10" fill="#64748b">L = {result.pieceLengthMm} mm · R = {result.elbowCenterRadiusMm} mm · α = {result.angleDeg}°</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-sky-700" /> rovné úseky</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-sky-500" /> kolena {result.angleDeg}°</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-emerald-600" /> řezaný mezikus L</span>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent ? 'text-blue-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
