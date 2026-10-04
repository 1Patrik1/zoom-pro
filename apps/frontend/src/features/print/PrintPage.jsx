import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer, QrCode } from 'lucide-react';
import { api } from '../../api/client.js';

const DOCUMENT_TYPES = [
  { key: 'issue', label: 'Výdejka materiálu', endpoint: 'document/issue' },
  { key: 'receipt', label: 'Příjemka materiálu', endpoint: 'document/receipt' },
  { key: 'inventory-audit', label: 'Inventurní protokol', endpoint: 'document/inventory-audit' }
];

export function PrintPage({ db, token }) {
  const projects = db.projects || [];
  const items = db.inventoryItems || [];
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [documentType, setDocumentType] = useState('issue');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [documentPayload, setDocumentPayload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const filteredItems = useMemo(
    () => items.filter((item) => item.code),
    [items]
  );

  async function generateDocument() {
    setBusy(true);
    setError('');
    try {
      if (documentType === 'issue' || documentType === 'receipt') {
        const response = await api.post(`print/${documentType === 'issue' ? 'document/issue' : 'document/receipt'}`, token, {});
        setDocumentPayload(response.document);
      } else if (documentType === 'inventory-audit') {
        const response = await api.post('print/document/inventory-audit', token, {});
        setDocumentPayload(response.document);
      } else if (documentType === 'qr-project') {
        if (!projectId) {
          setError('Vyber projekt pro QR zónu.');
          setBusy(false);
          return;
        }
        const response = await api.post('print/qr/project-zone', token, { projectId });
        setDocumentPayload(response.document);
      } else if (documentType === 'qr-inventory') {
        const response = await api.post('print/qr/inventory-labels', token, { codes: selectedCodes });
        setDocumentPayload(response.document);
      }
    } catch (err) {
      setError(err.message || 'Vygenerování dokumentu selhalo.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!documentPayload?.payload) return;
    const blob = new Blob([String(documentPayload.payload)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentPayload.filename || 'document.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPrintPreview() {
    if (!documentPayload?.payload) return;
    const w = window.open('', 'print-preview', 'width=900,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>${documentPayload.title || 'Tisk'}</title></head><body style="margin:0">${documentPayload.payload}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Tiskové dokumenty</p>
          <h2 className="mt-2 text-2xl font-black text-white">Výdejka, příjemka, inventura</h2>

          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <p>Vyber typ dokladu a odešli ho k vytištění nebo stažení. Vše běží přes API serveru (SVG), bez externích závislostí.</p>
            <p className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
              Náhled dokumentu se zobrazí níže, současně ho lze vytisknout nebo stáhnout jako SVG.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-semibold text-slate-300">
              Typ dokumentu
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none">
                {DOCUMENT_TYPES.map((doc) => <option key={doc.key} value={doc.key}>{doc.label}</option>)}
                <option value="qr-project">QR zóna projektu</option>
                <option value="qr-inventory">QR štítky materiálu</option>
              </select>
            </label>

            {documentType === 'qr-project' ? (
              <label className="block text-sm font-semibold text-slate-300">
                Projekt
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none">
                  <option value="">Vyber projekt</option>
                  {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            ) : null}

            {documentType === 'qr-inventory' ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-slate-300">Vyber QR kódy (vynecháš-li výběr, vezme se prvních 12)</p>
                <div className="max-h-48 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-2 text-slate-200">
                  {filteredItems?.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(item.code)}
                        onChange={(event) => setSelectedCodes((prev) => event.target.checked ? [...prev, item.code] : prev.filter((c) => c !== item.code))}
                      />
                      <span>{item.name} ({item.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={generateDocument} className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                <FileText className="mr-2 inline h-4 w-4" />
                {busy ? 'Generuji…' : 'Vygenerovat'}
              </button>
              <button disabled={!documentPayload} onClick={download} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-40">
                <Download className="mr-2 inline h-4 w-4" />
                Stáhnout SVG
              </button>
              <button disabled={!documentPayload} onClick={openPrintPreview} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-40">
                <Printer className="mr-2 inline h-4 w-4" />
                Tisk
              </button>
            </div>
            {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Tipy</p>
          <h2 className="mt-2 text-2xl font-black text-white">QR a tiskové štítky</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            <li className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <strong>QR zóna projektu</strong> – vygeneruje SVG s JSON popisem stavby, který lze přečíst libovolnou čtečkou.
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <strong>QR štítky materiálu</strong> – tisk archu 240×120 px s QR kódem, názvem a lokací.
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <strong>Výdejka / příjemka / inventura</strong> – kompletní doklady s podpisovou linií, datem a součtem.
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <strong>Bezpečnost</strong> – dokumenty se generují jen pro přihlášenou firmu, žádná data neunikají mimo tenant.
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Statistiky</p>
          <h2 className="mt-2 text-2xl font-black text-white">Tiskový audit</h2>
          <div className="mt-4 grid gap-3">
            <StatRow label="Položek skladu s QR" value={filteredItems.length} />
            <StatRow label="Aktivní projekty" value={projects.length} />
            <StatRow label="Poslední dokument" value={documentPayload?.rows ?? '—'} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Náhled</p>
        <h2 className="mt-2 text-2xl font-black text-white">Dokument</h2>
        {documentPayload ? (
          <div className="mt-4 overflow-auto rounded-3xl border border-slate-800 bg-white p-4">
            <div dangerouslySetInnerHTML={{ __html: documentPayload.payload }} />
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center text-sm text-slate-400">
            <QrCode className="mx-auto h-10 w-10 text-slate-500" />
            <p className="mt-3">Vyber typ dokumentu a klikni na „Vygenerovat“.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
