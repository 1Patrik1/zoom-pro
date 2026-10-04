import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, Hammer, RefreshCcw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { api } from '../../api/client.js';

const KIND_LABEL = {
  PERSON_OVERLAP_DAY: 'Kolize lidí',
  MATERIAL_RACE: 'Materiál pod minimum',
  BUDGET_OVERRUN: 'Rozpočet překročen',
  SCHEDULE_OVERLAP: 'Překryv termínů',
  SKILL_MISMATCH: 'Nesoulad rolí'
};

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Otevřené' },
  { value: 'ACKNOWLEDGED', label: 'V řešení' },
  { value: 'RESOLVED', label: 'Vyřešené' },
  { value: 'IGNORED', label: 'Ignorované' }
];

function severityClass(severity) {
  switch ((severity || 'WARNING').toUpperCase()) {
    case 'CRITICAL':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'WARNING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  }
}

function parseDetail(detailJson) {
  if (!detailJson) return {};
  if (typeof detailJson === 'string') {
    try { return JSON.parse(detailJson); } catch { return {}; }
  }
  if (typeof detailJson === 'object') return detailJson;
  return {};
}

export function CollisionsPage({ db, token }) {
  const collisions = db.collisions || [];
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const filtered = useMemo(
    () => statusFilter ? collisions.filter((item) => item.status === statusFilter) : collisions,
    [collisions, statusFilter]
  );

  const summary = useMemo(() => {
    const result = { total: collisions.length, critical: 0, warning: 0, info: 0, byKind: {} };
    collisions.forEach((item) => {
      const sev = (item.severity || 'WARNING').toUpperCase();
      if (sev === 'CRITICAL') result.critical += 1;
      else if (sev === 'WARNING') result.warning += 1;
      else result.info += 1;
      result.byKind[item.kind] = (result.byKind[item.kind] || 0) + 1;
    });
    return result;
  }, [collisions]);

  const runDetection = useCallback(async () => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const response = await api.post('collisions/detect', token, {});
      setInfo(`Detekováno ${response.result.detected} kolizí, uloženo ${response.result.persisted}.`);
    } catch (err) {
      setError(err.message || 'Detekce kolizí selhala.');
    } finally {
      setBusy(false);
    }
  }, [token]);

  const updateStatus = useCallback(async (collision, status) => {
    setBusy(true);
    setError('');
    try {
      await api.post('collisions/status', token, { collisionId: collision.id, status });
      setInfo(`Kolize ${KIND_LABEL[collision.kind] || collision.kind} byla aktualizována.`);
    } catch (err) {
      setError(err.message || 'Aktualizace kolize selhala.');
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!collisions.length) {
      runDetection();
    }
  }, [collisions.length, runDetection]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard icon={ShieldCheck} label="Celkem" value={summary.total} tone="blue" />
        <SummaryCard icon={AlertTriangle} label="Kritické" value={summary.critical} tone="rose" />
        <SummaryCard icon={Hammer} label="Varování" value={summary.warning} tone="amber" />
        <SummaryCard icon={Sparkles} label="Informativní" value={summary.info} tone="emerald" />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Kolizní engine</p>
            <h2 className="mt-2 text-2xl font-black text-white">Detekce a správa kolizí</h2>
            <p className="mt-1 text-sm text-slate-400">Prochází data z docházky, skladu, fakturace a plánů projektů.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100">
              <option value="">Všechny stavy</option>
              {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <button disabled={busy} onClick={runDetection} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
              <Wand2 className="mr-2 inline h-4 w-4" />
              {busy ? 'Analyzuji…' : 'Spustit detekci'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(KIND_LABEL).map(([kind, label]) => (
            <div key={kind} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-white">{summary.byKind[kind] || 0}</p>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        {info ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{info}</p> : null}
      </div>

      <div className="space-y-3">
        {filtered.length ? filtered?.map((collision) => {
          const detail = parseDetail(collision.detailJson);
          const status = (collision.status || 'OPEN').toUpperCase();
          return (
            <div key={collision.id} className={`rounded-3xl border p-4 ${severityClass(collision.severity)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em]">{KIND_LABEL[collision.kind] || collision.kind}</p>
                  <p className="mt-2 text-lg font-bold text-white">{detail.message || 'Detekovaný konflikt'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                    {collision.projectName ? <span className="rounded-full bg-slate-800/60 px-3 py-1">Projekt: {collision.projectName}</span> : null}
                    {collision.userEmail ? <span className="rounded-full bg-slate-800/60 px-3 py-1">Člověk: {collision.userEmail}</span> : null}
                    {collision.itemName ? <span className="rounded-full bg-slate-800/60 px-3 py-1">Materiál: {collision.itemName}</span> : null}
                    {collision.day ? <span className="rounded-full bg-slate-800/60 px-3 py-1">Den: {collision.day}</span> : null}
                    {detail.overrun ? <span className="rounded-full bg-rose-500/20 px-3 py-1">Překročení: {detail.overrun} CZK</span> : null}
                    {Array.isArray(detail.items) && detail.items.length ? (
                      <span className="rounded-full bg-amber-500/20 px-3 py-1">
                        Materiál: {detail.items?.map((it) => `${it.name} (${Number(it.after || 0)}/${Number(it.min || 0)})`).join(', ')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">{status}</span>
                  <span className="text-xs text-slate-300">{new Date(collision.createdAt).toLocaleString('cs-CZ')}</span>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((statusOption) => (
                      <button
                        key={statusOption.value}
                        disabled={busy || status === statusOption.value}
                        onClick={() => updateStatus(collision, statusOption.value)}
                        className={`rounded-xl border px-2 py-1 text-[11px] font-bold ${status === statusOption.value ? 'border-slate-700 bg-slate-900 text-slate-500' : 'border-current/20 text-current'}`}
                      >
                        {statusOption.value === 'OPEN' ? <RefreshCcw className="h-3 w-3" /> : statusOption.value === 'RESOLVED' ? <Check className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center text-sm text-slate-400">
            Pro vybraný filtr nejsou evidovány žádné kolize.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
  }[tone];
  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
