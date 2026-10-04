import { useState } from 'react';
import { Camera, Ruler, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { takePhoto } from '../lib/media.js';

const REFS = [
  { code: 'A4_short', label: 'A4 (210 mm)', mm: 210 },
  { code: 'A4_long',  label: 'A4 (297 mm)', mm: 297 },
  { code: 'tape30',   label: 'Metr 300 mm', mm: 300 },
  { code: 'tape50',   label: 'Metr 500 mm', mm: 500 },
  { code: 'banknote100', label: 'Bankovka 100 Kč', mm: 140 },
  { code: 'coin10',   label: 'Mince 10 Kč', mm: 24.5 },
  { code: 'brick',    label: 'Cihla 290 mm', mm: 290 }
];

export function AutoDetectScreen({ token }) {
  const [image, setImage] = useState(null);
  const [reference, setReference] = useState('A4_short');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [detection, setDetection] = useState(null);
  const [err, setErr] = useState('');

  const shoot = async () => {
    setErr(''); setDetection(null);
    const p = await takePhoto({ maxSide: 1600 });
    if (p) setImage(p);
  };

  const detect = async () => {
    if (!image) { setErr('Vyfoť situaci s referencí.'); return; }
    setLoading(true); setErr(''); setDetection(null);
    try {
      const ref = REFS.find((r) => r.code === reference);
      const r = await api.request('/api/autodetect/detect', {
        method: 'POST', token,
        body: { imageDataUrl: image, referenceObject: reference, referenceSizeMm: ref?.mm, hint }
      });
      if (!r.ok) { setErr(r.error || 'AI selhal.'); return; }
      setDetection(r.detection);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2">
          <Sparkles size={18} className="text-fuchsia-400" /> AI AutoDetect
        </h2>
        <p className="text-xs text-slate-400">Foto → AI změří chybějící kus (Ø/rozměry, přesah, sklon).</p>
      </header>

      <div className="card space-y-3">
        <label className="block text-sm">
          <span className="font-black text-slate-300">Reference (měřítko)</span>
          <select value={reference} onChange={(e) => setReference(e.target.value)}
            className="mt-1 w-full rounded-2xl bg-slate-800 px-3 py-3 text-white">
            {REFS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-black text-slate-300">Poznámka (volitelně)</span>
          <input value={hint} onChange={(e) => setHint(e.target.value)}
            placeholder="např. „vlevo Ø200, chybí koleno"
            className="mt-1 w-full rounded-2xl bg-slate-800 px-3 py-3 text-white" />
        </label>

        <button onClick={shoot} className="btn-ghost w-full">
          <Camera size={16} /> {image ? 'Znovu vyfotit' : 'Vyfotit situaci'}
        </button>

        {image && <img src={image} alt="foto" className="rounded-2xl w-full max-h-[300px] object-contain bg-slate-800" />}

        <button onClick={detect} disabled={!image || loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Ruler size={16} />}
          {loading ? 'AI měří…' : 'Změřit AI'}
        </button>

        {err && <p className="text-xs text-rose-400">{err}</p>}
      </div>

      {detection && (
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
            <CheckCircle2 size={16} /> Výsledek (confidence {Math.round((detection.confidence || 0) * 100)} %)
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Metric label="Tvar" value={detection.shape === 'round' ? 'Kruhové' : 'Hranaté'} />
            {detection.shape === 'round'
              ? <Metric label="Ø" value={detection.diameterMm ? `${Math.round(detection.diameterMm)} mm` : '—'} />
              : <>
                  <Metric label="W" value={`${Math.round(detection.widthMm || 0)} mm`} />
                  <Metric label="H" value={`${Math.round(detection.heightMm || 0)} mm`} />
                </>}
            <Metric label="Přesah" value={`${Math.round(detection.offsetMm || 0)} mm`} />
            <Metric label="Sklon" value={`${Math.round(detection.angleDeg || 0)}°`} />
            <Metric label="Kus" value={pieceLabel(detection.suggestedPieceKind)} />
            <Metric label="SKU" value={detection.suggestedSku || '—'} />
          </div>
          {detection.reasoning && (
            <p className="text-xs text-slate-400 border-t border-white/10 pt-2 mt-2">{detection.reasoning}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-800 p-3">
      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-base font-black">{value}</p>
    </div>
  );
}
function pieceLabel(k) {
  return ({ straight: 'Rovný', elbow15: 'Koleno 15°', elbow30: 'Koleno 30°', elbow45: 'Koleno 45°', elbow60: 'Koleno 60°', reducer: 'Redukce', offset_pair: 'Pár kolen + mezikus' })[k] || '—';
}
