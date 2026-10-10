import { useEffect, useState } from 'react';
import { Clock, BookOpen, Ruler, Receipt, HardHat, ChevronRight, Sparkles } from 'lucide-react';
import { queue } from '../lib/storage.js';

export function HomeScreen({ user, goto, online }) {
  const [pending, setPending] = useState(0);
  useEffect(() => { queue.list().then((l) => setPending(l.length)); }, []);

  const tiles = [
    { id: 'attendance', title: 'Nová docházka', desc: 'Pípni s GPS', icon: Clock,   color: 'from-emerald-600 to-teal-600' },
    { id: 'log',        title: 'Zápis do deníku', desc: 'Text + fotky',  icon: BookOpen, color: 'from-blue-600 to-indigo-600' },
    { id: 'detect',     title: 'AI AutoDetect', desc: 'Foto → rozměry',  icon: Ruler,    color: 'from-fuchsia-600 to-purple-600' },
    { id: 'invoices',   title: 'Můj výkaz',     desc: 'Hodiny × sazba',  icon: Receipt,  color: 'from-amber-500 to-orange-600' },
    { id: 'projects',   title: 'Mé projekty',   desc: 'Adresy, kontakty', icon: HardHat, color: 'from-cyan-600 to-sky-600' }
  ];

  return (
    <div className="space-y-4">
      <section className="card bg-gradient-to-br from-brand-700 to-brand-900 border-brand-600/40">
        <p className="text-[10px] uppercase tracking-widest opacity-80">Dobrý den</p>
        <h2 className="text-xl font-black">{user?.name || user?.email}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip">Role: {user?.role || 'MONTER'}</span>
          {pending > 0 && (
            <button onClick={() => goto('sync')} className="chip bg-amber-500/20 text-amber-200">
              {pending} položek k odeslání ›
            </button>
          )}
          {!online && <span className="chip bg-rose-500/20 text-rose-200">Offline režim</span>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <button key={t.id} onClick={() => goto(t.id)}
            className={`rounded-3xl bg-gradient-to-br ${t.color} p-4 text-left shadow-lg active:scale-[0.98] transition`}>
            <div className="flex items-start justify-between">
              <t.icon size={22} />
              <ChevronRight size={16} className="opacity-70" />
            </div>
            <p className="mt-6 text-base font-black leading-tight">{t.title}</p>
            <p className="text-[11px] opacity-80">{t.desc}</p>
          </button>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center gap-2 text-sm font-black">
          <Sparkles size={16} className="text-brand-500" /> Rychlé tipy
        </div>
        <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc pl-5">
          <li>Docházka s GPS ověří polohu proti radiusu projektu (default 100 m).</li>
          <li>Foto AutoDetect: přilož referenční předmět (A4 / metr / mince) pro přesné měření.</li>
          <li>Vše funguje offline — po zapnutí sítě otevři <b>Sync</b>.</li>
        </ul>
      </section>
    </div>
  );
}
