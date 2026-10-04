// (4) UI pro podpis — předávací protokol
import { useState } from 'react';
import { PenTool, Send, CheckCircle2 } from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad.jsx';
import { api } from '../lib/api.js';

export function SignatureScreen({ token }) {
  const [signerName, setSignerName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [documentType, setDocumentType] = useState('handover');
  const [signature, setSignature] = useState(null);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setMsg('');
    if (!signature || !signerName) { setMsg('Vyplň jméno a podepiš.'); return; }
    const r = await api.requestOrQueue('/api/signatures', {
      method: 'POST', token,
      body: { signerName, projectId: projectId || null, documentType, signatureDataUrl: signature, signedAt: new Date().toISOString() }
    });
    setMsg(r.queued ? '📦 Fronta (Sync)' : '✅ Podpis uložen');
    setSignature(null); setSignerName('');
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black flex items-center gap-2"><PenTool size={20} className="text-brand-500" /> Podpis</h2>
        <p className="text-xs text-slate-400">Předávací protokol / dodací list / potvrzení.</p>
      </header>

      <div className="card space-y-2">
        <input placeholder="Jméno podepisujícího" value={signerName} onChange={(e) => setSignerName(e.target.value)}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white" />
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}
          className="w-full rounded-2xl bg-slate-800 px-3 py-3 text-white">
          <option value="handover">Předávací protokol</option>
          <option value="delivery">Dodací list</option>
          <option value="acceptance">Přejímka</option>
          <option value="damage">Reklamace</option>
        </select>
      </div>

      <SignaturePad onSave={setSignature} label="Podepiš prstem" />

      {signature && (
        <div className="card">
          <p className="text-xs text-slate-400 flex items-center gap-2"><CheckCircle2 size={14} /> Podpis připraven</p>
          <img src={signature} alt="podpis" className="mt-2 w-full rounded-2xl bg-white" />
        </div>
      )}

      <button onClick={submit} disabled={!signature} className="btn-primary w-full disabled:opacity-50">
        <Send size={16} /> Odeslat protokol
      </button>

      {msg && <p className="text-center text-sm font-black">{msg}</p>}
    </div>
  );
}
