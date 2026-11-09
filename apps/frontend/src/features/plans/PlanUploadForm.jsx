import { useState } from 'react';
import { fileToDataUrl } from './fileToDataUrl.js';
import { inferFormatFromFileName, PLAN_DISCIPLINES, DISCIPLINE_LABELS, FORMAT_LABELS, PLAN_FORMATS } from './planFormat.js';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // konzervativní limit pod express.json({limit:'5mb'}) po base64 expanzi

export function PlanUploadForm({ projects, onUpload, busy }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('OTHER');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    setError('');
    if (selected && selected.size > MAX_FILE_BYTES) {
      setError(`Soubor je příliš velký (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB). Zmenšete výkres nebo jej exportujte v nižší kvalitě.`);
      setFile(null);
      return;
    }
    setFile(selected);
    if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!projectId) { setError('Vyberte projekt'); return; }
    if (!file) { setError('Vyberte soubor výkresu'); return; }
    const format = inferFormatFromFileName(file.name);
    if (!format) {
      setError('Nepodporovaný typ souboru. Podporované formáty: ' + PLAN_FORMATS.join(', '));
      return;
    }
    try {
      const fileUrl = await fileToDataUrl(file);
      await onUpload({
        projectId,
        title: title || file.name,
        discipline,
        format,
        fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size
      });
      setFile(null);
      setTitle('');
      event.target.reset();
    } catch (err) {
      setError(err.message || 'Nahrání výkresu selhalo');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-black text-blue-400">Nahrát výkres</h2>
      <p className="text-sm text-slate-400">Podporované formáty: obrázek (JPG/PNG/SVG), PDF, DXF. DWG lze uložit a stáhnout, náhled vyžaduje export do PDF/DXF.</p>

      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
        <option value="">-- Projekt --</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Název výkresu" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />

      <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
        {PLAN_DISCIPLINES.map((key) => <option key={key} value={key}>{DISCIPLINE_LABELS[key]}</option>)}
      </select>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
        <span>{file ? `📄 ${file.name}` : '📎 Vybrat soubor výkresu'}</span>
        <input type="file" accept=".pdf,.dxf,.dwg,image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <button disabled={busy} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-50">
        {busy ? 'Nahrávám…' : 'Nahrát výkres'}
      </button>
    </form>
  );
}

export { FORMAT_LABELS };
