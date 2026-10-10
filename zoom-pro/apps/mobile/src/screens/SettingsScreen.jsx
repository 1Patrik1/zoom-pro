import { useEffect, useState } from 'react';
import { Server, LogOut, Trash2, Bell } from 'lucide-react';
import { store, queue } from '../lib/storage.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';

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

export function SettingsScreen({ user, onLogout }) {
  const [apiUrl, setApiUrl] = useState('');
  const [device, setDevice] = useState(null);
  const [pushToken, setPushToken] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    store.getApiUrl().then(setApiUrl);
    Device.getInfo().then(setDevice).catch(() => {});
  }, []);

  const saveApi = async () => { await store.setApiUrl(apiUrl); setMsg('Uloženo.'); setTimeout(() => setMsg(''), 1200); };

  const clearQueue = async () => {
    const items = await queue.list();
    for (const it of items) await queue.remove(it.key);
    setMsg('Fronta vymazána.'); setTimeout(() => setMsg(''), 1200);
  };

  const enablePush = async () => {
    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === 'granted') {
        await PushNotifications.register();
        PushNotifications.addListener('registration', (t) => setPushToken(t.value));
        setMsg('Push aktivní.');
      }
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
        <p className="text-xs font-black text-slate-300">Účet</p>
        <p className="text-sm">{user?.email}</p>
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
        <button onClick={enablePush} className="btn-ghost w-full">Aktivovat push notifikace</button>
        <button onClick={testLocalNotif} className="btn-ghost w-full">Test lokální notifikace</button>
        {pushToken && <p className="text-[10px] text-slate-400 break-all">Token: {pushToken}</p>}
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
