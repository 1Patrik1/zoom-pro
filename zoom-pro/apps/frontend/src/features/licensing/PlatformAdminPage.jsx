import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { api } from '../../api/client.js';

export function PlatformAdminPage({ token, user }) {
  const [settings, setSettings] = useState([]);
  const [gemini, setGemini] = useState('');
  const [branding, setBranding] = useState({ name: 'Zoom Pro', primaryColor: '#2563eb', logoUrl: '' });
  const [support, setSupport] = useState({ email: 'support@zoom-pro.app', phone: '' });
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Ostatní klíče (RAW)</h3>
        <div className="mt-3 space-y-2">
          {settings.map((s) => (
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
            <tr><th className="p-2">Firma</th><th>Vlastník</th><th>Uživatelů</th><th>Stav</th><th></th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-2 font-black">{c.name}</td>
                <td className="text-xs">{c.ownerEmail || '—'}</td>
                <td>{c.userCount ?? 0}</td>
                <td>
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.isActive ? 'AKTIVNÍ' : 'ČEKÁ / VYPNUTO'}
                  </span>
                </td>
                <td className="text-right">
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
            {!companies.length && <tr><td colSpan={5} className="p-4 text-center text-slate-400">Žádné firmy.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
