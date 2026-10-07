import { useRef, useState } from 'react';
import { Bot, Camera, Send, Sparkles } from 'lucide-react';
import { api } from '../../api/client.js';

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = String(dataUrl).split(',')[1] || '';
      resolve({ mimeType: file.type || 'image/jpeg', dataBase64: base64, name: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function GeminiChatPanel({ token }) {
  const [prompt, setPrompt] = useState('Jak správně dotěsnit prostup potrubím Ø 250 skrz sádrokartonovou příčku?');
  const [images, setImages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const addImages = async (files) => {
    const list = Array.from(files || []).slice(0, 3);
    const encoded = await Promise.all(list.map(fileToBase64));
    setImages((prev) => [...prev, ...encoded].slice(0, 3));
  };

  const send = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(null);
    try {
      const response = await api.request('/api/gemini/chat', {
        method: 'POST', token,
        body: { prompt, images, model: 'gemini-1.5-flash' },
      });
      const text = response.text || 'Bez odpovědi.';
      setMessages((m) => [...m, { role: 'user', text: prompt, images }, { role: 'ai', text, offline: response.offline }]);
      setPrompt('');
      setImages([]);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-slate-900 p-5">
      <header className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-purple-500/20 p-2 text-purple-300"><Bot className="h-5 w-5" /></div>
        <div>
          <h3 className="text-lg font-black text-white">Gemini AI (chat + fotka)</h3>
          <p className="text-xs text-slate-400">Zeptej se, přilož až 3 fotky z místa — AI ti navrhne řešení.</p>
        </div>
      </header>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
        {messages?.map((m, i) => (
          <div key={i} className={`rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-slate-800 text-slate-100' : 'bg-purple-900/40 text-purple-100'}`}>
            <p className="text-[10px] font-black uppercase opacity-70">{m.role === 'user' ? 'Ty' : 'Gemini'}{m.offline ? ' (offline)' : ''}</p>
            <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
            {m.images?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.images?.map((img, j) => (
                  <img key={j} src={`data:${img.mimeType};base64,${img.dataBase64}`} className="h-16 w-16 rounded-lg object-cover" alt="" />
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {!messages.length && <p className="text-center text-xs text-slate-500">Napiš dotaz a klidně přiděl fotku.</p>}
      </div>

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images?.map((img, i) => (
            <div key={i} className="relative">
              <img src={`data:${img.mimeType};base64,${img.dataBase64}`} className="h-14 w-14 rounded-lg object-cover" alt="" />
              <button type="button" onClick={() => setImages(images.filter((_, k) => k !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-slate-950 px-1 text-xs text-white">×</button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-2 text-sm text-rose-200">{error}</div>}

      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100"
          placeholder="Zeptej se Gemini…" />
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} className="hidden" />
          <label className="cursor-pointer flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 hover:bg-slate-800" title="Vyfotit z fotoaparátu">
            <span className="text-sm">📷</span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => addImages(e.target.files)} className="hidden" onClick={(e) => e.target.value = null} />
          </label>
          <button onClick={() => fileRef.current?.click()} type="button"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 hover:bg-slate-800"
            title="Přidat fotku z galerie"><Camera className="h-4 w-4" /></button>
          <button onClick={send} disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {loading ? 'Přemýšlím…' : 'Odeslat'}
          </button>
        </div>
      </div>
    </section>
  );
}
