import { useEffect, useMemo, useRef, useState } from 'react';

// Odskok / Redukce / Plocha / Průtok — přepsané z kalkulacka-vzt.html do Reactu
// s live náhledem na <canvas>.

function useCanvas(draw, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx, c);
  }, deps);
  return ref;
}

export function OdskokCalc() {
  const [h, setH] = useState(300);
  const [ang, setAng] = useState(45);
  const [gap, setGap] = useState(0);

  const rad = (Number(ang) * Math.PI) / 180;
  const L = h > 0 && ang > 0 && ang < 90 ? h / Math.sin(rad) - Number(gap) : 0;
  const S = h > 0 && ang > 0 && ang < 90 ? h / Math.tan(rad) : 0;

  const cvsRef = useCanvas((ctx, c) => {
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const startX = 30, startY = c.height - 40;
    let drawH = Math.min(120, Math.max(20, Number(h) * 0.4));
    const dx = drawH / Math.tan(rad || 0.001);
    const endX = startX + 40 + Math.min(200, dx);
    const endY = startY - drawH;
    ctx.beginPath();
    ctx.moveTo(startX, startY); ctx.lineTo(startX + 40, startY);
    ctx.lineTo(endX, endY); ctx.lineTo(endX + 40, endY);
    ctx.stroke();
    ctx.fillStyle = '#0f172a'; ctx.font = '12px sans-serif';
    ctx.fillText(`H: ${h} mm`, endX + 6, endY + drawH / 2);
    ctx.fillText(`${ang}°`, startX + 46, startY - 6);
  }, [h, ang]);

  return (
    <Card title="Odskok (Z-přesah)" subtitle="Výpočet šikmé délky a půdorysu">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Výška H (mm)"><input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} className="input" /></Field>
        <Field label="Úhel (°)"><input type="number" value={ang} onChange={(e) => setAng(Number(e.target.value))} className="input" /></Field>
        <Field label="Odsazení gap (mm)"><input type="number" value={gap} onChange={(e) => setGap(Number(e.target.value))} className="input" /></Field>
      </div>
      <canvas ref={cvsRef} width={520} height={180} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50" />
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Metric label="Šikmá délka L" value={`${L.toFixed(1)} mm`} accent />
        <Metric label="Půdorysná projekce S" value={`${S.toFixed(1)} mm`} />
      </div>
    </Card>
  );
}

