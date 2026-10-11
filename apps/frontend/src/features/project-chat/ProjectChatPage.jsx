import { useEffect, useMemo, useState } from 'react';

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
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ProjectChatPage({ db, onChat }) {
  const projects = db.projects || [];
  const chats = db.chats || [];
  const gallery = db.projectGallery || [];
  const [activeProject, setActiveProject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!projects.some((project) => project.id === activeProject)) {
      setActiveProject(projects[0]?.id || '');
    }
  }, [projects, activeProject]);

  const project = useMemo(() => projects.find((item) => item.id === activeProject) || null, [projects, activeProject]);
  const projectChats = useMemo(() => chats.filter((item) => item.projectId === activeProject), [chats, activeProject]);
  const projectGallery = useMemo(() => gallery.filter((item) => item.projectId === activeProject), [gallery, activeProject]);

  async function submitMessage(event) {
    event.preventDefault();
    if (!activeProject) return;
    setError('');
    setIsSending(true);
    try {
      const attachments = await Promise.all(selectedFiles.map(fileToImageDataUrl));
      await onChat({ projectId: activeProject, text: message.trim(), attachments });
      setMessage('');
      setSelectedFiles([]);
      event.currentTarget.reset();
    } catch (sendError) {
      setError(sendError.message || 'Zprávu se nepodařilo odeslat');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Komunikace</p>
        <h1 className="mt-1 text-2xl font-black text-white">Chat projektů</h1>
        <p className="mt-2 text-sm text-slate-400">Zprávy a fotografie přiřazené k jednotlivým projektům.</p>
        <label className="mt-5 block max-w-xl space-y-2 text-sm text-slate-300">
          <span>Projekt</span>
          <select value={activeProject} onChange={(event) => setActiveProject(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
            {!projects.length && <option value="">Nejdřív založte projekt</option>}
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ` · ${item.code}` : ''}</option>)}
          </select>
        </label>
      </header>

      {!project ? <p className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Pro chat zatím není vybraný žádný projekt.</p> : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-400">{project.name}</h2>
            <div className="max-h-[60vh] min-h-64 space-y-3 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
              {projectChats.map((chat) => (
                <article key={chat.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-blue-400">{chat.authorName}</p>
                    <time className="text-[11px] text-slate-500">{new Date(chat.createdAt).toLocaleString('cs-CZ')}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{chat.text}</p>
                  {chat.attachmentUrl && <button type="button" onClick={() => setLightbox({ url: chat.attachmentUrl, caption: chat.text })} className="mt-3 block overflow-hidden rounded-2xl border border-slate-800"><img src={chat.attachmentUrl} alt={chat.text || 'Foto z chatu'} className="max-h-80 w-full object-cover" /></button>}
                  {!!chat.galleryCount && <p className="mt-2 text-xs text-slate-400">Galerie příspěvku: {chat.galleryCount} fotek</p>}
                </article>
              ))}
              {!projectChats.length && <p className="text-sm text-slate-500">Zatím bez zpráv.</p>}
            </div>
            <form onSubmit={submitMessage} className="mt-4 space-y-3">
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Zpráva, poznámka nebo popis fotek…" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">📷 Vyfotit<input type="file" accept="image/*" capture="environment" onChange={(event) => setSelectedFiles(Array.from(event.target.files || []).slice(0, 4))} className="hidden" /></label>
                <label className="flex-1 cursor-pointer rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">🖼️ Galerie<input type="file" accept="image/*" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []).slice(0, 4))} className="hidden" /></label>
              </div>
              {selectedFiles.length > 0 && <p className="text-xs text-slate-400">Vybráno fotek: {selectedFiles.length}</p>}
              {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
              <div className="flex gap-2">
                <button disabled={isSending || (!message.trim() && !selectedFiles.length)} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isSending ? 'Odesílám…' : 'Odeslat zprávu'}</button>
                <button type="button" onClick={() => { setMessage(''); setSelectedFiles([]); setError(''); }} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200">Vyčistit</button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-400">Galerie projektu</h2><p className="mt-1 text-sm text-slate-400">Fotky sdílené v projektovém chatu.</p></div><span className="rounded-full border border-slate-700 px-3 py-2 text-xs font-black text-slate-200">{projectGallery.length} ks</span></div>
            <div className="mt-4 grid max-h-[70vh] gap-3 overflow-auto sm:grid-cols-2 2xl:grid-cols-1">
              {projectGallery.map((item) => <button key={item.id} type="button" onClick={() => setLightbox({ url: item.imageUrl, caption: item.caption || project.name })} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left"><img src={item.imageUrl} alt={item.caption || 'Galerie projektu'} className="h-40 w-full object-cover" /><div className="p-3"><p className="line-clamp-2 text-sm text-white">{item.caption || 'Foto ze stavby'}</p><p className="mt-1 text-xs text-slate-500">{item.authorName} · {new Date(item.createdAt).toLocaleString('cs-CZ')}</p></div></button>)}
              {!projectGallery.length && <p className="text-sm text-slate-500">Fotky odeslané do chatu se zobrazí tady.</p>}
            </div>
          </section>
        </div>
      )}

      {lightbox && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6" onClick={() => setLightbox(null)}><div className="max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950" onClick={(event) => event.stopPropagation()}><img src={lightbox.url} alt={lightbox.caption || 'Náhled'} className="max-h-[80vh] w-full object-contain" /><div className="flex items-center justify-between gap-3 p-4"><p className="text-sm text-slate-200">{lightbox.caption || 'Foto ze stavby'}</p><button type="button" onClick={() => setLightbox(null)} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-200">Zavřít</button></div></div></div>}
    </div>
  );
}
