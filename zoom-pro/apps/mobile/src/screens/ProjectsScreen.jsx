import { useEffect, useState } from 'react';
import { MapPin, Phone, Navigation } from 'lucide-react';
import { api } from '../lib/api.js';

export function ProjectsScreen({ token }) {
  const [projects, setProjects] = useState([]);
  useEffect(() => { api.request('/api/sync', { token }).then((r) => setProjects(r?.projects || [])).catch(() => {}); }, []);

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-xl font-black">Mé projekty</h2>
        <p className="text-xs text-slate-400">Klikni na projekt pro navigaci.</p>
      </header>

      {projects.map((p) => (
        <div key={p.id} className="card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-black">{p.name}</p>
              <p className="text-xs text-slate-400">{p.address || 'Bez adresy'}</p>
              {p.clientName && <p className="text-xs text-slate-500 mt-1">Klient: {p.clientName}</p>}
            </div>
            <span className="chip">{p.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.lat && p.lng && (
              <a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer"
                className="btn-ghost text-xs">
                <Navigation size={14} /> Navigovat
              </a>
            )}
            {p.address && (
              <a href={`geo:0,0?q=${encodeURIComponent(p.address)}`} className="btn-ghost text-xs">
                <MapPin size={14} /> Adresa
              </a>
            )}
          </div>
        </div>
      ))}
      {!projects.length && <p className="text-center text-sm text-slate-500 py-6">Žádné projekty.</p>}
    </div>
  );
}
