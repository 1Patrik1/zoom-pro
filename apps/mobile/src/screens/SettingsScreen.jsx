import { useEffect, useState } from 'react';
import { Server, LogOut, Trash2, Bell } from 'lucide-react';
import { store, queue } from '../lib/storage.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { api } from '../lib/api.js';
import { registerPush } from '../lib/push.js';

// ONBOARDING: první spuštění musí nastavit adresu serveru — jinak appka volá
// neexistující https://api.zoom-pro.app. Wizard se ukáže, dokud uživatel adresu neuloží.
export function ApiUrlOnboarding({ onDone }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    u = u.replace(/\/+$/, '');
    setBusy(true);
    try {
      await store.setApiUrl(u);
      onDone?.(u);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, gap: 14 }}>
      <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 900 }}>Vítejte v Zoom Pro</h1>
      <p style={{ color: '#94a3b8', fontSize: 13 }}>
        Zadejte adresu serveru, kde běží vaše Zoom Pro instance (např. <b>http://192.168.1.10:5000</b>).
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="http://adresa-serveru:5000"
        autoCapitalize="none"
        autoCorrect="off"
        keyboardType="url"
        style={{ background: '#1e293b', color: '#f8fafc', borderRadius: 14, padding: '14px 16px', fontSize: 15, borderWidth: 1, borderColor: '#334155' }}
      />
      <button
        onClick={save}
        disabled={busy || !url.trim()}
        style={{ background: '#2563eb', color: '#fff', borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 800, opacity: busy || !url.trim() ? 0.5 : 1 }}
      >
        {busy ? 'Ukládám…' : 'Připojit se'}
      </button>
      <p style={{ color: '#64748b', fontSize: 11 }}>
        Adresu najdete v admin konzoli serveru, nebo ji zjistěte od správce. Půjde kdykoli změnit v Nastavení.
      </p>
    </div>
  );
}

export function SettingsScreen({ user, token, onUserUpdated, onLogout }) {
  const [apiUrl, setApiUrl] = useState('');
  const [device, setDevice] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [alarmMelody, setAlarmMelody] = useState('siren');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingContacts, setSavingContacts] = useState(false);

  useEffect(() => {
    store.getApiUrl().then(setApiUrl);
    store.getAlarmMelody().then(setAlarmMelody);
    Device.getInfo().then(setDevice).catch(() => {});
  }, []);

  const saveApi = async () => { await store.setApiUrl(apiUrl); setMsg('Uloženo.'); setTimeout(() => setMsg(''), 1200); };

  const saveContacts = async () => {
    setSavingContacts(true); setMsg('');
    try {
      const result = await api.request('/api/users/profile', { method: 'POST', token, body: {
        email, phone,
        firstName: user?.firstName || '', lastName: user?.lastName || '',
        employmentType: user?.employmentType || 'INTERNAL',
        ico: user?.ico || '', dic: user?.dic || '', street: user?.street || '', city: user?.city || '', zip: user?.zip || ''
      } });
      await onUserUpdated?.({ ...user, ...(result.user || {} ) });
      setEmail(result.user?.email || email);
      setPhone(result.user?.phone || '');
      setMsg('Kontaktní údaje uloženy.');
    } catch (error) { setMsg(error.message || 'Uložení kontaktních údajů selhalo.'); }
    finally { setSavingContacts(false); }
  };

  const clearQueue = async () => {
    const items = await queue.list();
    for (const it of items) await queue.remove(it.key);
    setMsg('Fronta vymazána.'); setTimeout(() => setMsg(''), 1200);
  };

  const enablePush = async () => {
    try {
      const result = await registerPush(token);
      if (!result.ok) { setMsg(result.reason === 'denied' ? 'Povolte oznámení v nastavení telefonu.' : `Push se nepodařilo aktivovat: ${result.reason}`); return; }
      setPushToken(result.token);
      setPushEnabled(true);
      setMsg('Upozornění na telefon jsou aktivní.');
    } catch (e) { setMsg('Push chyba: ' + e.message); }
  };

  const testLocalNotif = async () => {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{ id: 1, title: 'Zoom Pro', body: 'Test notifikace ✅', schedule: { at: new Date(Date.now() + 2000) } }]
    });
  };

  return (
    <div className="space-y-4">
      <header><h2 className="text-xl font-black">Nastavení</h2></header>

      <div className="card space-y-2">
        <p className="text-xs font-black text-slate-300">Melodie alarmu</p>
        <select value={alarmMelody} onChange={async (event) => { setAlarmMelody(event.target.value); await store.setAlarmMelody(event.target.value); }} className="w-full rounded-xl bg-slate-800 px-3 py-3 text-white">
          <option value="siren">Siréna</option><option value="bell">Zvonek</option><option value="pulse">Krátké tóny</option>
        </select>
      </div>

      <div className="card space-y-2">
        <p className="text-xs font-black text-slate-300">Účet</p>
        {(user?.firstName || user?.lastName) && <p className="text-sm font-bold">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</p>}
        <div className="space-y-2 pt-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Přihlašovací e-mail" className="w-full rounded-xl bg-slate-800 px-3 py-3 text-white" />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefonní číslo" className="w-full rounded-xl bg-slate-800 px-3 py-3 text-white" />
          <button disabled={savingContacts} onClick={saveContacts} className="btn-ghost w-full disabled:opacity-50">{savingContacts ? 'Ukládám…' : 'Uložit e-mail a telefon'}</button>
        </div>
        <p className="text-xs text-slate-400">Role: {user?.role}</p>
      </div>

      <div className="card">
        <p className="flex items-center gap-2 text-xs font-black text-slate-300"><Server size={14} /> Server URL</p>
        <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
          className="mt-2 w-full rounded-2xl bg-slate-800 px-3 py-3 text-white" />
        <button onClick={saveApi} className="btn-ghost w-full mt-2">Uložit</button>
      </div>

      <div className="card space-y-2">
        <p className="flex items-center gap-2 text-xs font-black text-slate-300"><Bell size={14} /> Notifikace</p>
        <p className="text-xs text-slate-400">Zprávy z projektového chatu a další systémová upozornění se zobrazí v oznámeních telefonu.</p>
        <button onClick={enablePush} className="btn-ghost w-full">{pushEnabled ? 'Obnovit registraci telefonu' : 'Zapnout upozornění na telefonu'}</button>
        <button onClick={testLocalNotif} className="btn-ghost w-full">Test lokální notifikace</button>
        {pushToken && <p className="text-xs text-emerald-300">Telefon je zaregistrován pro push oznámení.</p>}
      </div>

      <div className="card space-y-2">
        <p className="text-xs font-black text-slate-300">Údržba</p>
        <button onClick={clearQueue} className="btn-ghost w-full text-rose-300"><Trash2 size={14} /> Vymazat sync frontu</button>
      </div>

      {device && (
        <div className="card text-xs text-slate-400">
          <p>Model: {device.model}</p>
          <p>OS: {device.operatingSystem} {device.osVersion}</p>
          <p>Platform: {device.platform}</p>
        </div>
      )}

      <button onClick={onLogout} className="btn w-full bg-rose-600 text-white"><LogOut size={16} /> Odhlásit</button>

      {msg && <p className="text-center text-sm text-slate-300">{msg}</p>}
    </div>
  );
}
