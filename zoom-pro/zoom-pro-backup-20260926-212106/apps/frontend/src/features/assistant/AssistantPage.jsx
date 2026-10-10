import { useMemo, useState } from 'react';
import { AlertTriangle, Bot, Lightbulb, Radar, Sparkles } from 'lucide-react';
import { api } from '../../api/client.js';
import { GeminiChatPanel } from './GeminiChatPanel.jsx';

function severityClass(severity) {
  switch (severity) {
    case 'critical':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    default:
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  }
}

export function AssistantPage({ db, token }) {
  const [prompt, setPrompt] = useState('Najdi kolize, problémy a slabá místa v provozu.');
  const [projectId, setProjectId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const quickStats = useMemo(() => ({
    lowStock: (db.inventoryItems || []).filter((item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0)).length,
    outOfRadius: (db.attendance || []).filter((item) => item.geoStatus === 'OUT_OF_RADIUS').length,
    unpaid: (db.invoices || []).filter((item) => item.status === 'ISSUED' || item.status === 'OVERDUE').length,
    logsWithPhotos: (db.logs || []).filter((item) => Array.isArray(item.attachments) && item.attachments.length > 0).length
  }), [db]);

  async function analyze(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('assistant/analyze', token, {
        prompt,
        projectId: projectId || undefined,
        itemCode: itemCode || undefined
      });
      setResult(response.analysis);
    } catch (err) {
      setError(err.message || 'Analýza selhala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <GeminiChatPanel token={token} />
      <div className="h-6" />
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <QuickStat icon={AlertTriangle} label="Nízký stav" value={quickStats.lowStock} tone="amber" />
        <QuickStat icon={Radar} label="Mimo rádius" value={quickStats.outOfRadius} tone="rose" />
        <QuickStat icon={Sparkles} label="Neuzavřené faktury" value={quickStats.unpaid} tone="blue" />
        <QuickStat icon={Lightbulb} label="Logy s fotkami" value={quickStats.logsWithPhotos} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <form onSubmit={analyze} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-400">AI pomocník</p>
          <h2 className="mt-2 text-2xl font-black text-white">Asistent pro problémy, kolize a návrhy řešení</h2>
          <p className="mt-3 text-sm text-slate-400">Můžeš řešit materiál, kolize lidí mezi projekty, GPS odchylky, rizikové faktury nebo obecné provozní potíže.</p>

          <label className="mt-4 block text-sm font-semibold text-slate-300">
            Zadání
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" placeholder="Popiš problém nebo napiš, co má AI prověřit." />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-300">
              Fokus projekt
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none">
                <option value="">Bez filtru</option>
                {(db.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-300">
              QR / kód materiálu
              <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" placeholder="např. VZT-KOLENO-200" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              'Najdi kolize pracovníků mezi projekty a navrhni řešení.',
              'Prověř materiálové riziko a nízké zásoby.',
              'Zkontroluj GPS odchylky docházky a možné problémy.',
              'Shrň finanční a provozní rizika firmy.'
            ].map((template) => (
              <button key={template} type="button" onClick={() => setPrompt(template)} className="rounded-full border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200">
                {template}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

          <button disabled={loading} className="mt-5 rounded-2xl bg-fuchsia-500 px-5 py-3 font-black text-white disabled:opacity-60">
            <Bot className="mr-2 inline h-4 w-4" />
            {loading ? 'Analyzuji provoz…' : 'Spustit analýzu'}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Výstup asistenta</p>
          <h2 className="mt-2 text-2xl font-black text-white">Doporučení a konflikty</h2>

          {!result ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center text-sm text-slate-400">
              Spusť analýzu a asistent vyhodnotí data z docházky, faktur, skladu, deníku a projektů.
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-fuchsia-100">
                <p className="text-xs font-black uppercase tracking-[0.3em]">Shrnutí</p>
                <p className="mt-2 text-lg font-bold">{result.summary}</p>
                {result.focus?.project || result.focus?.item ? (
                  <p className="mt-2 text-sm text-fuchsia-100/80">
                    {result.focus?.project ? `Projekt: ${result.focus.project.name}` : ''}
                    {result.focus?.project && result.focus?.item ? ' · ' : ''}
                    {result.focus?.item ? `Materiál: ${result.focus.item.name}${result.focus.item.code ? ` (${result.focus.item.code})` : ''}` : ''}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(result.metrics || {}).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">{labelForMetric(key)}</p>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Nálezy</p>
                <div className="mt-3 space-y-3">
                  {(result.findings || []).map((finding) => (
                    <div key={finding.title} className={`rounded-2xl border p-4 ${severityClass(finding.severity)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black">{finding.title}</p>
                        <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">{finding.type}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6">{finding.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Doporučené kroky</p>
                  <ul className="mt-3 space-y-3 text-sm text-slate-300">
                    {(result.recommendations || []).map((item) => <li key={item.id}>• {item.text}</li>)}
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Rychlé akce</p>
                  <ul className="mt-3 space-y-3 text-sm text-slate-300">
                    {(result.quickActions || []).map((item) => <li key={item.id}>• {item.text}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
    </>
  );
}

function QuickStat({ icon: Icon, label, value, tone }) {
  const toneClass = {
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
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

function labelForMetric(key) {
  return {
    lowStockItems: 'Nízký stav',
    outOfRadiusAttendance: 'Mimo rádius',
    unpaidInvoices: 'Faktury otevřené',
    attendanceCollisions: 'Kolize směn',
    logsWithPhotos: 'Logy s fotkami',
    totalItems: 'Položky skladu',
    totalProjects: 'Projekty',
    totalUsers: 'Lidé'
  }[key] || key;
}
