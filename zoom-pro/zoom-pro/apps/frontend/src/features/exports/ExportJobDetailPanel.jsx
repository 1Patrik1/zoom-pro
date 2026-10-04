export function ExportJobDetailPanel({ item }) {
  if (!item) {
    return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">Vyber export job pro detail.</div>;
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{item.moduleKey}</h3>
          <p className="text-sm text-slate-500">{item.format} • {item.status}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>ID: {item.id}</div>
          <div>{item.startedAt ? new Date(item.startedAt).toLocaleString() : '-'}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Výstup</p>
          <div className="mt-3 space-y-2">
            <div><span className="font-bold">Soubor:</span> {item.outputFileName || '-'}</div>
            <div><span className="font-bold">URL:</span> {item.outputFileUrl || '-'}</div>
            <div><span className="font-bold">Velikost:</span> {item.outputSizeBytes ?? 0} B</div>
            <div><span className="font-bold">Počet záznamů:</span> {item.recordCount ?? 0}</div>
            <div><span className="font-bold">Dokončeno:</span> {item.completedAt ? new Date(item.completedAt).toLocaleString() : '-'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p className="text-xs font-black uppercase tracking-widest text-blue-400">Sign / audit metadata</p>
          <div className="mt-3 space-y-2">
            <div><span className="font-bold">Started by:</span> {item.startedBy || '-'}</div>
            <div><span className="font-bold">Signature request:</span> {item.signatureRequestId || '-'}</div>
            <div><span className="font-bold">Hash:</span> {item.outputFileHash || '-'}</div>
            <div><span className="font-bold">Chyba:</span> {item.errorMessage || '-'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-amber-400">Filtry exportu</p>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">{JSON.stringify(item.filters || {}, null, 2)}</pre>
      </div>
    </div>
  );
}
