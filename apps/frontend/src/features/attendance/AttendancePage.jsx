import { useEffect, useMemo, useState } from 'react';
import { userDisplayName } from '../../utils/user-name.js';

function metersLabel(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  if (number >= 1000) return `${(number / 1000).toFixed(2)} km`;
  return `${Math.round(number)} m`;
}

function statusBadge(status) {
  switch (status) {
    case 'OK':
      return 'border-emerald-800 bg-emerald-950/20 text-emerald-300';
    case 'OUT_OF_RADIUS':
      return 'border-amber-700 bg-amber-950/20 text-amber-300';
    case 'NO_GPS':
    case 'PROJECT_WITHOUT_GPS':
      return 'border-rose-800 bg-rose-950/20 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-950 text-slate-300';
  }
}

function statusLabel(status) {
  switch (status) {
    case 'OK': return 'Uvnitř stavby';
    case 'OUT_OF_RADIUS': return 'Mimo toleranci';
    case 'NO_GPS': return 'Bez GPS';
    case 'PROJECT_WITHOUT_GPS': return 'Projekt bez GPS';
    default: return 'Bez kontroly';
  }
}

export function AttendancePage({ db, onCreate, user }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [note, setNote] = useState('');
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const projects = db.projects || [];
  const assignments = (db.assignments || []).filter((item) => item.userId === user?.id);
  const assignedProjects = assignments.map((assignment) => projects.find((project) => project.id === assignment.projectId)).filter(Boolean);
  const isMonter = user?.role === 'MONTER';
  const todayKey = new Date().toLocaleDateString('sv-SE');
  const latestOwnToday = (db.attendance || []).filter((item) => item.userId === user?.id
    && new Date(item.createdAt || item.checkIn).toLocaleDateString('sv-SE') === todayKey)
    .sort((a, b) => new Date(b.createdAt || b.checkIn) - new Date(a.createdAt || a.checkIn))[0];
  const nextType = latestOwnToday?.type === 'PRICHOD' ? 'ODCHOD' : 'PRICHOD';
  useEffect(() => {
    if (selectedProjectId || !assignedProjects.length) return;
    const active = assignedProjects.find((project) => project.status === 'ACTIVE');
    setSelectedProjectId((active || assignedProjects[0]).id);
  }, [assignedProjects, selectedProjectId]);
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);

  async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Prohlížeč nepodporuje geolokaci'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }

  async function measurePosition() {
    setIsLoadingGeo(true);
    setError('');
    try {
      const position = await getCurrentPosition();
      setLastPosition({
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: Math.round(position.coords.accuracy || 0)
      });
    } catch (err) {
      setError(err.message || 'Nepodařilo se načíst GPS');
    } finally {
      setIsLoadingGeo(false);
    }
  }

  async function submitWithGeo(type, status) {
    setMessage('');
    setError('');
    setIsLoadingGeo(true);
    try {
      let lat = null;
      let lng = null;
      if (type !== 'ABSENCE') {
        const position = await getCurrentPosition();
        lat = Number(position.coords.latitude.toFixed(6));
        lng = Number(position.coords.longitude.toFixed(6));
        setLastPosition({ lat, lng, accuracy: Math.round(position.coords.accuracy || 0) });
      }
      await onCreate({ type, status, projectId: type === 'ABSENCE' || isMonter ? null : selectedProjectId || null, lat, lng, note });
      setMessage(type === 'ABSENCE' ? 'Nepřítomnost byla nahlášena.' : 'Docházka byla uložena včetně GPS kontroly proti stavbě.');
      if (type !== 'ABSENCE') setNote('');
    } catch (err) {
      setError(err.message || 'Zápis docházky selhal');
    } finally {
      setIsLoadingGeo(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <h2 className="text-lg font-black text-blue-400">Docházka s GPS kontrolou stavby</h2>
            <p className="mt-1 text-sm text-slate-400">Příchod a odchod teď kontroluje odchylku od vybrané stavby podle GPS a povoleného radiusu.</p>
          </div>

          {!isMonter ? <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Projekt / stavba</span>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="">Bez projektu</option>
              {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label> : <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Přiřazený projekt</span>
            <p className="mt-1 font-bold text-white">{assignedProjects.find((project) => project.id === selectedProjectId)?.name || 'Automaticky podle přiřazení'}</p>
          </div>}

          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Poznámka</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Např. nástup na střeše, servisní výjezd, přesun mezi objekty" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          </label>

          <div className="flex flex-wrap gap-2">
            <button onClick={measurePosition} disabled={isLoadingGeo} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 disabled:opacity-50">
              {isLoadingGeo ? 'Načítám GPS…' : 'Změřit aktuální GPS'}
            </button>
          </div>

          {selectedProject && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-bold text-white">{selectedProject.name}</p>
              <p className="mt-1 text-slate-400">{selectedProject.address || 'Bez adresy'}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Projekt GPS</p>
                  <p className="mt-1 text-white">{selectedProject.lat ?? '—'}, {selectedProject.lng ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Tolerance</p>
                  <p className="mt-1 text-white">{metersLabel(selectedProject.radius ?? 100)}</p>
                </div>
              </div>
            </div>
          )}

          {lastPosition && (
            <div className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-slate-200">
              <p className="font-bold text-white">Poslední změřená poloha</p>
              <p className="mt-1">Lat: {lastPosition.lat} • Lng: {lastPosition.lng}</p>
              <p className="text-xs text-slate-400">Přesnost GPS: ±{lastPosition.accuracy || 0} m</p>
            </div>
          )}

          {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
          {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</div>}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button onClick={() => submitWithGeo(nextType, 'PRACE')} className={`rounded-2xl px-4 py-4 text-sm font-black uppercase text-white ${nextType === 'PRICHOD' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{nextType === 'PRICHOD' ? 'Zaznamenat příchod' : 'Zaznamenat odchod'}</button>
            <button onClick={() => submitWithGeo('ABSENCE', 'NEMOC')} className="rounded-2xl bg-amber-600 px-4 py-4 text-sm font-black uppercase text-white">Nahlásit nemoc</button>
            <button onClick={() => submitWithGeo('ABSENCE', 'DOVOLENA')} className="rounded-2xl bg-rose-600 px-4 py-4 text-sm font-black uppercase text-white">Nahlásit dovolenou</button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">Poslední docházka</h2>
            <div className="space-y-3 text-sm">
              {(db.attendance || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{userDisplayName(item)}</p>
                      <p className="text-slate-400">{item.projectName || 'Bez projektu'}</p>
                      {item.projectAddressSnapshot && <p className="mt-1 text-xs text-slate-500">{item.projectAddressSnapshot}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">{item.type} / {item.status}</p>
                      <p className="text-xs text-slate-500">{new Date(item.createdAt || item.checkIn).toLocaleString('cs-CZ')}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${statusBadge(item.geoStatus)}`}>{statusLabel(item.geoStatus)}</span>
                    {item.distanceFromProjectM !== null && item.distanceFromProjectM !== undefined && (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-300">Odchylka {metersLabel(item.distanceFromProjectM)}</span>
                    )}
                    {item.projectRadiusSnapshot ? (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-300">Tolerance {metersLabel(item.projectRadiusSnapshot)}</span>
                    ) : null}
                  </div>

                  {(item.lat !== null && item.lng !== null) && (
                    <p className="mt-3 text-xs text-slate-500">GPS: {item.lat}, {item.lng}</p>
                  )}
                  {item.note && <p className="mt-2 text-xs text-slate-400">{item.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
