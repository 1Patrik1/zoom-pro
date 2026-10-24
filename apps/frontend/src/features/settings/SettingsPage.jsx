import { useEffect, useState } from 'react';
import { BellRing, KeyRound, User as UserIcon, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api/client.js';
import { playCriticalAlarm } from '../../utils/alerts.js';

export function SettingsPage({ user, db, token, onSavePricing, onProfileSaved, onCompanySaved }) {
  const canEdit = ['SUPERADMIN', 'REDITEL'].includes(user.role);
  const canEditCompanyContacts = ['SUPERADMIN', 'REDITEL', 'ADMINISTRACE'].includes(user.role);
  const [profile, setProfile] = useState({
    email: user.email || '', phone: user.phone || '',
    firstName: user.firstName || '', lastName: user.lastName || '',
    employmentType: user.employmentType || 'INTERNAL',
    ico: user.ico || '', dic: user.dic || '', street: user.street || '', city: user.city || '', zip: user.zip || ''
  });
  const [companyProfile, setCompanyProfile] = useState(() => ({
    name: db.company?.name || '', ico: db.company?.ico || '', dic: db.company?.dic || '',
    street: db.company?.street || '', city: db.company?.city || '', zip: db.company?.zip || '',
    country: db.company?.country || 'CZ', email: db.company?.email || '', phone: db.company?.phone || ''
  }));
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [alarmMelody, setAlarmMelody] = useState(() => localStorage.getItem('zp_alarm_melody') || 'siren');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setCompanyProfile({
      name: db.company?.name || '', ico: db.company?.ico || '', dic: db.company?.dic || '',
      street: db.company?.street || '', city: db.company?.city || '', zip: db.company?.zip || '',
      country: db.company?.country || 'CZ', email: db.company?.email || '', phone: db.company?.phone || ''
    });
  }, [db.company?.name, db.company?.ico, db.company?.dic, db.company?.street, db.company?.city, db.company?.zip, db.company?.country, db.company?.email, db.company?.phone]);

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const response = await api.post('users/profile', token, profile);
      const savedProfile = response.user || profile;
      setProfile((current) => ({ ...current, ...savedProfile }));
      setMsg('Osobní kontaktní údaje byly uloženy.');
      await onProfileSaved?.(savedProfile);
    } catch (error) {
      setErr(error.message || 'Uložení profilu selhalo.');
    }
  }

  async function saveCompanyProfile(event) {
    event.preventDefault();
    setMsg(''); setErr('');
    try {
      const response = await api.put('settings/company/profile', token, companyProfile);
      setCompanyProfile((current) => ({ ...current, ...(response.company || {}) }));
      await onCompanySaved?.(response.company);
      setMsg('Údaje firmy byly uloženy.');
    } catch (error) { setErr(error.message || 'Uložení údajů firmy selhalo.'); }
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

  async function enableWebPush() {
    setMsg(''); setErr(''); setPushBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('Tento prohlížeč nepodporuje push oznámení.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Povolte oznámení v nastavení telefonu nebo prohlížeče.');
      const { publicKey } = await api.get('devices/public-key');
      if (!publicKey) throw new Error('Server nemá nakonfigurované web push klíče.');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey)
      });
      await api.post('devices/register', token, { platform: 'web', pushSubscription: subscription.toJSON() });
      setMsg('Push oznámení jsou zapnutá. Zvuk určuje nastavení oznámení v telefonu nebo prohlížeči.');
    } catch (error) {
      setErr(error.message || 'Push oznámení se nepodařilo zapnout.');
    } finally { setPushBusy(false); }
  }

  const input = 'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none';

  return (
    <div className="space-y-4">
      <form onSubmit={saveProfile} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-blue-400 flex items-center gap-2"><UserIcon size={18} /> Můj profil</h2>
        <p className="text-xs text-slate-400">Role: {user.role}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Přihlašovací e-mail</label>
            <input type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="E-mail" className={input} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Telefon</label>
            <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Telefonní číslo" className={input} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Jméno</label>
            <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} placeholder="Jméno" className={input} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Příjmení</label>
            <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} placeholder="Příjmení" className={input} />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Typ člena</label>
          <select value={profile.employmentType} onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })} className={input}>
            <option value="INTERNAL">Interní člen</option>
            <option value="EXTERNAL">Externí spolupracovník</option>
          </select>
        </div>
        {profile.employmentType === 'EXTERNAL' && <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-2">
          <p className="text-xs text-slate-400 md:col-span-2">Podnikatelské a adresní údaje externího člena (nepovinné).</p>
          <input value={profile.ico} onChange={(e) => setProfile({ ...profile, ico: e.target.value })} placeholder="IČO" className={input} />
          <input value={profile.dic} onChange={(e) => setProfile({ ...profile, dic: e.target.value })} placeholder="DIČ" className={input} />
          <input value={profile.street} onChange={(e) => setProfile({ ...profile, street: e.target.value })} placeholder="Ulice a číslo" className={input} />
          <input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Město" className={input} />
          <input value={profile.zip} onChange={(e) => setProfile({ ...profile, zip: e.target.value })} placeholder="PSČ" className={input} />
        </div>}
        <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Uložit profil</button>
      </form>

      <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-amber-400">Upozornění a zvuk alarmu</h2>
        <p className="text-sm text-slate-400">Vyberte zvuk kritických upozornění v této webové aplikaci.</p>
        <p className="text-sm text-slate-400">Push zprávy z chatu a podpory se zobrazí i při zavřené aplikaci, pokud prohlížeč a systém povolují oznámení.</p>
        <button type="button" disabled={pushBusy} onClick={enableWebPush} className="flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"><BellRing size={16} />{pushBusy ? 'Zapínám…' : 'Zapnout push na tomto zařízení'}</button>
        <select value={alarmMelody} onChange={(event) => { setAlarmMelody(event.target.value); localStorage.setItem('zp_alarm_melody', event.target.value); }} className={input}>
          <option value="siren">Siréna</option><option value="bell">Zvonek</option><option value="pulse">Krátké tóny</option>
        </select>
        <button type="button" onClick={() => playCriticalAlarm({ times: 1, seconds: 2 })} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200">Přehrát ukázku zvuku</button>
      </section>

      {canEditCompanyContacts && <form onSubmit={saveCompanyProfile} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-black text-emerald-400">Údaje firmy</h2>
        <p className="text-xs text-slate-400">Firemní kontakty jsou oddělené od osobního profilu. Údaje se vztahují pouze k vaší firmě.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <input required maxLength={160} value={companyProfile.name} onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })} placeholder="Název firmy" aria-label="Název firmy" className={input} />
          <input maxLength={20} value={companyProfile.ico} onChange={(e) => setCompanyProfile({ ...companyProfile, ico: e.target.value })} placeholder="IČO" aria-label="IČO" className={input} />
          <input maxLength={30} value={companyProfile.dic} onChange={(e) => setCompanyProfile({ ...companyProfile, dic: e.target.value })} placeholder="DIČ" aria-label="DIČ" className={input} />
          <input maxLength={200} value={companyProfile.street} onChange={(e) => setCompanyProfile({ ...companyProfile, street: e.target.value })} placeholder="Ulice a číslo" aria-label="Ulice a číslo" className={input} />
          <input maxLength={100} value={companyProfile.city} onChange={(e) => setCompanyProfile({ ...companyProfile, city: e.target.value })} placeholder="Město" aria-label="Město" className={input} />
          <input maxLength={20} value={companyProfile.zip} onChange={(e) => setCompanyProfile({ ...companyProfile, zip: e.target.value })} placeholder="PSČ" aria-label="PSČ" className={input} />
          <input maxLength={3} value={companyProfile.country} onChange={(e) => setCompanyProfile({ ...companyProfile, country: e.target.value })} placeholder="Stát (ISO kód)" aria-label="Stát (ISO kód)" className={input} />
          <input type="email" maxLength={254} value={companyProfile.email} onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })} placeholder="Kontaktní e-mail firmy" aria-label="Kontaktní e-mail firmy" className={input} />
          <input type="tel" maxLength={40} value={companyProfile.phone} onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })} placeholder="Telefon firmy" aria-label="Telefon firmy" className={input} />
        </div>
        <button className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black uppercase text-white">Uložit údaje firmy</button>
      </form>}

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

function decodeVapidKey(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// Editor per-modul nastavení (ModuleSettings) — načte seznam uložených konfigurací,
// umožní je upravit jako JSON a uložit (PUT /api/settings/modules/:moduleKey).
function ModuleSettingsEditor({ token, onSaved, onError }) {
  const KNOWN = [
    ['system', 'Systém a oznámení'], ['import', 'Import'], ['export', 'Export'],
    ['workflow', 'Schvalovací procesy'], ['signatures', 'Elektronické podpisy'],
    ['distribution', 'Distribuce dokumentů'], ['licensing', 'Licence a balíčky']
  ];
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
      <p className="text-xs text-slate-400">Podrobné nastavení jednotlivých modulů. Uložené hodnoty mají přednost před výchozími.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
          {KNOWN.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
