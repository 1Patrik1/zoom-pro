export function SignatureRequestDetailPanel({ item }) {
  if (!item) {
    return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">Vyber podpisový požadavek pro detail.</div>;
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{item.signerName}</h3>
          <p className="text-sm text-slate-500">{item.signatureLevel} • {item.status}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>ID: {item.id}</div>
          <div>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        <div><span className="font-bold">Provider:</span> {item.providerName || item.providerId}</div>
        <div><span className="font-bold">Signer email:</span> {item.signerEmail || item.signerUserEmail || '-'}</div>
        <div><span className="font-bold">Document:</span> {item.documentTitle || item.documentId || '-'}</div>
        <div><span className="font-bold">Expires:</span> {item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '-'}</div>
        <div><span className="font-bold">Signing URL:</span> {item.signingUrl || '-'}</div>
      </div>
    </div>
  );
}
