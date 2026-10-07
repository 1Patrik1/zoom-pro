import { useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  name: '',
  code: '',
  clientName: '',
  address: '',
  lat: '',
  lng: '',
  radius: '100',
  budget: '',
  status: 'ACTIVE',
  plannedStart: '',
  plannedEnd: '',
  gpsMode: 'MANUAL',
  locationNote: ''
};

const EMPTY_DEVIATION = {
  lat: '',
  lng: '',
  address: '',
  distanceMeters: null
};

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function projectToForm(project) {
  if (!project) return EMPTY_FORM;
  return {
    name: project.name || '',
    code: project.code || '',
    clientName: project.clientName || '',
    address: project.address || '',
    lat: project.lat ?? '',
    lng: project.lng ?? '',
    radius: project.radius ?? '100',
    budget: project.budget ?? '',
    status: project.status || 'ACTIVE',
    plannedStart: formatDateTimeLocal(project.plannedStart),
    plannedEnd: formatDateTimeLocal(project.plannedEnd),
    gpsMode: project.gpsMode || 'MANUAL',
    locationNote: project.locationNote || ''
  };
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    code: form.code.trim() || null,
    clientName: form.clientName.trim() || null,
    address: form.address.trim() || null,
    lat: parseNumber(form.lat),
    lng: parseNumber(form.lng),
    radius: parseNumber(form.radius) ?? 100,
    budget: parseNumber(form.budget),
    status: form.status.trim() || 'ACTIVE',
    plannedStart: form.plannedStart || null,
    plannedEnd: form.plannedEnd || null,
    gpsMode: form.gpsMode,
    locationNote: form.locationNote.trim() || null
  };
}

function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`, {
    headers: { 'Accept-Language': 'cs' }
  });
  if (!response.ok) throw new Error('Nepodařilo se načíst adresu z GPS');
  const data = await response.json();
  return data.display_name || '';
}

async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, {
    headers: { 'Accept-Language': 'cs' }
  });
  if (!response.ok) throw new Error('Nepodařilo se dohledat GPS z adresy');
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Adresa nebyla nalezena');
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    address: data[0].display_name || address
  };
}

function readCurrentPosition() {
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

function fileToImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Soubor se nepodařilo načíst'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Obrázek se nepodařilo zpracovat'));
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function metersLabel(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} m`;
}

function mapsLink(project) {
  if (project?.lat !== null && project?.lat !== undefined && project?.lng !== null && project?.lng !== undefined) {
    return `https://www.google.com/maps?q=${project.lat},${project.lng}`;
  }
  if (project?.address) return `https://www.google.com/maps?q=${encodeURIComponent(project.address)}`;
  return '';
}

