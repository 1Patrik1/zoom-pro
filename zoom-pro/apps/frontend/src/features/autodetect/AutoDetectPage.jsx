import { useRef, useState } from 'react';
import { Camera, Sparkles, Ruler, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client.js';

const REFERENCES = [
  { code: 'A4_short', label: 'A4 (krátká strana 210 mm)', mm: 210 },
  { code: 'A4_long',  label: 'A4 (dlouhá strana 297 mm)', mm: 297 },
  { code: 'tape30',   label: 'Metr — vysunutý 300 mm',    mm: 300 },
  { code: 'tape50',   label: 'Metr — vysunutý 500 mm',    mm: 500 },
  { code: 'banknote100', label: 'Bankovka 100 Kč (140 mm)', mm: 140 },
  { code: 'banknote200', label: 'Bankovka 200 Kč (146 mm)', mm: 146 },
  { code: 'coin10',   label: 'Mince 10 Kč (24,5 mm)',      mm: 24.5 },
  { code: 'brick',    label: 'Cihla 290 mm',                mm: 290 },
  { code: 'custom',   label: 'Vlastní rozměr (mm)',         mm: null },
];

async function fileToDataUrl(file, maxSide = 1600) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = url;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.86);
  URL.revokeObjectURL(url);
  return data;
}

