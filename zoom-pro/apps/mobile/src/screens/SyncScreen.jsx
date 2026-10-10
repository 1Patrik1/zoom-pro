import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { queue } from '../lib/storage.js';
import { api } from '../lib/api.js';

export function SyncScreen({ online }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => setItems(await queue.list());
  useEffect(() => { load(); }, []);

  const syncAll = async () => {
    if (!online) { setMsg('Nejsi online.'); return; }
    setBusy(true); setMsg('');
    const res = await api.syncQueue(({ ok, fail, total }) => setMsg(`${ok}/${total} odesláno, ${fail} chyb`));
    setMsg(`Hotovo: ${res.ok} OK, ${res.fail} chyb`);
    setBusy(false);
    load();
  };

  const removeOne = async (key) => { await queue.remove(key); load(); };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black">Sync fronta</h2>
        <p className="text-xs text-slate-400">{items.length} položek čeká na odeslání.</p>
      </header>

      <button onClick={syncAll} disabled={busy || !items.length || !online}
        className="btn-primary w-full disabled:opacity-50">
        {busy ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {busy ? 'Odesílám…' : 'Synchronizovat vše'}
      </button>

      {msg && <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-200">{msg}</div>}

      <div className="space-y-2">
        {items.map(({ key, val }) => (
          <div key={key} className="card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{val.opts?.method || 'GET'} {val.path}</p>
                <p className="text-[10px] text-slate-400">{new Date(val.ts).toLocaleString('cs-CZ')} · pokusů: {val.attempts || 0}</p>
                {val.lastError && <p className="mt-1 text-xs text-rose-400 flex items-center gap-1"><AlertCircle size={12} /> {val.lastError}</p>}
              </div>
              <button onClick={() => removeOne(key)} className="text-rose-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="card text-center">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-1" size={22} />
            <p className="text-sm font-black">Fronta je prázdná</p>
            <p className="text-xs text-slate-400">Vše synchronizováno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
