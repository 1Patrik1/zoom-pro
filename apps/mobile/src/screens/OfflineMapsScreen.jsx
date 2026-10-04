// (8) Offline mapy — stažení tile pro projekt
import { useEffect, useState } from 'react';
import { Map, Download, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { downloadTilesForProject } from '../lib/offlineMaps.js';

export function OfflineMapsScreen({ token }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.request('/api/sync', { token }).then((r) => setProjects(r?.projects || [])).catch(() => {}); }, []);

  const download = async () => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setBusy(true); setProgress({ done: 0, total: 0 });
    try {
      const res = await downloadTilesForProject(p, { zoomMin: 14, zoomMax: 17, onProgress: setProgress });
      setProgress(res);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><Map size={20} className="text-brand-500" /> Offline mapy</h2>
        <p className="text-xs text-slate-400">Stáhni mapové dlaždice pro projekt — funguje pak i bez signálu.</p>
      </header>

      <div className="card space-y-3">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white">
          <option value="">— vyber projekt —</option>
          {projects.filter((p) => p.lat && p.lng).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.address || '—'})</option>)}
        </select>
        <button onClick={download} disabled={!projectId || busy} className="btn-primary w-full disabled:opacity-50">
          <Download size={16} /> Stáhnout mapu (500 m radius, zoom 14–17)
        </button>
      </div>

      {progress && (
        <div className="card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-black">Průběh</span>
            <span>{progress.done}/{progress.total} tile</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total * 100) : 0}%` }} />
          </div>
          {!busy && progress.done === progress.total && progress.total > 0 && (
            <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Stažení hotovo</p>
          )}
        </div>
      )}

      <div className="card text-xs text-slate-400">
        <p className="font-black text-slate-300 mb-1">Jak to funguje</p>
        <p>Aplikace stáhne OSM PNG dlaždice do lokální databáze (IndexedDB) a při použití mapy je bere přednostně odsud.</p>
      </div>
    </div>
  );
}
