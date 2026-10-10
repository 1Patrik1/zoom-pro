import { useState } from 'react';
import {
  Home, Clock, BookOpen, Ruler, Receipt, HardHat, RefreshCw, Settings,
  ScanLine, Compass, PenTool, Map, Watch, Activity, MoreHorizontal
} from 'lucide-react';

const PRIMARY = [
  { id: 'home', label: 'Domů', icon: Home },
  { id: 'attendance', label: 'Docházka', icon: Clock },
  { id: 'log', label: 'Deník', icon: BookOpen },
  { id: 'detect', label: 'AI foto', icon: Ruler },
  { id: 'more', label: 'Více', icon: MoreHorizontal }
];

const MORE = [
  { id: 'scanner', label: 'QR / EAN skener', icon: ScanLine, tone: 'from-blue-600 to-sky-600' },
  { id: 'inclinometer', label: 'Úhloměr + kompas', icon: Compass, tone: 'from-emerald-600 to-teal-600' },
  { id: 'signature', label: 'Podpis', icon: PenTool, tone: 'from-amber-500 to-orange-600' },
  { id: 'maps', label: 'Offline mapy', icon: Map, tone: 'from-cyan-600 to-blue-600' },
  { id: 'watch', label: 'Zoom Pro Watch', icon: Watch, tone: 'from-fuchsia-600 to-purple-600' },
  { id: 'invoices', label: 'Můj výkaz', icon: Receipt, tone: 'from-amber-600 to-orange-700' },
  { id: 'projects', label: 'Projekty', icon: HardHat, tone: 'from-brand-600 to-brand-800' },
  { id: 'diag', label: 'Integrace', icon: Activity, tone: 'from-slate-700 to-slate-800' },
  { id: 'sync', label: 'Sync fronta', icon: RefreshCw, tone: 'from-emerald-700 to-emerald-900' },
  { id: 'settings', label: 'Nastavení', icon: Settings, tone: 'from-slate-700 to-slate-900' }
];

export function TabBar({ active, onChange }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handle = (id) => {
    if (id === 'more') { setMoreOpen(true); return; }
    setMoreOpen(false); onChange(id);
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 backdrop-blur"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-md mx-auto grid grid-cols-5">
          {PRIMARY.map((it) => (
            <button key={it.id} onClick={() => handle(it.id)}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-black transition ${active === it.id || (it.id === 'more' && moreOpen) ? 'text-brand-500' : 'text-slate-400'}`}>
              <it.icon size={20} />
              {it.label}
            </button>
          ))}
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-slate-900 p-4 pb-8 max-w-md mx-auto"
               onClick={(e) => e.stopPropagation()}
               style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
            <div className="h-1 w-12 mx-auto rounded-full bg-slate-700 mb-4" />
            <h3 className="text-sm font-black mb-3">Všechny funkce</h3>
            <div className="grid grid-cols-2 gap-3">
              {MORE.map((m) => (
                <button key={m.id} onClick={() => handle(m.id)}
                  className={`rounded-3xl bg-gradient-to-br ${m.tone} p-4 text-left shadow-lg active:scale-95`}>
                  <m.icon size={20} />
                  <p className="mt-3 text-sm font-black">{m.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
