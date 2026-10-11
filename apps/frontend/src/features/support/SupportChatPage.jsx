import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Send } from 'lucide-react';
import { api } from '../../api/client.js';
import { userDisplayName } from '../../utils/user-name.js';

export function SupportChatPage({ user, token }) {
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const [companies, setCompanies] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [companyId, setCompanyId] = useState(user?.companyId || '');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let active = true;
    api.request('/api/saas/companies', { token })
      .then((result) => {
        if (!active) return;
        const rows = result.rows || [];
        setCompanies(rows);
        setCompanyId((current) => current || rows[0]?.id || '');
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [isSuperAdmin, token]);

  const loadMessages = useCallback(async () => {
    if (!companyId) { setMessages([]); return; }
    try {
      const query = isSuperAdmin ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const result = await api.request(`/api/support${query}`, { token });
      setMessages(result.messages || []);
      setError('');
    } catch (err) { setError(err.message); }
  }, [companyId, isSuperAdmin, token]);

  const loadRequests = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const result = await api.request('/api/support/requests', { token });
      setOpenRequests(result.requests || []);
    } catch (err) { setError(err.message); }
  }, [isSuperAdmin, token]);

  useEffect(() => {
    loadMessages();
    loadRequests();
    const timer = window.setInterval(loadMessages, 5000);
    const requestTimer = isSuperAdmin ? window.setInterval(loadRequests, 10000) : null;
    return () => { window.clearInterval(timer); if (requestTimer) window.clearInterval(requestTimer); };
  }, [loadMessages, loadRequests, isSuperAdmin]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !companyId || sending) return;
    setSending(true);
    setError('');
    try {
      await api.request('/api/support', {
        method: 'POST', token, body: { companyId, text: value }
      });
      setText('');
      await loadMessages();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  const resolveRequest = async (requestId) => {
    try {
      await api.request(`/api/support/requests/${requestId}/resolve`, { method: 'POST', token, body: {} });
      await Promise.all([loadRequests(), loadMessages()]);
    } catch (err) { setError(err.message); }
  };

  const company = companies.find((item) => item.id === companyId);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-950 to-slate-900 p-6">
        <h2 className="flex items-center gap-2 text-xl font-black text-white"><Building2 size={20} /> Chat podpory</h2>
        <p className="mt-1 text-sm text-slate-400">Přímá komunikace mezi firmou a podporou Zoom Pro.</p>
      </header>

      {isSuperAdmin && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <label htmlFor="support-company" className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Firma</label>
          <select id="support-company" value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
            {!companies.length && <option value="">Zatím nejsou registrované firmy</option>}
            {companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerEmail || 'bez vlastníka'}</option>)}
          </select>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-300">{error}</p>}

      {isSuperAdmin && <section className="rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-amber-200">Žádosti o balíček nebo příplatkový modul</h3>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Nevyřízené: {openRequests.length}</span>
        </div>
        {openRequests.length ? <div className="mt-3 space-y-2">
          {openRequests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-900/70 bg-slate-950/70 p-3">
            <button type="button" onClick={() => setCompanyId(request.companyId)} className="min-w-0 flex-1 text-left">
              <p className="text-sm font-black text-white">{request.companyName} · {request.requestDetails?.planCode || 'změna licence'}</p>
              <p className="mt-1 text-xs text-slate-300">{request.text}</p>
              <p className="mt-1 text-[10px] text-slate-500">{userDisplayName(request)} · {new Date(request.createdAt).toLocaleString('cs-CZ')}</p>
            </button>
            <button type="button" onClick={() => resolveRequest(request.id)} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-950/50">Označit vyřízené</button>
          </article>)}
        </div> : <p className="mt-2 text-sm text-slate-400">Žádné nové žádosti.</p>}
      </section>}

      <section className="flex min-h-[65vh] flex-col rounded-3xl border border-slate-800 bg-slate-900 p-4 md:p-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-black text-white">{isSuperAdmin ? company?.name || 'Vyberte firmu' : 'Podpora Zoom Pro'}</h3>
          {isSuperAdmin && company?.ownerEmail && <p className="mt-1 text-xs text-slate-500">{company.ownerEmail} · {company.userCount} uživatelů</p>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {messages.map((message) => {
            const mine = message.userId === user?.id;
            return (
              <article key={message.id} className={`max-w-3xl rounded-2xl border p-3 ${mine ? 'ml-auto border-indigo-800 bg-indigo-950/50' : 'border-slate-700 bg-slate-950'}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="text-xs font-black text-indigo-300">{mine ? 'Vy' : userDisplayName(message)}{isSuperAdmin && !mine && message.authorRole === 'SUPERADMIN' ? ' · Podpora' : ''}</p>
                  <time className="text-[10px] text-slate-500">{new Date(message.createdAt).toLocaleString('cs-CZ')}</time>
                </div>
                {message.requestType === 'LICENSE_REQUEST' && <p className="mt-2 inline-flex rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-black uppercase text-amber-300">Žádost o licenci{message.handledAt ? ' · vyřízeno' : ' · čeká na vyřízení'}</p>}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-100">{message.text}</p>
                {message.requestType === 'LICENSE_REQUEST' && message.requestDetails && <p className="mt-2 text-xs text-slate-400">Moduly: {(message.requestDetails.modules || []).join(', ') || 'bez příplatkových modulů'} · {message.requestDetails.users || '—'} členů · {message.requestDetails.period || '—'} měsíců</p>}
              </article>
            );
          })}
          {!messages.length && companyId && <p className="py-10 text-center text-sm text-slate-500">Konverzace zatím neobsahuje žádné zprávy.</p>}
          <div ref={endRef} />
        </div>
        <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-800 pt-4">
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={2} maxLength={5000} placeholder="Napište zprávu podpoře…" disabled={!companyId || sending} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50" />
          <button type="submit" disabled={!companyId || !text.trim() || sending} aria-label="Odeslat zprávu" className="flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"><Send size={16} /><span className="hidden sm:inline">Odeslat</span></button>
        </form>
      </section>
    </div>
  );
}