export function ProjectsPage({ user, db, onCreateProject, onUpdateProject, onAssign, onChat }) {
  const [activeProject, setActiveProject] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deviation, setDeviation] = useState(EMPTY_DEVIATION);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const projects = db.projects || [];
  const users = db.users || [];
  const assignments = db.assignments || [];
  const chats = db.chats || [];
  const gallery = db.projectGallery || [];

  const selectedProject = useMemo(() => projects.find((project) => project.id === activeProject) || null, [projects, activeProject]);
  const activeAssignments = useMemo(() => assignments.filter((item) => item.projectId === activeProject), [assignments, activeProject]);
  const activeChats = useMemo(() => chats.filter((item) => item.projectId === activeProject), [chats, activeProject]);
  const activeGallery = useMemo(() => gallery.filter((item) => item.projectId === activeProject), [gallery, activeProject]);

  useEffect(() => {
    if (!activeProject && projects.length && !isCreatingNew) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProject]);

  useEffect(() => {
    setForm(projectToForm(selectedProject));
    setDeviation(EMPTY_DEVIATION);
    setSaveMessage('');
  }, [selectedProject]);

  const deviationResult = useMemo(() => {
    if (!selectedProject) return null;
    const projectLat = parseNumber(form.lat);
    const projectLng = parseNumber(form.lng);
    const actualLat = parseNumber(deviation.lat);
    const actualLng = parseNumber(deviation.lng);
    if ([projectLat, projectLng, actualLat, actualLng].some((value) => value === null)) return null;
    const distanceMeters = haversineDistanceMeters(projectLat, projectLng, actualLat, actualLng);
    const allowedMeters = parseNumber(form.radius) ?? 0;
    return {
      distanceMeters,
      allowedMeters,
      isInside: distanceMeters <= allowedMeters
    };
  }, [form.lat, form.lng, form.radius, deviation.lat, deviation.lng, selectedProject]);

  function updateFormField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function fillLocationIntoProject() {
    setGeoLoading(true);
    setGeoError('');
    try {
      const position = await readCurrentPosition();
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      let address = form.address;
      try {
        address = await reverseGeocode(lat, lng);
      } catch {
        // address resolution is optional
      }
      setForm((current) => ({
        ...current,
        lat,
        lng,
        address: address || current.address,
        gpsMode: current.gpsMode === 'MANUAL' ? 'COMBINED' : 'AUTO'
      }));
    } catch (error) {
      setGeoError(error.message || 'Geolokaci se nepodařilo načíst');
    } finally {
      setGeoLoading(false);
    }
  }

  async function fillLocationIntoDeviation() {
    setGeoLoading(true);
    setGeoError('');
    try {
      const position = await readCurrentPosition();
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      let address = '';
      try {
        address = await reverseGeocode(lat, lng);
      } catch {
        // ignore address error here
      }
      setDeviation((current) => ({ ...current, lat, lng, address }));
    } catch (error) {
      setGeoError(error.message || 'Odchylku se nepodařilo změřit');
    } finally {
      setGeoLoading(false);
    }
  }

  async function resolveProjectAddress() {
    if (!form.address.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    try {
      const result = await geocodeAddress(form.address.trim());
      setForm((current) => ({
        ...current,
        address: result.address,
        lat: Number(result.lat.toFixed(6)),
        lng: Number(result.lng.toFixed(6)),
        gpsMode: current.gpsMode === 'AUTO' ? 'COMBINED' : 'MANUAL'
      }));
    } catch (error) {
      setGeoError(error.message || 'Adresu se nepodařilo převést na GPS');
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();
    setSaveMessage('');
    const payload = toPayload(form);
    if (!payload.name) return;
    if (selectedProject) {
      await onUpdateProject({ projectId: selectedProject.id, ...payload });
      setSaveMessage('Projekt byl aktualizován.');
      return;
    }
    await onCreateProject(payload);
    setForm(EMPTY_FORM);
    setSaveMessage('Projekt byl založen.');
  }

  async function handleFileSelection(event) {
    const files = Array.from(event.target.files || []).slice(0, 4);
    setSelectedFiles(files);
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    setChatError('');
    setIsSendingChat(true);
    try {
      const attachments = [];
      for (const file of selectedFiles) {
        attachments.push(await fileToImageDataUrl(file));
      }
      await onChat({
        projectId: activeProject,
        text: chatMessage.trim(),
        attachments
      });
      setChatMessage('');
      setSelectedFiles([]);
      event.currentTarget.reset();
    } catch (error) {
      setChatError(error.message || 'Zprávu se nepodařilo odeslat');
    } finally {
      setIsSendingChat(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Stavby</p>
            <h2 className="text-lg font-black text-white">GPS, adresa a odchylka</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveProject(null);
    setIsCreatingNew(true);
    setForm(EMPTY_FORM);
              setForm(EMPTY_FORM);
              setDeviation(EMPTY_DEVIATION);
            }}
            className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"
          >
            Nový projekt
          </button>
        </div>

        {['SUPERADMIN', 'REDITEL', 'VEDOUCI'].includes(user.role) && (
          <form onSubmit={handleProjectSubmit} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>Název stavby</span>
                <input value={form.name} onChange={(event) => updateFormField('name', event.target.value)} required placeholder="Např. Bytový dům Modřany" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>Kód zakázky</span>
                <input value={form.code} onChange={(event) => updateFormField('code', event.target.value)} placeholder="VZT-2026-017" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>Klient</span>
                <input value={form.clientName} onChange={(event) => updateFormField('clientName', event.target.value)} placeholder="Investor / generální dodavatel" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>Status</span>
                <select value={form.status} onChange={(event) => updateFormField('status', event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none">
                  <option value="ACTIVE">Aktivní</option>
                  <option value="PLANNED">Plánovaná</option>
                  <option value="PAUSED">Pozastavená</option>
                  <option value="DONE">Dokončená</option>
                </select>
              </label>
            </div>

            <label className="space-y-1 text-sm text-slate-300">
              <span>Adresa stavby</span>
              <textarea value={form.address} onChange={(event) => updateFormField('address', event.target.value)} rows={2} placeholder="Ulice, město, PSČ" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={fillLocationIntoProject} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={geoLoading}>
                {geoLoading ? 'Načítám GPS…' : 'Použít moji aktuální GPS'}
              </button>
              <button type="button" onClick={resolveProjectAddress} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 disabled:opacity-50" disabled={geoLoading || !form.address.trim()}>
                Dopočítat GPS z adresy
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>GPS latitude</span>
                <input value={form.lat} onChange={(event) => updateFormField('lat', event.target.value)} placeholder="50.087465" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>GPS longitude</span>
                <input value={form.lng} onChange={(event) => updateFormField('lng', event.target.value)} placeholder="14.421254" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>Odchylka od stavby / tolerance v metrech</span>
                <input value={form.radius} onChange={(event) => updateFormField('radius', event.target.value)} placeholder="100" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>Zdroj GPS</span>
                <select value={form.gpsMode} onChange={(event) => updateFormField('gpsMode', event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none">
                  <option value="MANUAL">Ručně</option>
                  <option value="AUTO">Automaticky</option>
                  <option value="COMBINED">Kombinace</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>Rozpočet</span>
                <input value={form.budget} onChange={(event) => updateFormField('budget', event.target.value)} placeholder="1250000" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>Poznámka k lokaci</span>
                <input value={form.locationNote} onChange={(event) => updateFormField('locationNote', event.target.value)} placeholder="GPS bod u hlavního vstupu" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-1 text-sm text-slate-300">
                <span>Plánovaný start</span>
                <input type="datetime-local" value={form.plannedStart} onChange={(event) => updateFormField('plannedStart', event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span>Plánovaný konec</span>
                <input type="datetime-local" value={form.plannedEnd} onChange={(event) => updateFormField('plannedEnd', event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>

            {geoError && <p className="text-sm text-rose-400">{geoError}</p>}
            {saveMessage && <p className="text-sm text-emerald-400">{saveMessage}</p>}

            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
              {selectedProject ? 'Uložit změny projektu' : 'Založit projekt'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {projects?.map((project) => (
            <button key={project.id} onClick={() => setActiveProject(project.id)} className={`w-full rounded-2xl border px-4 py-3 text-left ${activeProject === project.id ? 'border-blue-700 bg-blue-950/40 text-white' : 'border-slate-800 bg-slate-950 text-slate-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{project.name}</p>
                  <p className="text-xs text-slate-400">{project.code || 'Bez kódu'} · {project.status || 'ACTIVE'}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {project.radius ?? 100} m
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{project.address || 'Bez adresy'}</p>
            </button>
          ))}
          {!projects.length && <p className="text-sm text-slate-500">Zatím není založená žádná stavba.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Projektová poloha</h2>
                <p className="mt-1 text-sm text-slate-400">Automatický i ruční zápis GPS, adresy a kontrola odchylky od stavby.</p>
              </div>
              {selectedProject && mapsLink(selectedProject) && (
                <a href={mapsLink(selectedProject)} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-700 px-4 py-2 text-xs font-black text-slate-200">
                  Otevřít v mapě
                </a>
              )}
            </div>

            {!selectedProject && <p className="mt-4 text-sm text-slate-500">Vyber stavbu z levého panelu.</p>}

            {selectedProject && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">GPS</p>
                    <p className="mt-2 text-sm font-bold text-white">{selectedProject.lat ?? '—'}, {selectedProject.lng ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Tolerance</p>
                    <p className="mt-2 text-sm font-bold text-white">{selectedProject.radius ?? 100} m</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Zdroj GPS</p>
                    <p className="mt-2 text-sm font-bold text-white">{selectedProject.gpsMode || 'MANUAL'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Galerie</p>
                    <p className="mt-2 text-sm font-bold text-white">{activeGallery.length} fotek</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Měření odchylky od stavby</h3>
                      <p className="mt-1 text-sm text-slate-400">Změř aktuální polohu automaticky nebo zadej ručně.</p>
                    </div>
                    <button type="button" onClick={fillLocationIntoDeviation} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={geoLoading}>
                      Změřit moji polohu
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="space-y-1 text-sm text-slate-300">
                      <span>Aktuální latitude</span>
                      <input value={deviation.lat} onChange={(event) => setDeviation((current) => ({ ...current, lat: event.target.value }))} placeholder="50.087465" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-1 text-sm text-slate-300">
                      <span>Aktuální longitude</span>
                      <input value={deviation.lng} onChange={(event) => setDeviation((current) => ({ ...current, lng: event.target.value }))} placeholder="14.421254" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-1 text-sm text-slate-300">
                      <span>Místo měření</span>
                      <input value={deviation.address} onChange={(event) => setDeviation((current) => ({ ...current, address: event.target.value }))} placeholder="Poznámka / adresa" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </label>
                  </div>

                  <div className={`mt-4 rounded-2xl border p-4 ${deviationResult ? (deviationResult.isInside ? 'border-emerald-800 bg-emerald-950/20' : 'border-amber-700 bg-amber-950/20') : 'border-slate-800 bg-slate-900'}`}>
                    {!deviationResult && <p className="text-sm text-slate-400">Pro výpočet odchylky doplň GPS projektu i aktuální GPS.</p>}
                    {deviationResult && (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-500">Aktuální odchylka</p>
                          <p className="mt-1 text-lg font-black text-white">{metersLabel(deviationResult.distanceMeters)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-500">Povolená tolerance</p>
                          <p className="mt-1 text-lg font-black text-white">{metersLabel(deviationResult.allowedMeters)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-500">Výsledek</p>
                          <p className={`mt-1 text-lg font-black ${deviationResult.isInside ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {deviationResult.isInside ? 'Uvnitř stavby' : 'Mimo toleranci'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-emerald-400">Přiřazení týmu</h2>
            {!activeProject && <p className="text-sm text-slate-500">Vyber stavbu z levého panelu.</p>}
            {activeProject && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-1">
                {users?.map((teamUser) => {
                  const assigned = activeAssignments.some((item) => item.userId === teamUser.id);
                  return (
                    <label key={teamUser.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${assigned ? 'border-emerald-800 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-300'}`}>
                      <input type="checkbox" className="hidden" checked={assigned} onChange={(event) => onAssign({ projectId: activeProject, userId: teamUser.id, assign: event.target.checked })} />
                      <div>
                        <p className="font-bold">{teamUser.email}</p>
                        <p className="text-xs">{teamUser.role}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">Projektový chat</h2>
            <div className="max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
              {activeChats?.map((chat) => (
                <div key={chat.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-blue-400">{chat.authorName}</p>
                    <p className="text-[11px] text-slate-500">{new Date(chat.createdAt).toLocaleString('cs-CZ')}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{chat.text}</p>
                  {chat.attachmentUrl && (
                    <button type="button" onClick={() => setLightbox({ url: chat.attachmentUrl, caption: chat.text })} className="mt-3 block overflow-hidden rounded-2xl border border-slate-800">
                      <img src={chat.attachmentUrl} alt={chat.text || 'Foto z chatu'} className="max-h-80 w-full object-cover" />
                    </button>
                  )}
                  {!!chat.galleryCount && <p className="mt-2 text-xs text-slate-400">Galerie příspěvku: {chat.galleryCount} fotek</p>}
                </div>
              ))}
              {!activeChats.length && <p className="text-sm text-slate-500">Zatím bez zpráv.</p>}
            </div>

            {activeProject && (
              <form onSubmit={handleChatSubmit} className="mt-4 space-y-3">
                <textarea value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} rows={3} placeholder="Zpráva, poznámka nebo popis fotek…" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    <span>📷 Vyfotit</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileSelection} className="hidden" />
                  </label>
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    <span>🖼️ Galerie</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileSelection} className="hidden" />
                  </label>
                </div>
                {selectedFiles.length > 0 && <div className="mt-2 text-xs text-slate-400">Vybráno fotek: {selectedFiles.length}</div>}
                {selectedFiles.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {selectedFiles?.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                        <p className="truncate text-xs text-slate-400">{file.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{Math.round(file.size / 1024)} kB</p>
                      </div>
                    ))}
                  </div>
                )}
                {chatError && <p className="text-sm text-rose-400">{chatError}</p>}
                <div className="flex gap-2">
                  <button disabled={isSendingChat} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                    {isSendingChat ? 'Odesílám…' : 'Odeslat do chatu'}
                  </button>
                  <button type="button" onClick={() => { setChatMessage(''); setSelectedFiles([]); setChatError(''); }} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200">
                    Vyčistit
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-400">Galerie stavby</h2>
                <p className="mt-1 text-sm text-slate-400">Fotky z projektového chatu se ukládají i sem.</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-2 text-xs font-black text-slate-200">{activeGallery.length} ks</span>
            </div>

            <div className="mt-4 grid max-h-[640px] gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {activeGallery?.map((item) => (
                <button key={item.id} type="button" onClick={() => setLightbox({ url: item.imageUrl, caption: item.caption || item.projectName })} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left">
                  <img src={item.imageUrl} alt={item.caption || 'Galerie projektu'} className="h-40 w-full object-cover" />
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-white">{item.caption || 'Foto ze stavby'}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.authorName} · {new Date(item.createdAt).toLocaleString('cs-CZ')}</p>
                  </div>
                </button>
              ))}
              {!activeGallery.length && <p className="text-sm text-slate-500">Jakmile někdo pošle fotku do chatu, objeví se tady.</p>}
            </div>
          </div>
        </div>
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6" onClick={() => setLightbox(null)}>
          <div className="max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || 'Náhled'} className="max-h-[80vh] w-full object-contain" />
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-slate-200">{lightbox.caption || 'Foto ze stavby'}</p>
              <button type="button" onClick={() => setLightbox(null)} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-200">
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
