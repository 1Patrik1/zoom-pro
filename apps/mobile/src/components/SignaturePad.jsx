// (4) Podpis prstem — canvas s vlastní implementací (bez knihovny)
import { useEffect, useRef, useState } from 'react';
import { Eraser, Check } from 'lucide-react';

export function SignaturePad({ onSave, label = 'Podpis' }) {
  const cvsRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const c = cvsRef.current;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    // white bg
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const pos = (e) => {
    const c = cvsRef.current.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: (t.clientX - c.left) * (cvsRef.current.width / c.width),
             y: (t.clientY - c.top)  * (cvsRef.current.height / c.height) };
  };

  const start = (e) => { e.preventDefault(); setDrawing(true); const p = pos(e); const ctx = cvsRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move  = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); const ctx = cvsRef.current.getContext('2d'); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasStroke(true); };
  const end   = () => setDrawing(false);

  const clear = () => {
    const c = cvsRef.current; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    setHasStroke(false);
  };
  const save = () => onSave?.(cvsRef.current.toDataURL('image/png'));

  return (
    <div className="card">
      <p className="text-xs font-black text-slate-300 mb-2">{label}</p>
      <canvas
        ref={cvsRef}
        width={800}
        height={300}
        className="w-full rounded-2xl bg-white"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={clear} className="btn-ghost"><Eraser size={14} /> Smazat</button>
        <button onClick={save} disabled={!hasStroke} className="btn-primary disabled:opacity-50"><Check size={14} /> Uložit podpis</button>
      </div>
    </div>
  );
}
