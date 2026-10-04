import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Camera, Compass, Sparkles, Wand2 } from 'lucide-react';
import { api } from '../../api/client.js';

const CATEGORY_LABEL = {
  COLLISION: 'Kolize',
  MATERIAL: 'Materiál',
  NOISE_HAPTIC: 'Hluk / vibrace',
  LEAK: 'Netěsnost',
  ASSEMBLY: 'Montáž',
  ELECTRICAL: 'Elektro',
  AIR_FLOW: 'Vzduch / průtok',
  OTHER: 'Ostatní'
};

const SEVERITY_LABEL = {
  INFO: 'Informativní',
  WARNING: 'Kontrola',
  CRITICAL: 'Kritické'
};

function severityClass(severity) {
  switch ((severity || 'INFO').toUpperCase()) {
    case 'CRITICAL':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'WARNING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Soubor se nepodařilo načíst'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl, maxSize = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Obrázek se nepodařilo zpracovat'));
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.src = dataUrl;
  });
}

export function ProjectAssistantPage({ db, token }) {
  const projects = db.projects || [];
  const issues = db.troubleshooting || [];
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [context, setContext] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const fileRef = useRef(null);

  const filteredIssues = useMemo(
    () => projectId ? issues.filter((item) => item.projectId === projectId) : issues,
    [issues, projectId]
  );

  const loadContext = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.get(`troubleshooting/context/${projectId}`, token);
      setContext(response.context);
    } catch (err) {
      setError(err.message || 'Kontext se nepodařilo načíst.');
    } finally {
      setBusy(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    if (projectId) loadContext();
  }, [projectId, loadContext]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await readAsDataUrl(file);
      const resized = await resizeImageDataUrl(dataUrl);
      setImageUrl(resized);
      setInfo('Fotka připravena k odeslání.');
    } catch (err) {
      setError(err.message || 'Obrázek se nepodařilo přečíst.');
    }
  }

  async function analyzeLocal() {
    if (!description.trim() && !title.trim()) {
      setError('Zadej titulek nebo popis problému.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await api.post('troubleshooting/analyze', token, {
        text: `${title}\n\n${description}`
      });
      setAnalysis(response.analysis);
    } catch (err) {
      setError(err.message || 'AI analýza selhala.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAll(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const payload = {
        projectId,
        title: title.trim() || 'Bez titulku',
        description: description.trim() || 'Bez popisu',
        imageUrl: imageUrl || null,
        category: analysis?.category,
        severity: analysis?.severity,
        relatedMaterials: context?.projectMaterials || [],
        relatedAttendances: context?.projectAttendance || []
      };
      await api.post('troubleshooting', token, payload);
      setTitle('');
      setDescription('');
      setImageUrl('');
      setAnalysis(null);
      setInfo('AI troubleshooting se uložil do projektu.');
    } catch (err) {
      setError(err.message || 'Odeslání troubleshootingu selhalo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-400">AI troubleshooting</p>
              <h2 className="mt-2 text-2xl font-black text-white">Pomocník pro problémy na stavbě</h2>
              <p className="mt-1 text-sm text-slate-400">AI analyzuje popis, fotku, vazbu na projekt, docházku a sklad a navrhne řešení.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100">
                <option value="">Vyber projekt</option>
                {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <button disabled={busy} onClick={loadContext} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200">
                <Compass className="mr-1 inline h-3 w-3" /> Načíst kontext
              </button>
            </div>
          </div>

          <form onSubmit={submitAll} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-300">
              Titulek problému
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" placeholder="např. Vibrace na ventilu B-204" />
            </label>

            <label className="block text-sm font-semibold text-slate-300">
              Popis problému
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" placeholder="Co se stalo, kde, za jakých podmínek?" />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200">
                <Camera className="mr-2 inline h-4 w-4" />
                Přiložit fotku
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button type="button" disabled={busy} onClick={analyzeLocal} className="rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                <Wand2 className="mr-2 inline h-4 w-4" />
                Analyzovat text
              </button>
              <button type="submit" disabled={submitting || !projectId} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                <Bot className="mr-2 inline h-4 w-4" />
                {submitting ? 'Odesílám…' : 'Odeslat do projektu'}
              </button>
            </div>

            {imageUrl ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-3">
                <img src={imageUrl} className="max-h-72 w-full rounded-2xl object-cover" alt="Přiložená fotka" />
                <p className="mt-2 text-xs text-slate-400">Fotka se uloží k troubleshootingu a do projektové galerie.</p>
              </div>
            ) : null}

            {analysis ? (
              <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-fuchsia-100">
                <p className="text-xs font-black uppercase tracking-[0.3em]">AI analýza</p>
                <p className="mt-2 font-bold">Kategorie: {CATEGORY_LABEL[analysis.category] || analysis.category} · Závažnost: {SEVERITY_LABEL[analysis.severity] || analysis.severity}</p>
                <p className="mt-3 whitespace-pre-line text-sm text-fuchsia-100/90">{analysis.answer}</p>
              </div>
            ) : null}

            {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {info ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{info}</p> : null}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Kontext projektu</p>
          <h2 className="mt-2 text-2xl font-black text-white">AI troubleshooting kontext</h2>

          {!context ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center text-sm text-slate-400">
              Při výběru projektu se automaticky načte vazba na materiály a docházku, kterou AI využije při návrhu řešení.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Materiály na projektu</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {(context.projectMaterials || []).map((item) => (
                    <li key={item.itemId}>• {item.name} – {Number(item.quantityAfter)} / minimum {Number(item.minQuantity)}</li>
                  ))}
                  {!context.projectMaterials?.length ? <li className="text-slate-500">Bez evidovaného materiálu.</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Docházka na projektu</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {(context.projectAttendance || []).slice(0, 8).map((item) => (
                    <li key={item.id}>• {item.email} – {item.type}/{item.status} – {item.geoStatus} – {new Date(item.createdAt).toLocaleString('cs-CZ')}</li>
                  ))}
                  {!context.projectAttendance?.length ? <li className="text-slate-500">Bez docházky na projektu.</li> : null}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">AI troubleshooting v projektu</p>
            <h2 className="mt-2 text-2xl font-black text-white">Historie problémů a řešení</h2>
          </div>
          <Sparkles className="h-6 w-6 text-fuchsia-400" />
        </div>

        {filteredIssues.length ? filteredIssues?.map((issue) => (
          <div key={issue.id} className={`rounded-3xl border p-4 ${severityClass(issue.severity)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em]">{CATEGORY_LABEL[issue.category] || issue.category} · {SEVERITY_LABEL[issue.severity] || issue.severity}</p>
                <p className="mt-2 text-lg font-bold text-white">{issue.title}</p>
                <p className="mt-2 text-sm text-slate-200">{issue.description}</p>
                {issue.imageUrl ? <img src={issue.imageUrl} className="mt-3 max-h-56 rounded-2xl object-cover" alt={issue.title} /> : null}
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{issue.authorEmail}</p>
                <p className="mt-1 text-xs text-slate-300">{new Date(issue.createdAt).toLocaleString('cs-CZ')}</p>
              </div>
            </div>
            {issue.answerText ? (
              <div className="mt-3 rounded-2xl border border-slate-800/40 bg-slate-950/60 p-4 text-sm text-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-200">AI odpověď</p>
                <p className="mt-2 whitespace-pre-line">{issue.answerText}</p>
              </div>
            ) : null}
          </div>
        )) : (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center text-sm text-slate-400">
            Žádný troubleshooting v tomto projektu. Přidej první popis nebo fotku problému.
          </div>
        )}
      </div>
    </div>
  );
}
