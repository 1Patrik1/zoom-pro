// (5) UI pro kompas + úhloměr
import { useEffect, useState } from 'react';
import { Compass, RotateCw } from 'lucide-react';
import { startInclinometer } from '../lib/inclinometer.js';

export function InclinometerScreen() {
  const [s, setS] = useState({ pitchDeg: 0, rollDeg: 0, compassDeg: 0, slopeDeg: 0, slopePct: 0 });
  const [running, setRunning] = useState(false);
  const [holdPeak, setHoldPeak] = useState(0);

  useEffect(() => {
    if (!running) return;
    let peak = 0;
    const stop = startInclinometer({ onSample: (x) => {
      setS(x);
      if (x.slopeDeg > peak) { peak = x.slopeDeg; setHoldPeak(peak); }
    }});
    return () => stop?.();
  }, [running]);

  const reset = () => setHoldPeak(0);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><Compass size={20} className="text-brand-500" /> Úhloměr + kompas</h2>
        <p className="text-xs text-slate-400">Přilož telefon dlouhou hranou na potrubí a změř sklon.</p>
      </header>

      <button onClick={() => setRunning((v) => !v)} className="btn-primary w-full">
        {running ? 'Zastavit' : 'Spustit měření'}
      </button>

      {running && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Big value={`${s.slopeDeg}°`} label="Sklon" />
            <Big value={`${s.slopePct}%`} label="Sklon (%)" />
            <Big value={`${s.pitchDeg}°`} label="Pitch (X)" />
            <Big value={`${s.rollDeg}°`}  label="Roll (Y)" />
          </div>

          <div className="card">
            <p className="text-xs font-black text-slate-300">Kompas</p>
            <div className="mt-2 grid place-items-center">
              <div className="relative h-40 w-40 rounded-full border-4 border-white/10 grid place-items-center"
                   style={{ transform: `rotate(${-s.compassDeg}deg)`, transition: 'transform 200ms' }}>
                <div className="absolute top-1 text-brand-500 font-black">N</div>
                <div className="absolute right-1 text-slate-400 font-black">E</div>
                <div className="absolute bottom-1 text-slate-400 font-black">S</div>
                <div className="absolute left-1 text-slate-400 font-black">W</div>
                <div className="h-24 w-1 bg-rose-500 rounded"></div>
              </div>
              <p className="mt-3 text-2xl font-black">{s.compassDeg}°</p>
            </div>
          </div>

          <div className="card flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Peak (max sklon)</p>
              <p className="text-xl font-black">{holdPeak}°</p>
            </div>
            <button onClick={reset} className="btn-ghost"><RotateCw size={14} /> Reset</button>
          </div>
        </>
      )}
    </div>
  );
}

function Big({ value, label }) {
  return (
    <div className="card text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
