import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';

const ALL_MODULES = [
  'projects', 'attendance', 'dailyLog', 'vzt', 'team', 'reports',
  'invoices', 'inventory', 'exports', 'imports', 'documents', 'print',
  'collisions', 'signatures', 'assistant', 'troubleshooting',
];

export function LicensingPage({ token, user }) {
  const [plans, setPlans] = useState([]);
  const [state, setState] = useState({ planCode: '', users: 10, modules: [], period: 1 });
  const [quote, setQuote] = useState(null);
  const [my, setMy] = useState({ license: null, activeUsers: 0 });
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const [p, m] = await Promise.all([
        api.request('/api/licensing/plans', { token }),
        api.request('/api/licensing/mine', { token }),
      ]);
      setPlans(p.plans || []);
      setMy({ license: m.license, activeUsers: m.activeUsers });
      if (!state.planCode && p.plans?.[0]) {
        const plan = p.plans[0];
        setState({ planCode: plan.code, users: Math.min(plan.maxUsers || 10, 10), modules: plan.includedModules || [], period: 1 });
      }
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const selectedPlan = useMemo(() => plans.find((p) => p.code === state.planCode), [plans, state.planCode]);

  useEffect(() => {
    if (!state.planCode) return;
    api.request('/api/licensing/quote', {
      method: 'POST', token,
      body: { planCode: state.planCode, users: state.users, modules: state.modules, period: state.period },
    }).then((r) => setQuote(r.pricing)).catch((e) => setError(e.message));
  }, [state, token]);

  const subscribe = async () => {
    try {
      const r = await api.request('/api/licensing/subscribe', {
        method: 'POST', token,
        body: { planCode: state.planCode, users: state.users, modules: state.modules, period: state.period },
      });
      setMy({ ...my, license: r.license });
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow">
        <h2 className="text-2xl font-black">Licence firmy</h2>
        <p className="mt-1 text-sm opacity-90">Vyber tarif, počet lidí, moduly a období. Vše se spočítá okamžitě.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Info label="Aktivní uživatelé" value={my.activeUsers} />
          <Info label="Aktuální plán" value={my.license?.planCode || '—'} />
          <Info label="Platí do" value={my.license?.validTo ? new Date(my.license.validTo).toLocaleDateString('cs-CZ') : '—'} />
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        {plans?.map((p) => (
          <button key={p.code} type="button" onClick={() => setState({ ...state, planCode: p.code, modules: p.includedModules || [] })}
            className={`rounded-3xl border p-4 text-left transition ${state.planCode === p.code ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-xs font-black uppercase text-slate-500">{p.code}</p>
            <p className="mt-1 text-lg font-black text-slate-900">{p.name}</p>
            <p className="mt-1 text-xs text-slate-600">{p.description}</p>
            <p className="mt-3 text-sm text-slate-700">od <b>{Number(p.basePricePerUserMonth).toLocaleString('cs-CZ')} Kč</b>/uživ./měs.</p>
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Nastav balíček</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="font-black text-slate-700">Počet uživatelů</span>
            <input type="number" min={1} max={selectedPlan?.maxUsers || 500} value={state.users}
              onChange={(e) => setState({ ...state, users: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            {selectedPlan?.maxUsers && <span className="text-xs text-slate-500">max {selectedPlan.maxUsers}</span>}
          </label>
          <label className="text-sm">
            <span className="font-black text-slate-700">Období</span>
            <select value={state.period} onChange={(e) => setState({ ...state, period: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value={1}>Měsíční</option>
              <option value={3}>3 měsíční (-5%)</option>
              <option value={6}>6 měsíční (-10%)</option>
              <option value={12}>Roční (-20%)</option>
            </select>
          </label>
          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <p className="text-xs font-black uppercase text-slate-500">Cena</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{quote?.monthlyDiscounted?.toLocaleString('cs-CZ') || 0} Kč <span className="text-sm text-slate-500">/ měs.</span></p>
            <p className="text-xs text-slate-500">Celkem za období: <b>{quote?.total?.toLocaleString('cs-CZ') || 0} Kč</b></p>
          </div>
        </div>

        <p className="mt-5 text-sm font-black text-slate-800">Moduly</p>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          {ALL_MODULES.map((m) => {
            const included = (selectedPlan?.includedModules || []).includes(m);
            const active = state.modules.includes(m);
            const addonPrice = selectedPlan?.moduleAddons?.[m];
            return (
              <label key={m} className={`flex items-center gap-2 rounded-2xl border p-2 text-sm ${active ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <input type="checkbox" checked={active} disabled={included}
                  onChange={(e) => {
                    setState((s) => ({ ...s, modules: e.target.checked ? [...s.modules, m] : s.modules.filter((x) => x !== m) }));
                  }} />
                <span className="flex-1">{m}</span>
                {included ? <span className="text-xs font-black text-emerald-600">v tarifu</span>
                  : addonPrice != null ? <span className="text-xs text-slate-500">+{addonPrice} Kč</span> : null}
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={subscribe} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow hover:bg-blue-700">
            Aktivovat balíček
          </button>
        </div>
      </section>

      {user?.role === 'SUPERADMIN' && <SuperAdminPlanEditor token={token} plans={plans} onReload={load} />}
    </div>
  );
}

function SuperAdminPlanEditor({ token, plans, onReload }) {
  const [draft, setDraft] = useState({
    code: '', name: '', description: '', basePricePerUserMonth: 200, flatPricePerMonth: 0,
    maxUsers: 100, includedModules: [], moduleAddons: {}, periodDiscounts: { 1: 0, 3: 0.05, 6: 0.10, 12: 0.20 },
    isPublic: true, sortOrder: 50,
  });

  const save = async () => {
    await api.request('/api/licensing/plans', { method: 'POST', token, body: draft });
    setDraft({ ...draft, code: '', name: '' });
    onReload();
  };

  return (
    <section className="rounded-3xl border-2 border-purple-300 bg-purple-50 p-6">
      <h3 className="text-lg font-black text-purple-900">SUPERADMIN — Správa tarifů</h3>
      <p className="text-xs text-purple-800">Vytvořit / upravit / smazat tarif. Změny se projeví ihned všem tenantům.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input placeholder="code (např. START)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
          className="rounded-xl border border-purple-300 px-3 py-2" />
        <input placeholder="Název" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="rounded-xl border border-purple-300 px-3 py-2" />
        <input type="number" placeholder="Cena/uživatel/měs." value={draft.basePricePerUserMonth} onChange={(e) => setDraft({ ...draft, basePricePerUserMonth: Number(e.target.value) })}
          className="rounded-xl border border-purple-300 px-3 py-2" />
        <input type="number" placeholder="Paušál/měs." value={draft.flatPricePerMonth} onChange={(e) => setDraft({ ...draft, flatPricePerMonth: Number(e.target.value) })}
          className="rounded-xl border border-purple-300 px-3 py-2" />
        <input type="number" placeholder="Max uživatelů" value={draft.maxUsers ?? ''} onChange={(e) => setDraft({ ...draft, maxUsers: e.target.value ? Number(e.target.value) : null })}
          className="rounded-xl border border-purple-300 px-3 py-2" />
        <input placeholder="Popis" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="rounded-xl border border-purple-300 px-3 py-2 md:col-span-2" />
        <button onClick={save} className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-black text-white">Uložit tarif</button>
      </div>

      <div className="mt-5">
        <p className="text-xs font-black uppercase text-purple-700">Zapnuté moduly v tarifu:</p>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          {ALL_MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 rounded-xl border border-purple-200 bg-white p-2 text-sm">
              <input type="checkbox" checked={draft.includedModules.includes(m)}
                onChange={(e) => setDraft({ ...draft, includedModules: e.target.checked ? [...draft.includedModules, m] : draft.includedModules.filter((x) => x !== m) })} />
              <span className="flex-1">{m}</span>
              <input type="number" placeholder="+Kč" value={draft.moduleAddons[m] ?? ''} onChange={(e) => setDraft({ ...draft, moduleAddons: { ...draft.moduleAddons, [m]: e.target.value ? Number(e.target.value) : undefined } })}
                className="w-20 rounded-lg border border-purple-200 px-2 py-1 text-xs" />
            </label>
          ))}
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-purple-300 text-left"><th>Code</th><th>Název</th><th>Kč/uživ.</th><th>Paušál</th><th>Max</th></tr>
        </thead>
        <tbody>
          {plans?.map((p) => (
            <tr key={p.code} className="border-b border-purple-100">
              <td className="py-2 font-black">{p.code}</td>
              <td>{p.name}</td>
              <td>{p.basePricePerUserMonth}</td>
              <td>{p.flatPricePerMonth}</td>
              <td>{p.maxUsers ?? '∞'}</td>
              <td className="text-right">
                <button type="button" onClick={async () => {
                  if (confirm(`Opravdu smazat balíček ${p.name}?`)) {
                    try {
                      const { api } = await import('../../api/client.js');
                      await api.delete('/saas/plans/' + p.code);
                      setPlans(prev => prev.filter(x => x.code !== p.code));
                    } catch(e) {
                      alert('Balíček nelze smazat. Pravděpodobně jej využívají aktivní klienti.');
                    }
                  }
                }} className="rounded-xl border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600 hover:bg-red-100">
                  SMAZAT
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
