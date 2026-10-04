import { useState } from 'react';
import { LogOut, Menu, X, Search, Bell, BellOff, Siren } from 'lucide-react';

export function AppShell({ appName = 'Zoom Pro', user, navItems, activeTab, onChangeTab, onLogout, alarm, branding, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = navItems.filter((it) => !query || it.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <button className="lg:hidden rounded-xl border border-slate-700 p-2" onClick={() => setMobileOpen((v) => !v)} aria-label="menu">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-blue-400" style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}>
              {branding?.logoUrl && <img src={branding.logoUrl} alt="" className="h-4 w-4 rounded" />}
              {branding?.name || appName}
            </p>
            <h1 className="truncate text-sm font-black">{user?.email}</h1>
            <p className="text-[10px] text-slate-400">Role: {user?.role}</p>
          </div>
          <div className="flex items-center gap-2">
            {alarm && (
              <div className="relative">
                <button
                  onClick={() => setAlarmOpen((v) => !v)}
                  aria-label="Alarmy"
                  title={alarm.enabled ? 'Alarm zapnutý — klikni pro detail' : 'Alarm VYPNUTÝ — klikni pro detail'}
                  className={`relative rounded-xl border p-2 ${alarm.events?.length ? 'border-rose-600 bg-rose-950/40 text-rose-300' : 'border-slate-700 text-slate-300 hover:border-blue-500'}`}
                >
                  {alarm.enabled ? <Bell size={18} /> : <BellOff size={18} className="text-amber-400" />}
                  {!!alarm.events?.length && alarm.enabled && (
                    <span className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">
                      {alarm.events.length}
                    </span>
                  )}
                </button>
                {alarmOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                      <Siren size={14} className="text-rose-400" /> Alarmy — proč se spustily
                    </p>
                    <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-xs">
                      {alarm.events?.length ? alarm.events.map((e, i) => (
                        <li key={`${e.id}-${i}`} className="rounded-lg bg-slate-800 px-2 py-1.5">
                          <span className="font-mono text-slate-500">{new Date(e.time).toLocaleTimeString('cs-CZ')}</span>
                          {' — '}
                          <span className="text-slate-200">{e.text}</span>
                          <span className={`ml-1 rounded px-1 text-[10px] font-black ${e.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
                            {e.severity}
                          </span>
                        </li>
                      )) : <li className="px-1 py-2 text-slate-500">Žádné události.</li>}
                    </ul>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black">
                      <button
                        onClick={() => { alarm.onToggle(); }}
                        className={alarm.enabled ? 'rounded-xl bg-rose-600 px-2 py-2 text-white' : 'rounded-xl bg-emerald-600 px-2 py-2 text-white'}
                      >
                        {alarm.enabled ? 'VYPNOUT' : 'ZAPNOUT'}
                      </button>
                      <button onClick={() => alarm.onStop && alarm.onStop()} className="rounded-xl border border-amber-600 px-2 py-2 text-amber-300">
                        ZTIŠIT
                      </button>
                      <button onClick={() => alarm.onClear()} className="rounded-xl border border-slate-600 px-2 py-2 text-slate-300">
                        VYMAZAT
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {alarm.enabled ? 'Siréna je aktivní. Nové kritické události zazvoní.' : 'Alarm je vypnutý — události se jen zaznamenávají.'}
                    </p>
                  </div>
                )}
              </div>
            )}
            <button className="hidden lg:inline-flex rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:border-blue-500"
              onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? '»' : '«'}
            </button>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-black uppercase text-slate-200 hover:border-rose-700 hover:text-rose-400">
              <LogOut size={13} /> Odhlásit
            </button>
          </div>
        </div>
      </header>

      <div className={`mx-auto grid max-w-[1400px] gap-4 px-3 py-4 lg:grid-cols-[${collapsed ? '68px' : '260px'}_minmax(0,1fr)]`}
           style={{ gridTemplateColumns: window.innerWidth >= 1024 ? `${collapsed ? 68 : 260}px minmax(0,1fr)` : '1fr' }}>
        {/* Boční menu — rolovací, sticky, s hledáním */}
        <aside className={`${mobileOpen ? 'block' : 'hidden'} lg:block rounded-3xl border border-slate-800 bg-slate-900 p-2`}>
          <div className="sticky top-[80px] max-h-[calc(100vh-100px)] overflow-y-auto pr-1"
               style={{ scrollbarWidth: 'thin' }}>
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2 rounded-2xl bg-slate-800/70 px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hledat modul…"
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
              </div>
            )}
            <nav className="space-y-1">
              {filtered?.map(({ id, label, icon: Icon, group }) => (
                <button
                  key={id}
                  onClick={() => { onChangeTab(id); setMobileOpen(false); }}
                  title={label}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-[13px] font-bold transition ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50' : 'text-slate-300 hover:bg-slate-800'}`}
                style={activeTab === id && branding?.primaryColor ? { backgroundColor: branding.primaryColor } : undefined}>
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              ))}
              {!filtered.length && !collapsed && (
                <p className="px-3 py-2 text-xs text-slate-500">Nic nenalezeno.</p>
              )}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
