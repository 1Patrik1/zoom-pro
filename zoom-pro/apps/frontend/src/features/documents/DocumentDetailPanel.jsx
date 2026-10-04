export function DocumentDetailPanel({ item }) {
  if (!item) {
    return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">Vyber dokument ze seznamu pro detail.</div>;
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{item.title}</h3>
          <p className="text-sm text-slate-500">{item.documentType} • {item.status}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>ID: {item.id}</div>
          <div>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-blue-400">Metadata</p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div><span className="font-bold">Locale:</span> {item.locale || '-'}</div>
            <div><span className="font-bold">Template:</span> {item.templateId || '-'}</div>
            <div><span className="font-bold">Project:</span> {item.projectId || '-'}</div>
            <div><span className="font-bold">Invoice:</span> {item.invoiceId || '-'}</div>
            <div><span className="font-bold">Approver:</span> {item.approverId || '-'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">Poznámka</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{item.note || 'Bez poznámky'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Data JSON</p>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">{JSON.stringify(item.dataJson || {}, null, 2)}</pre>
      </div>
    </div>
  );
}
