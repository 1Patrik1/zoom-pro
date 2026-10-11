import { useEffect, useState } from 'react';
import { Building2, CreditCard, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { ALL_LICENSE_MODULES } from './LicensingPage.jsx';

export function PlatformAdminPage({ token, user }) {
  const [settings, setSettings] = useState([]);
  const [gemini, setGemini] = useState('');
  const [branding, setBranding] = useState({ name: 'Zoom Pro', primaryColor: '#2563eb', logoUrl: '' });
  const [support, setSupport] = useState({ email: 'support@zoom-pro.app', phone: '' });
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;
    api.request('/api/licensing/platform-settings', { token }).then((r) => {
      setSettings(r.settings || []);
      const g = r.settings?.find((s) => s.key === 'geminiApiKey');
      if (g) setGemini(g.value?.value || '');
      const b = r.settings?.find((s) => s.key === 'branding');
      if (b) setBranding({ ...branding, ...b.value });
      const s = r.settings?.find((s) => s.key === 'supportContact');
      if (s) setSupport({ ...support, ...s.value });
    }).catch((e) => setError(e.message));
  }, [token, user]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;
    api.request('/api/saas/companies', { token }).then((r) => setCompanies(r.rows || [])).catch(() => {});
  }, [token, user]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;
    api.request('/api/licensing/plans', { token }).then((r) => setPlans(r.plans || [])).catch((e) => setError(e.message));
  }, [token, user]);

  const reloadCompanies = async () => {
    const r = await api.request('/api/saas/companies', { token });
    setCompanies(r.rows || []);
  };

  const setCompanyActive = async (companyId, active) => {
    setBusyId(companyId);
    setError(null);
    try {
      await api.request('/api/saas/companies/approve', { method: 'POST', token, body: { companyId, active } });
      const r = await api.request('/api/saas/companies', { token });
      setCompanies(r.rows || []);
      setSavedMsg(active ? 'Firma schválena (licence aktivní).' : 'Firma deaktivována.');
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const save = async (key, value) => {
    try {
      await api.request('/api/licensing/platform-settings', { method: 'POST', token, body: { key, value } });
      setSavedMsg(`Uloženo: ${key}`);
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (e) { setError(e.message); }
  };

  if (user?.role !== 'SUPERADMIN') {
    return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Pouze SUPERADMIN má přístup ke konzoli platformy.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-purple-700 to-fuchsia-700 p-6 text-white shadow">
        <h2 className="text-2xl font-black">Platforma Zoom Pro — konzole SUPERADMIN</h2>
        <p className="mt-1 text-sm opacity-90">Detailní nastavení každé věci pro správu, konfiguraci licencí a platformy.</p>
      </header>

      {savedMsg && <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{savedMsg}</div>}
      {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Gemini AI klíč</h3>
        <p className="text-xs text-slate-500">Používá se pro AI asistenta, troubleshooting a chat s fotkou.</p>
        <div className="mt-3 flex gap-2">
          <input type="password" placeholder="AI Studio API key" value={gemini} onChange={(e) => setGemini(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2" />
          <button onClick={() => save('geminiApiKey', { value: gemini })}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Uložit klíč</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Branding</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input placeholder="Název" value={branding.name} onChange={(e) => setBranding({ ...branding, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2" />
          <input type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
            className="h-10 w-full rounded-xl border border-slate-300" />
          <input placeholder="Logo URL" value={branding.logoUrl || ''} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => save('branding', branding)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Uložit branding</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Podpora</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input placeholder="Support e-mail" value={support.email} onChange={(e) => setSupport({ ...support, email: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2" />
          <input placeholder="Telefon" value={support.phone} onChange={(e) => setSupport({ ...support, phone: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => save('supportContact', support)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Uložit</button>
        </div>
      </section>

      <PaymentGatewayPanel token={token} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Ostatní klíče (RAW)</h3>
        <div className="mt-3 space-y-2">
          {settings?.map((s) => (
            <details key={s.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <summary className="cursor-pointer font-black">{s.key}</summary>
              <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(s.value, null, 2)}</pre>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Building2 size={18} /> Firemní účty a schvalování</h3>
        <p className="text-xs text-slate-500">Schvalujte nebo deaktivujte firmy. Neaktivní firma se nemůže přihlásit („Firma nemá licenci“).</p>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="p-2">Firma</th><th>Vlastník</th><th>Balíček</th><th>Členové</th><th>Platnost / cena</th><th>Stav</th><th></th></tr>
          </thead>
          <tbody>
            {companies?.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-2 font-black">{c.name}<div className="mt-1 text-[10px] font-normal text-slate-500">IČO {c.ico || '—'} · DIČ {c.dic || '—'}</div><div className="text-[10px] font-normal text-slate-500">{[c.street, c.city, c.zip, c.country].filter(Boolean).join(', ') || 'Adresa neuvedena'}</div></td>
                <td className="text-xs">{c.ownerEmail || '—'}</td>
                <td>
                  <div className="text-xs font-black text-slate-800">{c.licensePlanName || c.licensePlanCode || 'Bez licence'}</div>
                  {c.licensePlanCode && <div className="text-[10px] uppercase text-slate-500">{c.licensePlanCode} · {c.licenseBillingPeriod || '—'} měs.</div>}
                </td>
                <td><b>{c.userCount ?? 0}</b><div className="text-[10px] text-slate-500">{c.activeUserCount ?? 0} schválených · limit {c.licenseMaxUsers ?? '—'}</div></td>
                <td className="text-xs">
                  {c.licenseId ? <><div>{c.licenseValidFrom ? new Date(c.licenseValidFrom).toLocaleString('cs-CZ') : '—'} – {c.licenseValidTo ? new Date(c.licenseValidTo).toLocaleString('cs-CZ') : 'bez konce'}</div><div className="mt-1 text-[10px] text-slate-500">{c.licenseStatus || '—'} · {Number(c.licensePriceMonthly || 0).toLocaleString('cs-CZ')} {c.licenseCurrency || 'CZK'} / měsíc · celkem {Number(c.licensePriceTotal || 0).toLocaleString('cs-CZ')} {c.licenseCurrency || 'CZK'}</div><div className="mt-1 max-w-60 text-[10px] text-slate-500">Moduly: {(c.licenseModules || []).join(', ') || '—'}</div></> : 'Licence nepřidělena'}
                </td>
                <td>
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.isActive ? 'AKTIVNÍ' : 'ČEKÁ / VYPNUTO'}
                  </span>
                </td>
                <td className="text-right">
                  <LicenseEditor company={c} plans={plans} token={token} onSaved={reloadCompanies} />
                  <button type="button" onClick={async () => {
                    if (confirm(`Opravdu nenávratně smazat firmu "${c.name}" a veškerá její data (projekty, uživatele, deníky)? Tato akce je NEVRATNÁ!`)) {
                      try {
                        const { api } = await import('../../api/client.js');
                        // Zavoláme smazání přes API (fallback pro obě používané routy backendu)
                        await api.delete('/saas/tenants/' + c.id).catch(() => api.delete('/saas/companies/' + c.id));
                        // Odstraníme firmu z tabulky
                        setCompanies(prev => prev.filter(x => x.id !== c.id));
                      } catch(e) {
                        alert('Chyba při mazání firmy. Zkontrolujte, zda na ni nejsou navázány kritické záznamy nebo se podívejte do konzole.');
                        console.error(e);
                      }
                    }
                  }} className="mr-2 inline-flex items-center rounded-xl border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600 hover:bg-red-100 transition-colors">
                    SMAZAT
                  </button>
                  
                  {c.isActive ? (
                    <button onClick={() => setCompanyActive(c.id, false)} disabled={busyId === c.id}
                      className="rounded-xl bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 disabled:opacity-50">Deaktivovat</button>
                  ) : (
                    <button onClick={() => setCompanyActive(c.id, true)} disabled={busyId === c.id}
                      className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white disabled:opacity-50">Schválit</button>
                  )}
                </td>
              </tr>
            ))}
            {!companies.length && <tr><td colSpan={7} className="p-4 text-center text-slate-400">Žádné firmy.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PaymentGatewayPanel({ token }) {
  const [draft, setDraft] = useState({ provider: 'UNSELECTED', environment: 'TEST', currency: 'CZK' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.request('/api/licensing/platform-settings', { token })
      .then((result) => {
        const saved = result.settings?.find((setting) => setting.key === 'paymentGateway')?.value;
        if (saved) setDraft((current) => ({ ...current, ...saved }));
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const saveGatewaySetup = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await api.request('/api/licensing/platform-settings', {
        method: 'POST', token, body: { key: 'paymentGateway', value: draft }
      });
      setMessage('Předvolby platební brány byly uloženy. Platby zatím nejsou aktivní.');
    } catch (err) { setError(err.message || 'Uložení nastavení se nezdařilo.'); }
    finally { setBusy(false); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
  return (
    <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><CreditCard size={19} /> Platební brána</h3>
      <p className="mt-1 text-sm text-slate-600">Předvolby pro budoucí online platby licencí Zoom Pro. Dokud nebude doplněna integrace poskytovatele a jeho ověření webhooků, tato nastavení platby nespouštějí ani neúčtují.</p>
      <form onSubmit={saveGatewaySetup} className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-xs font-black text-slate-600">Poskytovatel
          <select value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="UNSELECTED">Zatím nevybrán</option><option value="GOPAY">GoPay</option><option value="COMGATE">Comgate</option><option value="STRIPE">Stripe</option><option value="OTHER">Jiný poskytovatel</option>
          </select>
        </label>
        <label className="text-xs font-black text-slate-600">Prostředí
          <select value={draft.environment} onChange={(event) => setDraft({ ...draft, environment: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="TEST">Testovací</option><option value="LIVE">Produkční</option>
          </select>
        </label>
        <label className="text-xs font-black text-slate-600">Měna
          <select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="CZK">CZK – koruna česká</option><option value="EUR">EUR – euro</option>
          </select>
        </label>
        <button disabled={busy} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? 'Ukládám…' : 'Uložit předvolby'}</button>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ['Předvolby', 'Uložení poskytovatele, prostředí a měny'],
          ['Připojení', 'Doplnit API přístup a testovací transakce'],
          ['Zúčtování', 'Napojit checkout, webhook a stav licence']
        ].map(([title, detail], index) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-xs font-black text-slate-800">{index === 0 ? <ShieldCheck size={14} className="text-emerald-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-400" />}{title}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">API klíče a podpisové tajné údaje se do této databázové konfigurace neukládají. Způsob jejich bezpečného uložení a konkrétní platební tok doplníme podle zvoleného poskytovatele.</p>
      {message && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
    </section>
  );
}

function LicenseEditor({ company, plans, token, onSaved }) {
  const currentPlan = plans.find((plan) => plan.code === company.licensePlanCode) || plans[0];
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const plan = plans.find((item) => item.code === company.licensePlanCode) || plans[0];
    const modules = Array.isArray(company.licenseModules) ? company.licenseModules : [];
    setDraft({
      planCode: plan?.code || '',
      users: company.licenseMaxUsers || company.userCount || 1,
      period: company.licenseBillingPeriod || 1,
      modules: modules.filter((module) => !(plan?.includedModules || []).includes(module)),
      validFrom: company.licenseValidFrom ? new Date(company.licenseValidFrom).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    });
  }, [company, plans]);

  const save = async (event) => {
    event.preventDefault();
    if (!draft?.planCode) return;
    setBusy(true); setError('');
    try {
      await api.request('/api/licensing/assign', { method: 'POST', token, body: { companyId: company.id, ...draft, validFrom: new Date(draft.validFrom).toISOString() } });
      await onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (!plans.length || !draft) return <span className="text-xs text-slate-400">Načítám tarify…</span>;
  const selected = plans.find((item) => item.code === draft.planCode) || currentPlan;

  return (
    <details className="mb-2 text-left">
      <summary className="cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-800">Přidělit / upravit licenci</summary>
      <form onSubmit={save} className="mt-2 min-w-72 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <select value={draft.planCode} onChange={(event) => {
          const plan = plans.find((item) => item.code === event.target.value);
          setDraft({ ...draft, planCode: event.target.value, modules: [] });
        }} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs">
          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({plan.code})</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[10px]">Členů<input type="number" min="1" max={selected?.maxUsers || 10000} value={draft.users} onChange={(event) => setDraft({ ...draft, users: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs" /></label>
          <label className="text-[10px]">Od<input type="datetime-local" value={draft.validFrom} onChange={(event) => setDraft({ ...draft, validFrom: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-1 py-2 text-xs" /></label>
          <label className="text-[10px]">Měsíců<select value={draft.period} onChange={(event) => setDraft({ ...draft, period: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-1 py-2 text-xs">{[1, 3, 6, 12].map((period) => <option key={period} value={period}>{period}</option>)}</select></label>
        </div>
        <p className="text-[10px] font-bold text-slate-600">Příplatkové moduly</p>
        <div className="grid grid-cols-2 gap-1">
          {ALL_LICENSE_MODULES.filter((module) => selected?.moduleAddons?.[module] != null && !(selected?.includedModules || []).includes(module)).map((module) => (
            <label key={module} className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={draft.modules.includes(module)} onChange={(event) => setDraft({ ...draft, modules: event.target.checked ? [...draft.modules, module] : draft.modules.filter((item) => item !== module) })} />{module}</label>
          ))}
        </div>
        {error && <p className="text-[10px] text-rose-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Ukládám…' : 'Uložit a aktivovat'}</button>
      </form>
    </details>
  );
}
