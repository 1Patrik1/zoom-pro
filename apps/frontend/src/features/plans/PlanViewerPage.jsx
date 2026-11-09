import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { PlanCanvas } from './PlanCanvas.jsx';
import { PlanUploadForm } from './PlanUploadForm.jsx';
import { DISCIPLINE_LABELS, FORMAT_LABELS, PLAN_DISCIPLINES } from './planFormat.js';
import { fileToDataUrl } from './fileToDataUrl.js';

export function PlanViewerPage({ db, token }) {
  const projects = db?.projects || [];
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [markers, setMarkers] = useState([]);
  const [busy, setBusy] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (projectFilter) query.set('projectId', projectFilter);
      if (disciplineFilter) query.set('discipline', disciplineFilter);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const result = await api.get(`plans${suffix}`, token);
      const rows = Array.isArray(result) ? result : [];
      setPlans(rows);
      setSelectedId((current) => (rows.some((item) => item.id === current) ? current : rows[0]?.id || ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectFilter, disciplineFilter]);

  const selectedPlan = useMemo(() => plans.find((item) => item.id === selectedId) || null, [plans, selectedId]);

  useEffect(() => {
    setPageNumber(1);
    setPageCount(1);
    setMarkers([]);
    if (!selectedPlan) return;
    api.get(`plans/${selectedPlan.id}/markers`, token)
      .then((result) => setMarkers(Array.isArray(result) ? result : []))
      .catch(() => setMarkers([]));
  }, [selectedPlan?.id, token]);

  async function handleUpload(payload) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const created = await api.post('plans', token, payload);
      setMessage(`Výkres „${created.title}“ byl nahrán.`);
      await loadPlans();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadVersion(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedPlan) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const fileUrl = await fileToDataUrl(file);
      const created = await api.post(`plans/${selectedPlan.id}/versions`, token, {
        fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size
      });
      setMessage(`Nová verze (v${created.version}) výkresu byla nahrána.`);
      await loadPlans();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(plan) {
    setError('');
    setMessage('');
    try {
      await api.post(`plans/${plan.id}/archive`, token, {});
      setMessage(`Výkres „${plan.title}“ byl archivován.`);
      await loadPlans();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCanvasClick({ positionX, positionY, pageNumber: markerPage }) {
    if (!selectedPlan) return;
    const text = window.prompt('Text značky na výkresu:');
    if (!text) return;
    try {
      const marker = await api.post(`plans/${selectedPlan.id}/markers`, token, { positionX, positionY, pageNumber: markerPage, text });
      setMarkers((current) => [...current, marker]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <PlanUploadForm projects={projects} onUpload={handleUpload} busy={busy} />

          <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-amber-400">Výkresy</h3>
              <button onClick={loadPlans} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Obnovit</button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none">
                <option value="">Všechny projekty</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none">
                <option value="">Všechny disciplíny</option>
                {PLAN_DISCIPLINES.map((key) => <option key={key} value={key}>{DISCIPLINE_LABELS[key]}</option>)}
              </select>
            </div>

            {loading && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400">Načítám výkresy…</div>}
            {!loading && !plans.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-xs text-slate-500">Zatím nejsou nahrané žádné výkresy.</div>}

            <div className="space-y-2">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  onClick={() => setSelectedId(plan.id)}
                  className={`cursor-pointer rounded-2xl border p-3 transition ${selectedId === plan.id ? 'border-blue-700 bg-blue-950/20' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-white">{plan.title}</p>
                      <p className="text-[11px] text-slate-500">{DISCIPLINE_LABELS[plan.discipline] || plan.discipline} • {FORMAT_LABELS[plan.format] || plan.format} • v{plan.version}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); handleArchive(plan); }}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-300"
                    >
                      Archivovat
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
          {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}

          {!selectedPlan && <div className="rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center text-sm text-slate-500">Vyberte nebo nahrajte výkres pro náhled.</div>}

          {selectedPlan && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedPlan.title}</h3>
                  <p className="text-xs text-slate-500">
                    {DISCIPLINE_LABELS[selectedPlan.discipline] || selectedPlan.discipline} • {FORMAT_LABELS[selectedPlan.format] || selectedPlan.format} • verze {selectedPlan.version}
                    {selectedPlan.fileName ? ` • ${selectedPlan.fileName}` : ''}
                  </p>
                </div>
                <label className="cursor-pointer rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
                  Nahrát novou verzi
                  <input type="file" accept=".pdf,.dxf,.dwg,image/*" onChange={handleUploadVersion} className="hidden" />
                </label>
              </div>

              {selectedPlan.format === 'PDF' && pageCount > 1 && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-700 px-3 py-1 font-bold text-slate-200 disabled:opacity-40">◀</button>
                  <span>Strana {pageNumber} / {pageCount}</span>
                  <button type="button" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))} className="rounded-lg border border-slate-700 px-3 py-1 font-bold text-slate-200 disabled:opacity-40">▶</button>
                </div>
              )}

              <p className="text-[11px] text-slate-500">Klikněte do výkresu pro přidání značky/komentáře na danou pozici.</p>

              <PlanCanvas
                plan={selectedPlan}
                markers={markers}
                pageNumber={pageNumber}
                onPageCountChange={setPageCount}
                onCanvasClick={handleCanvasClick}
              />

              {markers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-rose-400">Značky ({markers.length})</p>
                  {markers.map((marker) => (
                    <div key={marker.id} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                      {marker.text}
                      {marker.pageNumber > 1 ? ` (strana ${marker.pageNumber})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