export function AutoDetectPage({ token, db }) {
  const [image, setImage] = useState(null);
  const [reference, setReference] = useState('A4_short');
  const [customMm, setCustomMm] = useState(200);
  const [hint, setHint] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detection, setDetection] = useState(null);
  const inputRef = useRef(null);

  const projects = db?.projects || [];

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const data = await fileToDataUrl(file);
    setImage(data);
    setDetection(null);
  }

  async function detect() {
    if (!image) { setError('Nahraj nejdřív fotku.'); return; }
    setLoading(true); setError(''); setDetection(null);
    try {
      const refObj = REFERENCES.find((r) => r.code === reference);
      const r = await api.request('/api/autodetect/detect', {
        method: 'POST', token,
        body: {
          projectId: projectId || undefined,
          imageDataUrl: image,
          referenceObject: reference,
          referenceSizeMm: refObj?.mm ?? Number(customMm),
          hint,
        },
      });
      if (!r.ok) { setError(r.error || 'AI selhal.'); return; }
      setDetection(r.detection);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-fuchsia-700 to-purple-700 p-6 text-white shadow">
        <div className="flex items-center gap-3">
          <Sparkles size={22} />
          <h2 className="text-2xl font-black">AI AutoDetect — chybějící kus potrubí</h2>
        </div>
        <p className="mt-1 text-sm opacity-90">
          Vyfoť místo, kde chybí kus (mezi dvěma stávajícími úseky), přidej referenční předmět
          (A4 papír, metr, cihlu…) a AI ti změří <b>rozměry, přesah a sklon</b> — a navrhne správný kus z katalogu.
        </p>
      </header>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">1. Vstup</h3>

          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              <span className="font-black text-slate-700">Projekt (volitelně)</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                <option value="">— bez projektu —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-black text-slate-700">Referenční předmět (měřítko)</span>
              <select value={reference} onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                {REFERENCES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </label>

            {reference === 'custom' && (
              <label className="text-sm">
                <span className="font-black text-slate-700">Vlastní rozměr reference (mm)</span>
                <input type="number" value={customMm} onChange={(e) => setCustomMm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
            )}

            <label className="text-sm">
              <span className="font-black text-slate-700">Poznámka pro AI (volitelně)</span>
              <textarea rows={2} value={hint} onChange={(e) => setHint(e.target.value)}
                placeholder="např. „vlevo je Ø200 kruhové, chybí 45° koleno“"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-blue-700">
                <Camera size={16} /> {image ? 'Změnit fotku' : 'Vyfotit / nahrát'}
              </button>
              <input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={handleFile} />

              <button type="button" disabled={!image || loading} onClick={detect}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-emerald-700 disabled:opacity-50">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Ruler size={16} />}
                {loading ? 'Měřím…' : 'Změřit AI'}
              </button>
            </div>
          </div>

          {image && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <img src={image} alt="vstup" className="max-h-[420px] w-full object-contain bg-slate-50" />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">2. Výsledek</h3>

          {!detection && !loading && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Zatím nic. Nahraj fotku a klikni <b>Změřit AI</b>.
            </div>
          )}

          {loading && (
            <div className="mt-6 flex flex-col items-center gap-2 text-slate-500">
              <RefreshCw className="animate-spin" />
              <p className="text-sm">Gemini měří — hledám hrany, referenci, sklon…</p>
            </div>
          )}

          {detection && (
            <div className="mt-4 space-y-4">
              <Confidence value={detection.confidence} />

              <div className="grid grid-cols-2 gap-3">
                <Metric label="Tvar" value={detection.shape === 'round' ? 'Kruhové' : detection.shape === 'rect' ? 'Hranaté' : '—'} />
                {detection.shape === 'round'
                  ? <Metric label="Průměr Ø" value={detection.diameterMm ? `${Math.round(detection.diameterMm)} mm` : '—'} />
                  : <>
                      <Metric label="Šířka W" value={detection.widthMm ? `${Math.round(detection.widthMm)} mm` : '—'} />
                      <Metric label="Výška H" value={detection.heightMm ? `${Math.round(detection.heightMm)} mm` : '—'} />
                    </>}
                <Metric label="Přesah osy" value={detection.offsetMm ? `${Math.round(detection.offsetMm)} mm` : '—'} />
                <Metric label="Projekce" value={detection.runMm ? `${Math.round(detection.runMm)} mm` : '—'} />
                <Metric label="Sklon osy" value={detection.angleDeg != null ? `${Math.round(detection.angleDeg)}°` : '—'} />
                <Metric label="Doporučený kus" value={pieceLabel(detection.suggestedPieceKind)} accent />
                <Metric label="SKU z katalogu" value={detection.suggestedSku || 'nenalezeno'} />
              </div>

              {detection.reasoning && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="text-[10px] font-black uppercase text-slate-500">AI zdůvodnění</p>
                  <p className="mt-1">{detection.reasoning}</p>
                </div>
              )}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="flex items-center gap-2 font-black"><CheckCircle2 size={14} /> Další krok</p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  <li>Otevři <b>Kalkulačku → Změna osy</b> — hodnoty se dají hned zadat.</li>
                  <li>Pokud máš katalog, klikni <b>Objednat</b> a založí se RFQ / PO.</li>
                  <li>Fotka se uložila do historie AutoDetect (projekt).</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-black"><AlertTriangle size={14} /> Tipy pro přesné měření</p>
        <ul className="mt-1 list-disc pl-5 text-xs">
          <li>Fotografuj <b>kolmo</b> na osu potrubí (ne z boku pod úhlem).</li>
          <li>Reference musí být <b>ve stejné rovině</b> jako potrubí.</li>
          <li>Osvětli hrany — stín zhoršuje přesnost o 5–15 %.</li>
          <li>Pro nejlepší výsledek: 2 fotky (čelní + boční), spočítá se z obou.</li>
        </ul>
      </section>
    </div>
  );
}

function pieceLabel(k) {
  return ({
    straight: 'Rovný kus', elbow15: 'Koleno 15°', elbow30: 'Koleno 30°',
    elbow45: 'Koleno 45°', elbow60: 'Koleno 60°', reducer: 'Redukce',
    offset_pair: 'Pár kolen + mezikus (změna osy)',
  })[k] || '—';
}

function Metric({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-black ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function Confidence({ value }) {
  const pct = Math.round((Number(value) || 0) * 100);
  const tone = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-black text-slate-700">Spolehlivost AI</span>
        <span className="font-black">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
