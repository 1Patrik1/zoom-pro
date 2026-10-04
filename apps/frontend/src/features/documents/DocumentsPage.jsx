import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { DocumentDetailPanel } from './DocumentDetailPanel.jsx';

const DOCUMENT_TYPES = [
  'INVOICE',
  'ATTENDANCE_STATEMENT',
  'DAILY_LOG_REPORT',
  'PROJECT_HANDOVER_PROTOCOL',
  'VZT_CALCULATION_SHEET',
  'PRICE_OFFER',
  'SERVICE_REPORT'
];

const DOCUMENT_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'];

export function DocumentsPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');

  async function loadDocuments() {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (typeFilter) query.set('documentType', typeFilter);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const result = await api.get(`documents${suffix}`, token);
      const rows = Array.isArray(result) ? result : [];
      setItems(rows);
      setSelectedId((current) => {
        if (rows.some((item) => item.id === current)) return current;
        return rows[0]?.id || '';
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter, typeFilter]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const stats = useMemo(() => ({
    total: items.length,
    approved: items.filter((x) => x.status === 'APPROVED').length,
    draft: items.filter((x) => x.status === 'DRAFT').length,
    pending: items.filter((x) => x.status === 'PENDING_APPROVAL').length
  }), [items]);

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setMessage('');

    const payload = {
      documentType: form.documentType.value,
      title: form.title.value,
      locale: form.locale.value,
      note: form.note.value,
      dataJson: {
        referenceNumber: form.referenceNumber.value,
        customerName: form.customerName.value,
        amount: Number(form.amount.value || 0),
        description: form.description.value
      },
      attachments: []
    };

    try {
      const created = await api.post('documents', token, payload);
      setMessage(`Dokument ${created.title} byl vytvořen.`);
      form.reset();
      await loadDocuments();
      if (created?.id) setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function approveDocument(id) {
    setError('');
    setMessage('');
    try {
      const updated = await api.post(`documents/${id}/approve`, token, {});
      setMessage(`Dokument ${updated.title || id} byl schválen.`);
      await loadDocuments();
      setSelectedId(id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Dokumentů celkem" value={stats.total} tone="text-white" />
        <StatCard title="Schválené" value={stats.approved} tone="text-emerald-400" />
        <StatCard title="Čeká na schválení" value={stats.pending} tone="text-amber-400" />
        <StatCard title="Drafty" value={stats.draft} tone="text-sky-400" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        <form onSubmit={handleCreate} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black text-blue-400">Nový dokument</h2>
          <p className="text-sm text-slate-400">Formulář pro rychlé založení draftu dokumentu se základními metadaty a datovým JSON payloadem.</p>
          <select name="documentType" defaultValue="INVOICE" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
            {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input name="title" required placeholder="Název dokumentu" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input name="referenceNumber" placeholder="Reference / číslo" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input name="customerName" placeholder="Klient / partner" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input name="amount" type="number" step="0.01" placeholder="Částka" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input name="locale" defaultValue="cs" placeholder="Locale" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <textarea name="description" placeholder="Popis dat dokumentu" className="h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <textarea name="note" placeholder="Interní poznámka" className="h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
          {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}
          <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Vytvořit dokument</button>
        </form>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black text-amber-400">Seznam dokumentů</h3>
              <p className="text-sm text-slate-400">Klikni na záznam pro detail, schválení nebo kontrolu JSON payloadu.</p>
            </div>
            <button onClick={loadDocuments} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300">Obnovit</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="">Všechny stavy</option>
              {DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="">Všechny typy</option>
              {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400">
              Aktivní detail: <span className="font-bold text-white">{selectedItem?.title || 'žádný'}</span>
            </div>
          </div>

          {loading && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">Načítám dokumenty...</div>}

          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${selectedId === item.id ? 'border-blue-700 bg-blue-950/20' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-black text-white">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.documentType} • {item.locale}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.note || 'Bez poznámky'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black ${item.status === 'APPROVED' ? 'text-emerald-400' : item.status === 'PENDING_APPROVAL' ? 'text-amber-400' : 'text-sky-400'}`}>{item.status}</p>
                    <p className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</p>
                    {item.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          approveDocument(item.id);
                        }}
                        className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase text-white"
                      >
                        Schválit
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!loading && !items.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">Zatím nejsou žádné dokumenty.</div>}
          </div>
        </div>

        <DocumentDetailPanel item={selectedItem} />
      </section>
    </div>
  );
}

function StatCard({ title, value, tone }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      <p className={`mt-3 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
