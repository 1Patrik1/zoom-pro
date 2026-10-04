import { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { LoginScreen } from './screens/LoginScreen.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { AttendanceScreen } from './screens/AttendanceScreen.jsx';
import { DailyLogScreen } from './screens/DailyLogScreen.jsx';
import { AutoDetectScreen } from './screens/AutoDetectScreen.jsx';
import { InvoicesScreen } from './screens/InvoicesScreen.jsx';
import { ProjectsScreen } from './screens/ProjectsScreen.jsx';
import { SyncScreen } from './screens/SyncScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { ScannerScreen } from './screens/ScannerScreen.jsx';
import { InclinometerScreen } from './screens/InclinometerScreen.jsx';
import { SignatureScreen } from './screens/SignatureScreen.jsx';
import { OfflineMapsScreen } from './screens/OfflineMapsScreen.jsx';
import { WatchScreen } from './screens/WatchScreen.jsx';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen.jsx';
import { TabBar } from './components/TabBar.jsx';
import { store } from './lib/storage.js';

export function App() {
  const [tab, setTab] = useState('home');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    (async () => { setToken(await store.getToken()); setUser(await store.getUser()); })();
    Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
    Network.getStatus().then((s) => setOnline(s.connected)).catch(() => {});
  }, []);

  if (!token || !user) return <LoginScreen onLogin={(t, u) => { setToken(t); setUser(u); }} />;

  const props = { token, user, online, goto: setTab };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TopBar user={user} online={online} />
      <main className="pb-24 px-4 pt-2 max-w-md mx-auto">
        {tab === 'home' && <HomeScreen {...props} />}
        {tab === 'attendance' && <AttendanceScreen {...props} />}
        {tab === 'log' && <DailyLogScreen {...props} />}
        {tab === 'detect' && <AutoDetectScreen {...props} />}
        {tab === 'invoices' && <InvoicesScreen {...props} />}
        {tab === 'projects' && <ProjectsScreen {...props} />}
        {tab === 'scanner' && <ScannerScreen {...props} />}
        {tab === 'inclinometer' && <InclinometerScreen {...props} />}
        {tab === 'signature' && <SignatureScreen {...props} />}
        {tab === 'maps' && <OfflineMapsScreen {...props} />}
        {tab === 'watch' && <WatchScreen {...props} />}
        {tab === 'diag' && <DiagnosticsScreen {...props} />}
        {tab === 'sync' && <SyncScreen {...props} />}
        {tab === 'settings' && <SettingsScreen {...props} onLogout={async () => { await store.clear(); setToken(null); setUser(null); }} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

function TopBar({ user, online }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-brand-500">Zoom Pro · Montér</p>
          <p className="truncate text-sm font-black">{user?.email}</p>
        </div>
        <span className={`chip ${online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
          {online ? '● ONLINE' : '● OFFLINE'}
        </span>
      </div>
    </header>
  );
}