export function RedukceCalc() {
  const [type, setType] = useState('rect-rect');
  const [f, setF] = useState({ a1: 400, b1: 200, a2: 250, b2: 150, d1: 250, d2: 160, L: 300 });

  const set = (patch) => setF({ ...f, ...patch });

  const res = useMemo(() => {
    const L = Number(f.L) || 1;
    if (type === 'rect-rect') {
      const A1 = Number(f.a1), B1 = Number(f.b1), A2 = Number(f.a2), B2 = Number(f.b2);
      const diffB = Math.abs(B1 - B2) / 2, diffA = Math.abs(A1 - A2) / 2;
      const slantA = Math.sqrt(L * L + diffB * diffB);
      const slantB = Math.sqrt(L * L + diffA * diffA);
      const area = (((A1 + A2) / 2) * slantA * 2 + ((B1 + B2) / 2) * slantB * 2) / 1e6;
      const angle = Math.atan(Math.max(diffA, diffB) / L) * 180 / Math.PI;
      return { areaM2: area, angleDeg: angle };
    }
    if (type === 'round-round') {
      const R1 = Number(f.d1) / 2, R2 = Number(f.d2) / 2;
      const s = Math.sqrt((R1 - R2) ** 2 + L * L);
      const area = (Math.PI * (R1 + R2) * s) / 1e6;
      const angle = Math.atan(Math.abs(R1 - R2) / L) * 180 / Math.PI;
      return { areaM2: area, angleDeg: angle };
    }
    // rect -> round
    const A1 = Number(f.a1), B1 = Number(f.b1), D2 = Number(f.d2);
    const perimRect = 2 * (A1 + B1);
    const perimRound = Math.PI * D2;
    const equivD1 = (A1 + B1) / 2;
    const s = Math.sqrt(((equivD1 - D2) / 2) ** 2 + L * L);
    const area = (((perimRect + perimRound) / 2) * s) / 1e6;
    const angle = Math.atan(Math.abs(equivD1 - D2) / 2 / L) * 180 / Math.PI;
    return { areaM2: area, angleDeg: angle };
  }, [f, type]);

  const angleClass = res.angleDeg > 45 ? 'text-red-600' : res.angleDeg > 30 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <Card title="Redukce / přechod" subtitle="Hran-Hran / Kruh-Kruh / Hran-Kruh">
      <div className="mb-3 flex gap-2">
        {[['rect-rect', 'Hran–Hran'], ['round-round', 'Kruh–Kruh'], ['rect-round', 'Hran–Kruh']].map(([k, l]) => (
          <button key={k} onClick={() => setType(k)}
            className={`rounded-xl px-3 py-1 text-sm font-black ${type === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {(type === 'rect-rect' || type === 'rect-round') && <>
          <Field label="A1 vstup (mm)"><input type="number" value={f.a1} onChange={(e) => set({ a1: e.target.value })} className="input" /></Field>
          <Field label="B1 vstup (mm)"><input type="number" value={f.b1} onChange={(e) => set({ b1: e.target.value })} className="input" /></Field>
        </>}
        {type === 'round-round' && <Field label="Ø1 (mm)"><input type="number" value={f.d1} onChange={(e) => set({ d1: e.target.value })} className="input" /></Field>}
        {type === 'rect-rect' && <>
          <Field label="A2 výstup (mm)"><input type="number" value={f.a2} onChange={(e) => set({ a2: e.target.value })} className="input" /></Field>
          <Field label="B2 výstup (mm)"><input type="number" value={f.b2} onChange={(e) => set({ b2: e.target.value })} className="input" /></Field>
        </>}
        {(type === 'round-round' || type === 'rect-round') &&
          <Field label="Ø2 (mm)"><input type="number" value={f.d2} onChange={(e) => set({ d2: e.target.value })} className="input" /></Field>}
        <Field label="Délka L (mm)"><input type="number" value={f.L} onChange={(e) => set({ L: e.target.value })} className="input" /></Field>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Metric label="Plocha plechu" value={`${res.areaM2.toFixed(2)} m²`} accent />
        <Metric label={<span>Úhel náběhu <span className={angleClass}>({res.angleDeg.toFixed(0)}°)</span></span>}
          value={res.angleDeg > 45 ? '⚠ Redukce příliš krátká' : res.angleDeg > 30 ? 'ℹ Přijatelné' : '✓ V pořádku'} />
      </div>
    </Card>
  );
}

export function PlochaCalc() {
  const [shape, setShape] = useState('rect');
  const [a, setA] = useState(400), [b, setB] = useState(200), [d, setD] = useState(200), [L, setL] = useState(1);

  const area = shape === 'rect'
    ? (2 * (Number(a) + Number(b)) / 1000) * Number(L)
    : (Math.PI * (Number(d) / 1000)) * Number(L);

  return (
    <Card title="Plocha pláště" subtitle="m² pláště pro daný úsek">
      <div className="mb-3 flex gap-2">
        <button onClick={() => setShape('rect')} className={`btn-pill ${shape === 'rect' ? 'active' : ''}`}>Hranaté</button>
        <button onClick={() => setShape('round')} className={`btn-pill ${shape === 'round' ? 'active' : ''}`}>Kruhové</button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {shape === 'rect' ? <>
          <Field label="A (mm)"><input type="number" value={a} onChange={(e) => setA(e.target.value)} className="input" /></Field>
          <Field label="B (mm)"><input type="number" value={b} onChange={(e) => setB(e.target.value)} className="input" /></Field>
        </> : (
          <Field label="Ø (mm)"><input type="number" value={d} onChange={(e) => setD(e.target.value)} className="input" /></Field>
        )}
        <Field label="Délka (m)"><input type="number" value={L} onChange={(e) => setL(e.target.value)} className="input" /></Field>
      </div>
      <div className="mt-3">
        <Metric label="Plocha pláště" value={`${area.toFixed(2)} m²`} accent />
      </div>
    </Card>
  );
}

export function PrutokCalc() {
  const [shape, setShape] = useState('rect');
  const [a, setA] = useState(400), [b, setB] = useState(200), [d, setD] = useState(200), [v, setV] = useState(4);

  const areaM2 = shape === 'rect' ? (Number(a) * Number(b)) / 1e6 : Math.PI * ((Number(d) / 2000) ** 2);
  const Q = Math.round(areaM2 * Number(v) * 3600);

  return (
    <Card title="Průtok Q" subtitle="m³/h z rychlosti a průřezu">
      <div className="mb-3 flex gap-2">
        <button onClick={() => setShape('rect')} className={`btn-pill ${shape === 'rect' ? 'active' : ''}`}>Hranaté</button>
        <button onClick={() => setShape('round')} className={`btn-pill ${shape === 'round' ? 'active' : ''}`}>Kruhové</button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {shape === 'rect' ? <>
          <Field label="A (mm)"><input type="number" value={a} onChange={(e) => setA(e.target.value)} className="input" /></Field>
          <Field label="B (mm)"><input type="number" value={b} onChange={(e) => setB(e.target.value)} className="input" /></Field>
        </> : (
          <Field label="Ø (mm)"><input type="number" value={d} onChange={(e) => setD(e.target.value)} className="input" /></Field>
        )}
        <Field label="Rychlost v (m/s)"><input type="number" step="0.1" value={v} onChange={(e) => setV(e.target.value)} className="input" /></Field>
      </div>
      <div className="mt-3">
        <Metric label="Průtok Q" value={`${Q.toLocaleString('cs-CZ')} m³/h`} accent />
      </div>
    </Card>
  );
}

export function MiniCalculatorsBundle() {
  const [tab, setTab] = useState('odskok');
  const tabs = [['odskok', 'Odskok'], ['redukce', 'Redukce'], ['plocha', 'Plocha'], ['prutok', 'Průtok']];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {tab === 'odskok' && <OdskokCalc />}
      {tab === 'redukce' && <RedukceCalc />}
      {tab === 'plocha' && <PlochaCalc />}
      {tab === 'prutok' && <PrutokCalc />}
      <style>{`
        .input { width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.9rem; }
        .btn-pill { border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.85rem; font-weight: 800; background: #f1f5f9; color: #334155; }
        .btn-pill.active { background: #2563eb; color: #fff; }
      `}</style>
    </section>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
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
