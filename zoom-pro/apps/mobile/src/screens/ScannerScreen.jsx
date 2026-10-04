// (2) UI pro QR/EAN skener — sklad / naskladnění PO
import { useState } from 'react';
import { ScanLine, RefreshCw, Package, MinusCircle, PlusCircle } from 'lucide-react';
import { scanBarcode } from '../lib/scanner.js';
import { api } from '../lib/api.js';

export function ScannerScreen({ token }) {
  const [code, setCode] = useState('');
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const scan = async () => {
    setMsg('');
    try {
      setBusy(true);
      const v = await scanBarcode();
      if (v === '__SCAN_TIMEOUT__') { setMsg('Kód se nenašel (vypršel čas) — zkus to znovu nebo ho zadej ručně.'); return; }
      if (v) { setCode(v); await lookup(v); }
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const lookup = async (sku) => {
    try {
      const r = await api.request(`/api/distribution/catalog?search=${encodeURIComponent(sku)}`, { token });
      setItem(r.rows?.[0] || null);
      if (!r.rows?.[0]) setMsg('SKU nenalezeno v katalogu.');
    } catch (e) { setMsg(e.message); }
  };

  const move = async (kind) => {
    if (!item) return;
    setMsg('');
    const r = await api.requestOrQueue('/api/inventory/movement', {
      method: 'POST', token,
      body: { itemId: item.id, type: kind === 'IN' ? 'RECEIPT' : 'ISSUE', quantity: qty, note: `Scan ${code}` }
    });
    setMsg(r.queued ? '📦 Fronta (Sync)' : `✅ ${kind} ${qty} ks`);
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><ScanLine size={20} className="text-brand-500" /> QR / EAN skener</h2>
        <p className="text-xs text-slate-400">Naskladnění / výdej / inventura kamerou.</p>
      </header>

      <button onClick={scan} disabled={busy} className="btn-primary w-full">
        {busy ? <RefreshCw className="animate-spin" size={16} /> : <ScanLine size={16} />}
        {busy ? 'Skenuji…' : 'Skenovat kód'}
      </button>

      <div className="flex items-center gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="…nebo zadej kód ručně"
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white" />
        <button onClick={() => code && lookup(code)} disabled={!code} className="rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">Hledat</button>
      </div>

      {code && <div className="card"><p className="text-xs text-slate-400">Naskenováno / zadáno</p><p className="font-black break-all">{code}</p></div>}

      {item && (
        <div className="card">
          <div className="flex items-center gap-2"><Package size={16} /><p className="font-black">{item.name}</p></div>
          <p className="text-xs text-slate-400">SKU {item.sku} · {item.category}</p>

          <div className="mt-3 flex items-center justify-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-brand-500"><MinusCircle size={28} /></button>
            <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)}
              className="w-20 rounded-2xl bg-slate-800 text-center py-2 text-lg font-black" />
            <button onClick={() => setQty(qty + 1)} className="text-brand-500"><PlusCircle size={28} /></button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => move('IN')}  className="btn bg-emerald-600 text-white">Naskladnit</button>
            <button onClick={() => move('OUT')} className="btn bg-rose-600 text-white">Vydat</button>
          </div>
        </div>
      )}

      {msg && <div className="rounded-2xl bg-slate-800 p-3 text-sm">{msg}</div>}
    </div>
  );
}
