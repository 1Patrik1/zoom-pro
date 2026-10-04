import { useState } from 'react';

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

export function DailyLogPage({ db, onCreate }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveMessage('');
    setSaveError('');
    setIsSaving(true);
    try {
      const attachments = [];
      for (const file of selectedFiles) {
        attachments.push(await fileToImageDataUrl(file));
      }
      await onCreate({
        projectId: e.target.projectId.value,
        date: e.target.date.value,
        weather: e.target.weather.value,
        content: e.target.content.value,
        attachments
      });
      e.target.reset();
      setSelectedFiles([]);
      setSaveMessage('Stavební deník byl uložen včetně fotek.');
    } catch (error) {
      setSaveError(error.message || 'Uložení deníku selhalo');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <select name="projectId" required className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
          <option value="">-- Stavba --</option>
          {(db.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="date" required type="date" className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input name="weather" required placeholder="Počasí" className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
        </div>
        <textarea name="content" required placeholder="Stavební deník / zápis..." className="h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />

        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
          <span>{selectedFiles.length ? `Vybráno fotek: ${selectedFiles.length}` : 'Přidat fotky do deníku'}</span>
          <input type="file" accept="image/*" multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []).slice(0, 4))} className="hidden" />
          <span className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white">Vybrat</span>
        </label>

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

        {saveMessage && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{saveMessage}</div>}
        {saveError && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{saveError}</div>}

        <button disabled={isSaving} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-50">{isSaving ? 'Ukládám…' : 'Uložit zápis'}</button>
      </form>

      <div className="space-y-3">
        {(db.logs || []).map((log) => (
          <article key={log.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black text-blue-400">{log.projectName || 'Bez projektu'}</h3>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{new Date(log.logDate).toLocaleDateString('cs-CZ')}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-amber-400">Počasí: {log.weather}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{log.content}</p>

            {Array.isArray(log.attachments) && !!log.attachments.length && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {log.attachments.map((imageUrl, index) => (
                  <button key={`${log.id}-${index}`} type="button" onClick={() => setLightbox({ url: imageUrl, caption: log.content })} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left">
                    <img src={imageUrl} alt={`Foto deníku ${index + 1}`} className="h-40 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <p className="mt-3 text-right text-xs text-slate-500">Zapsal: {log.authorName}</p>
          </article>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6" onClick={() => setLightbox(null)}>
          <div className="max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || 'Náhled'} className="max-h-[80vh] w-full object-contain" />
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-slate-200">{lightbox.caption || 'Foto ze stavebního deníku'}</p>
              <button type="button" onClick={() => setLightbox(null)} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-200">Zavřít</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
