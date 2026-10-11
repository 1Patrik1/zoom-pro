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
  const [restoringSession, setRestoringSession] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    (async () => {
      const [savedToken, savedUser] = await Promise.all([store.getToken(), store.getUser()]);
      setToken(savedToken);
      setUser(savedUser);
      setRestoringSession(false);
    })();
    Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
    Network.getStatus().then((s) => setOnline(s.connected)).catch(() => {});
  }, []);

  if (restoringSession) return <main className="grid min-h-screen place-items-center bg-[#030712]"><img src="/brand/zoom-pro-wordmark.png" alt="Zoom Pro" className="h-20 w-72 object-contain" /></main>;
  if (!token || !user) return <LoginScreen onLogin={(t, u) => { setToken(t); setUser(u); }} />;

  const props = { token, user, online, goto: setTab, onUserUpdated: async (updatedUser) => { setUser(updatedUser); await store.setUser(updatedUser); } };

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
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email;
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 px-3 py-2">
        <img src="/brand/zoom-pro-wordmark.png" alt="Zoom Pro" className="h-10 w-40 shrink-0 object-contain object-left" />
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-black">{displayName}</p>
          {(user?.firstName || user?.lastName) && <p className="truncate text-[10px] text-slate-500">{user.email}</p>}
        </div>
        <span title={online ? 'Online' : 'Offline'} className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      </div>
    </header>
  );
}
