import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Fingerprint, LogIn, Server, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { store } from '../lib/storage.js';
import { bio } from '../lib/biometric.js';

export function LoginScreen({ onLogin }) {
  const [screen, setScreen] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState({ companyName: '', joinId: '', ico: '', dic: '', street: '', city: '', zip: '', phone: '', employmentType: 'INTERNAL' });
  const [wantsJoin, setWantsJoin] = useState(false);
  const [notice, setNotice] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.zoom-pro.app');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => { store.getApiUrl().then(setApiUrl); bio.isAvailable().then(setBioAvailable); }, []);

  const submit = async (creds) => {
    setLoading(true); setError('');
    try {
      await store.setApiUrl(apiUrl);
      const body = creds || { email, password };
      if (authMode === 'register' && !creds) {
        if (!wantsJoin && (!register.companyName.trim() || !register.ico.trim() || !register.street.trim() || !register.city.trim())) {
          throw new Error('Vyplňte název firmy, IČO a adresu.');
        }
        if (wantsJoin && !register.joinId.trim()) throw new Error('Zadejte kód existující firmy.');
        if (password.length < 8) throw new Error('Heslo musí mít alespoň 8 znaků.');
        const result = await api.request('/api/auth/register', {
          method: 'POST', apiUrl,
          body: {
            email, password,
            companyName: wantsJoin ? '' : register.companyName,
            joinId: wantsJoin ? register.joinId : '',
            ico: wantsJoin && register.employmentType === 'INTERNAL' ? '' : register.ico,
            dic: wantsJoin && register.employmentType === 'INTERNAL' ? '' : register.dic,
            street: wantsJoin && register.employmentType === 'INTERNAL' ? '' : register.street,
            city: wantsJoin && register.employmentType === 'INTERNAL' ? '' : register.city,
            zip: wantsJoin && register.employmentType === 'INTERNAL' ? '' : register.zip,
            phone: wantsJoin ? register.phone : '',
            employmentType: wantsJoin ? register.employmentType : 'INTERNAL'
          }
        });
        setNotice(result.msg || 'Registrace byla odeslána.');
        setAuthMode('login');
        return;
      }
      const r = await api.request('/api/auth/login', { method: 'POST', body, apiUrl });
      if (!r.token) throw new Error(r.error || 'Chybný login');
      await store.setToken(r.token);
      await store.setUser(r.user);
      if (!creds) await bio.saveCredentials(email, password).catch(() => {});
      onLogin(r.token, r.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const bioLogin = async () => {
    try {
      const c = await bio.authenticate();
      if (c?.email && c?.password) await submit({ email: c.email, password: c.password });
    } catch (e) { setError(e.message); }
  };

  if (screen === 'welcome') {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-10 bg-[#030712] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(0,111,255,0.24),transparent_58%)]" />
        <section className="relative flex w-full max-w-sm flex-col items-center text-center">
          <img src="/brand/zoom-pro-logo.png" alt="Zoom Pro" className="mb-4 aspect-square w-64 rounded-3xl object-contain" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">Řízení stavebních projektů</p>
          <h1 className="mt-3 text-3xl font-black">Vítejte v Zoom Pro</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Projekty, docházka a komunikace s týmem v jedné aplikaci.</p>
          <div className="mt-7 grid w-full gap-3">
            <button onClick={() => { setAuthMode('login'); setScreen('auth'); }} className="btn-primary w-full"><LogIn size={16} /> Přihlásit se</button>
            <button onClick={() => { setAuthMode('register'); setScreen('auth'); }} className="btn-ghost w-full"><UserPlus size={16} /> Registrace firmy nebo člena</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 via-slate-900 to-brand-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <button onClick={() => setScreen('welcome')} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-400"><ArrowLeft size={14} /> Zpět na úvod</button>
          <img src="/brand/zoom-pro-wordmark.png" alt="Zoom Pro" className="mx-auto mb-2 h-14 w-64 object-contain" />
          <h1 className="text-xl font-black">{authMode === 'register' ? 'Registrace firmy nebo člena' : 'Zoom Pro Montér'}</h1>
          <p className="text-xs text-slate-400 mt-1">{authMode === 'register' ? 'Vytvořte nový účet' : 'Terénní aplikace'}</p>
        </div>

        <div className="card space-y-3">
          {notice && <p className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">{notice}</p>}
          <label className="block">
            <span className="text-xs font-black text-slate-300">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jmeno@firma.cz"
              className="mt-1 w-full rounded-2xl bg-slate-800 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-300">Heslo</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl bg-slate-800 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          {authMode === 'register' && <div className="space-y-3 border-t border-white/10 pt-3">
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={wantsJoin} onChange={(event) => setWantsJoin(event.target.checked)} /> Připojit se k existující firmě</label>
            {wantsJoin ? <>
              <input value={register.joinId} onChange={(event) => setRegister({ ...register, joinId: event.target.value })} required placeholder="Kód firmy / companyId" className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white" />
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={register.employmentType === 'EXTERNAL'} onChange={(event) => setRegister({ ...register, employmentType: event.target.checked ? 'EXTERNAL' : 'INTERNAL' })} /> Jsem externí spolupracovník</label>
              {register.employmentType === 'EXTERNAL' && <RegistrationBusinessFields register={register} setRegister={setRegister} />}
              <input type="tel" value={register.phone} onChange={(event) => setRegister({ ...register, phone: event.target.value })} placeholder="Telefon (volitelné)" className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white" />
            </> : <>
              <input value={register.companyName} onChange={(event) => setRegister({ ...register, companyName: event.target.value })} required placeholder="Název firmy" className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white" />
              <RegistrationBusinessFields register={register} setRegister={setRegister} required />
            </>}
          </div>}
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer flex items-center gap-2"><Server size={12} /> Server URL</summary>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-slate-800 px-3 py-2 text-white" />
          </details>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button onClick={() => submit()} disabled={loading || !email || !password}
            className="btn-primary w-full disabled:opacity-50">
            {authMode === 'register' ? <Building2 size={16} /> : <LogIn size={16} />} {loading ? 'Probíhá…' : authMode === 'register' ? 'Registrovat' : 'Přihlásit'}
          </button>

          {authMode === 'login' && bioAvailable && (
            <button onClick={bioLogin} className="btn-ghost w-full">
              <Fingerprint size={16} /> Přihlásit biometrií
            </button>
          )}
        </div>
        <button onClick={() => { setNotice(''); setAuthMode((mode) => mode === 'login' ? 'register' : 'login'); }} className="mt-4 w-full text-center text-xs font-bold text-slate-400">
          {authMode === 'register' ? 'Už mám účet — přihlásit' : 'Nemám účet — registrace'}
        </button>

        <p className="mt-6 text-center text-[10px] text-slate-500">offline-first · GDPR · geofence · AI</p>
      </div>
    </div>
  );
}

function RegistrationBusinessFields({ register, setRegister, required = false }) {
  const input = 'w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white';
  const update = (key) => (event) => setRegister({ ...register, [key]: event.target.value });
  return <div className="space-y-2 rounded-2xl border border-white/10 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{required ? 'Údaje firmy' : 'Údaje externího člena (volitelné)'}</p>
    <input value={register.ico} onChange={update('ico')} required={required} placeholder="IČO" className={input} />
    <input value={register.dic} onChange={update('dic')} placeholder="DIČ (volitelné)" className={input} />
    <input value={register.street} onChange={update('street')} required={required} placeholder="Ulice a číslo" className={input} />
    <input value={register.city} onChange={update('city')} required={required} placeholder="Město" className={input} />
    <input value={register.zip} onChange={update('zip')} placeholder="PSČ" className={input} />
  </div>;
}
