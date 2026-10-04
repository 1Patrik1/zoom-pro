import { useEffect, useState } from 'react';
import { KeyRound, User as UserIcon, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api/client.js';

export function SettingsPage({ user, db, token, onSavePricing, onProfileSaved }) {
  const canEdit = ['SUPERADMIN', 'REDITEL'].includes(user.role);
  const [profile, setProfile] = useState({ firstName: user.firstName || '', lastName: user.lastName || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.post('users/profile', token, profile);
      setMsg('Profil uložen (jméno a příjmení).');
      onProfileSaved?.(profile);
    } catch (error) {
      setErr(error.message || 'Uložení profilu selhalo.');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (pw.newPassword !== pw.confirm) { setErr('Nová hesla se neshodují.'); return; }
    try {
      await api.post('users/password', token, { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setMsg('Heslo bylo změněno.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (error) {
      setErr(error.message || 'Změna hesla selhala.');
    }
  }

  const input = 'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none';

  return (
    <div className="space-y-4">
      <form onSubmit={saveProfile} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-blue-400 flex items-center gap-2"><UserIcon size={18} /> Můj profil</h2>
        <p className="text-xs text-slate-400">E-mail: {user.email} · Role: {user.role}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Jméno</label>
            <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} placeholder="Jméno" className={input} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Příjmení</label>
            <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} placeholder="Příjmení" className={input} />
          </div>
        </div>
        <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Uložit profil</button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-rose-400 flex items-center gap-2"><KeyRound size={18} /> Změna hesla</h2>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Aktuální heslo</label>
          <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required className={input} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Nové heslo (min. 8 znaků)</label>
            <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} className={input} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Nové heslo znovu</label>
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} className={input} />
          </div>
        </div>
        <button className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black uppercase text-white">Změnit heslo</button>
      </form>

      <form onSubmit={(e) => {
        e.preventDefault();
        onSavePricing({ cost: e.target.cost.value, sell: e.target.sell.value });
      }} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-amber-400">Ceník (€/m²)</h2>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Výrobní cena</label>
          <input name="cost" type="number" step="0.01" defaultValue={db.company?.costPerSqMeter || 0} className={input} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Prodejní cena</label>
          <input name="sell" type="number" step="0.01" defaultValue={db.company?.sellPerSqMeter || 0} className={input} />
        </div>
        {canEdit ? (
          <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Uložit ceník</button>
        ) : (
          <p className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm font-bold text-rose-300">Měnit ceník může pouze SUPERADMIN nebo ŘEDITEL.</p>
        )}
      </form>

      {canEdit && <ModuleSettingsEditor token={token} onSaved={(m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); }} onError={(e) => setErr(e)} />}

      {msg && <p className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm font-bold text-emerald-300">{msg}</p>}
      {err && <p className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm font-bold text-rose-300">{err}</p>}
    </div>
  );
}

// Editor per-modul nastavení (ModuleSettings) — načte seznam uložených konfigurací,
// umožní je upravit jako JSON a uložit (PUT /api/settings/modules/:moduleKey).
function ModuleSettingsEditor({ token, onSaved, onError }) {
  const KNOWN = ['system', 'import', 'export', 'workflow', 'signatures', 'distribution', 'licensing'];
  const [moduleKey, setModuleKey] = useState('system');
  const [json, setJson] = useState('{}');
  const [loaded, setLoaded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [parseErr, setParseErr] = useState(null);

  useEffect(() => { load(); }, [moduleKey]);

  const load = async () => {
    try {
      const r = await api.get(`settings/modules/${moduleKey}`, token);
      const settings = r?.settings ?? r?.moduleSettings ?? r ?? null;
      const body = settings?.settingsJson ?? settings;
      setLoaded(body || null);
      setJson(body ? JSON.stringify(body, null, 2) : '{}');
      setParseErr(null);
    } catch (e) { onError?.(e.message || 'Načtení nastavení modulu selhalo.'); }
  };

  const save = async () => {
    try {
      const parsed = JSON.parse(json);
      setBusy(true);
      await api.put(`settings/modules/${moduleKey}`, token, parsed);
      onSaved?.(`Nastavení modulu „${moduleKey}" uloženo.`);
      await load();
    } catch (e) {
      setParseErr(e instanceof SyntaxError ? 'Neplatný JSON: ' + e.message : null);
      onError?.(e instanceof SyntaxError ? '' : (e.message || 'Uložení selhalo.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="flex items-center gap-2 text-lg font-black text-cyan-400"><SlidersHorizontal size={18} /> Nastavení modulů</h2>
      <p className="text-xs text-slate-400">Per-modul konfigurace (system, import, export, workflow…). Uložené hodnoty mají prioritu před výchozími.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
          {KNOWN.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        {loaded && <span className="rounded-lg bg-cyan-950/60 px-2 py-1 text-[11px] font-black text-cyan-300">uloženo, v.{loaded.version ?? '?'}</span>}
      </div>
      <textarea
        value={json}
        onChange={(e) => { setJson(e.target.value); setParseErr(null); }}
        rows={12}
        spellCheck={false}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-200 outline-none"
      />
      {parseErr && <p className="text-xs font-black text-rose-400">{parseErr}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-black uppercase text-white disabled:opacity-50">{busy ? 'Ukládám…' : 'Uložit nastavení'}</button>
        <button onClick={load} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300">Znovu načíst</button>
      </div>
    </div>
  );
}
