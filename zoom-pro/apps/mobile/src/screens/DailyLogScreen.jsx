import { useEffect, useState } from 'react';
import { Camera, X, Send, RefreshCw, Mic, MicOff, MapPin } from 'lucide-react';
import { api } from '../lib/api.js';
import { takePhoto, getPosition } from '../lib/media.js';
import { embedGpsExif } from '../lib/exif.js';
import { startDictation } from '../lib/voice.js';

export function DailyLogScreen({ token }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [dictating, setDictating] = useState(false);
  const [stopDict, setStopDict] = useState(null);

  useEffect(() => {
    api.request('/api/sync', { token }).then((r) => setProjects(r?.projects || [])).catch(() => {});
  }, []);

  const addPhoto = async () => {
    const p = await takePhoto();
    if (!p) return;
    // (10) GPS EXIF geotag
    try {
      const pos = await getPosition();
      const tagged = await embedGpsExif(p, { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy });
      setPhotos((cur) => [...cur, { data: tagged, gps: pos }].slice(0, 6));
    } catch {
      setPhotos((cur) => [...cur, { data: p, gps: null }].slice(0, 6));
    }
  };

  const rmPhoto = (i) => setPhotos((cur) => cur.filter((_, idx) => idx !== i));

  // (3) Voice-to-text
  const toggleDict = async () => {
    if (dictating) { stopDict?.(); setDictating(false); return; }
    try {
      const stop = await startDictation({
        onResult: (t, final) => { setText(t); },
        onEnd: () => setDictating(false)
      });
      setStopDict(() => stop);
      setDictating(true);
    } catch (e) { setMsg('Diktování: ' + e.message); }
  };

  const submit = async () => {
    setLoading(true); setMsg('');
    try {
      const r = await api.requestOrQueue('/api/logs', {
        method: 'POST', token,
        body: {
          projectId,
          date: new Date().toISOString().slice(0, 10),
          weather: 'Neuvedeno',
          content: text,
          attachments: photos.map((p) => p.data)
        }
      });
      setMsg(r.queued ? '📦 Fronta (Sync)' : '✅ Odesláno');
      setText(''); setPhotos([]);
    } catch (e) { setMsg('Chyba: ' + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black">Deník</h2>
        <p className="text-xs text-slate-400">Text + fotky (s GPS EXIF) + diktování.</p>
      </header>

      <div className="card space-y-3">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white">
          <option value="">— bez projektu —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="relative">
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Např.: Dokončena montáž hlavního tahu, zbývá izolace…"
            className="w-full rounded-2xl bg-slate-800 px-3 py-3 pr-12 text-white outline-none" />
          <button onClick={toggleDict}
            className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full ${dictating ? 'bg-rose-600 animate-pulse' : 'bg-brand-600'}`}>
            {dictating ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>

        <button onClick={addPhoto} className="btn-ghost w-full">
          <Camera size={16} /> Přidat fotku s GPS ({photos.length}/6)
        </button>

        {!!photos.length && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.data} alt="" className="h-24 w-full rounded-2xl object-cover" />
                {p.gps && (
                  <span className="absolute bottom-1 left-1 rounded-lg bg-black/70 px-1 py-0.5 text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                    <MapPin size={8} /> {p.gps.lat.toFixed(4)}
                  </span>
                )}
                <button onClick={() => rmPhoto(i)} className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-rose-600">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={submit} disabled={loading || !text || !projectId} className="btn-primary w-full disabled:opacity-50">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          Odeslat zápis
        </button>

        {msg && <p className="text-sm text-center font-black">{msg}</p>}
      </div>
    </div>
  );
}
