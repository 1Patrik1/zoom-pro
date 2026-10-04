import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { SignatureRequestDetailPanel } from './SignatureRequestDetailPanel.jsx';

const LEVELS = ['INTERNAL_APPROVAL', 'SIMPLE', 'ADVANCED', 'QUALIFIED', 'ELECTRONIC_SEAL', 'TIMESTAMP_ONLY'];

export function SignaturesPage({ token }) {
  const [providers, setProviders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [providerResult, requestResult] = await Promise.all([
        api.get('signatures/providers', token),
        api.get('signatures/requests', token)
      ]);
      const providerRows = Array.isArray(providerResult) ? providerResult : [];
      const requestRows = Array.isArray(requestResult) ? requestResult : [];
      setProviders(providerRows);
      setRequests(requestRows);
      setSelectedRequestId((current) => {
        if (requestRows.some((item) => item.id === current)) return current;
        return requestRows[0]?.id || '';
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedRequest = useMemo(() => requests.find((item) => item.id === selectedRequestId) || null, [requests, selectedRequestId]);
  const stats = useMemo(() => ({
    providers: providers.length,
    activeProviders: providers.filter((provider) => provider.isActive).length,
    pending: requests.filter((request) => ['PENDING', 'SENT', 'VIEWED'].includes(request.status)).length,
    signed: requests.filter((request) => request.status === 'SIGNED').length
  }), [providers, requests]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage('');
    setError('');
    try {
      const result = await api.post('signatures/requests', token, {
        documentId: form.documentId.value || null,
        providerId: form.providerId.value,
        signerId: form.signerId.value || null,
        signerEmail: form.signerEmail.value || null,
        signerName: form.signerName.value,
        signatureLevel: form.signatureLevel.value,
        expiresAt: form.expiresAt.value || null
      });
      setMessage(`Podpisová žádost vytvořena: ${result.id}`);
      form.reset();
      await loadData();
      if (result?.id) setSelectedRequestId(result.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Poskytovatelé" value={stats.providers} tone="text-white" />
        <StatCard title="Aktivní poskytovatelé" value={stats.activeProviders} tone="text-emerald-400" />
        <StatCard title="Rozpracované žádosti" value={stats.pending} tone="text-amber-400" />
        <StatCard title="Podepsané" value={stats.signed} tone="text-sky-400" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-blue-400">Nový podpisový požadavek</h2>
            <p className="text-sm text-slate-400">Žádost může mířit na konkrétní dokument nebo vzniknout jako samostatný podpisový proces.</p>
            <input name="documentId" placeholder="documentId" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <select name="providerId" required defaultValue={providers.find((provider) => provider.isDefault)?.id || ''} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="">-- poskytovatel podpisu --</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name || provider.displayName || provider.providerKey}</option>)}
            </select>
            <input name="signerId" placeholder="signerId (volitelně)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <input name="signerName" required placeholder="Jméno podepisujícího" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <input name="signerEmail" type="email" placeholder="E-mail podepisujícího" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <select name="signatureLevel" defaultValue="INTERNAL_APPROVAL" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
            <input name="expiresAt" type="datetime-local" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
            {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}
            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Vytvořit podpisový požadavek</button>
          </form>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-emerald-400">Poskytovatelé podpisu</h3>
              <button onClick={loadData} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Obnovit</button>
            </div>
            {loading && <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">Načítám poskytovatele...</div>}
            <div className="space-y-3">
              {providers.map((provider) => (
                <div key={provider.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-white">{provider.name || provider.displayName || provider.providerKey}</p>
                      <p className="text-xs text-slate-500">{provider.providerKey}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${provider.isDefault ? 'text-emerald-400' : 'text-slate-400'}`}>{provider.isDefault ? 'Default' : 'Secondary'}</p>
                      <p className={`text-xs ${provider.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>{provider.isActive ? 'Aktivní' : 'Neaktivní'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && !providers.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">Zatím nejsou seeded podpisoví poskytovatelé.</div>}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-amber-400">Historie podpisových žádostí</h3>
              <p className="text-sm text-slate-400">Klikni na žádost pro detail, sign URL a vazbu na dokument/export.</p>
            </div>
            <button onClick={loadData} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Obnovit</button>
          </div>
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} onClick={() => setSelectedRequestId(request.id)} className={`cursor-pointer rounded-2xl border p-4 ${selectedRequestId === request.id ? 'border-blue-700 bg-blue-950/20' : 'border-slate-800 bg-slate-950'}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-white">{request.signerName}</p>
                    <p className="text-xs text-slate-500">{request.providerName || request.providerId} • {request.signatureLevel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-blue-400">{request.status}</p>
                    <p className="text-xs text-slate-500">{request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}</p>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !requests.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">Zatím nebyla vytvořena žádná podpisová žádost.</div>}
          </div>
        </div>

        <SignatureRequestDetailPanel item={selectedRequest} />
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
