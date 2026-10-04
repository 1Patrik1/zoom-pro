import { useEffect, useState } from 'react';
import { LogIn, Server, Fingerprint } from 'lucide-react';
import { api } from '../lib/api.js';
import { store } from '../lib/storage.js';
import { bio } from '../lib/biometric.js';

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 via-slate-900 to-brand-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-brand-600 shadow-2xl">
            <HardHatIcon />
          </div>
          <h1 className="text-2xl font-black">Zoom Pro Montér</h1>
          <p className="text-xs text-slate-400 mt-1">Terénní aplikace · v1.1</p>
        </div>

        <div className="card space-y-3">
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
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer flex items-center gap-2"><Server size={12} /> Server URL</summary>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-slate-800 px-3 py-2 text-white" />
          </details>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button onClick={() => submit()} disabled={loading || !email || !password}
            className="btn-primary w-full disabled:opacity-50">
            <LogIn size={16} /> {loading ? 'Přihlašuji…' : 'Přihlásit'}
          </button>

          {bioAvailable && (
            <button onClick={bioLogin} className="btn-ghost w-full">
              <Fingerprint size={16} /> Přihlásit biometrií
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-500">offline-first · GDPR · geofence · AI</p>
      </div>
    </div>
  );
}

function HardHatIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18h20"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 8V5a2 2 0 0 1 4 0v3"/>
    </svg>
  );
}
