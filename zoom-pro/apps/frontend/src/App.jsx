import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './layouts/AppShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ReportsPage } from './features/reports/ReportsPage.jsx';
import { AttendancePage } from './features/attendance/AttendancePage.jsx';
import { ProjectsPage } from './features/projects/ProjectsPage.jsx';
import { DailyLogPage } from './features/daily-log/DailyLogPage.jsx';
import { VztCalculatorPage } from './features/vzt/VztCalculatorPage.jsx';
import { InvoicesPage } from './features/invoices/InvoicesPage.jsx';
import { InventoryPage } from './features/inventory/InventoryPage.jsx';
import { TeamPage } from './features/team/TeamPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { DocumentsPage } from './features/documents/DocumentsPage.jsx';
import { ImportsPage } from './features/imports/ImportsPage.jsx';
import { ExportsPage } from './features/exports/ExportsPage.jsx';
import { SignaturesPage } from './features/signatures/SignaturesPage.jsx';
import { AssistantPage } from './features/assistant/AssistantPage.jsx';
import { CollisionsPage } from './features/collisions/CollisionsPage.jsx';
import { ProjectAssistantPage } from './features/troubleshooting/ProjectAssistantPage.jsx';
import { PrintPage } from './features/print/PrintPage.jsx';
import { LicensingPage } from './features/licensing/LicensingPage.jsx';
import { PlatformAdminPage } from './features/licensing/PlatformAdminPage.jsx';
import { AutoDetectPage } from './features/autodetect/AutoDetectPage.jsx';
import { DistributionPage } from './features/distribution/DistributionPage.jsx';
import { api } from './api/client.js';
import { useAuth } from './hooks/useAuth.js';
import { useCriticalAlerts } from './hooks/useCriticalAlerts.js';
import { stopAlarm } from './utils/alerts.js';
import { useSync } from './hooks/useSync.js';
import { NAV_ITEMS } from './config/nav.config.js';
import { getVisibleNav } from './utils/permissions.js';

export default function App() {
  const auth = useAuth();
  const { db, postAction } = useSync(auth.token);
  const [branding, setBranding] = useState(null);
  const [alarmOn, setAlarmOn] = useState(() => localStorage.getItem('zp_alarm_enabled') !== 'off');
  const [alarmEvents, setAlarmEvents] = useState([]);
  useCriticalAlerts(db, {
    enabled: alarmOn,
    onAlert: (events) => setAlarmEvents((prev) => [...events, ...prev].slice(0, 30)),
  });
  const toggleAlarm = () => setAlarmOn((v) => {
    const nv = !v;
    localStorage.setItem('zp_alarm_enabled', nv ? 'on' : 'off');
    return nv;
  });
  const visibleNav = useMemo(() => getVisibleNav(auth.user, NAV_ITEMS), [auth.user]);
  const [tab, setTab] = useState('reporty');

  useEffect(() => {
    if (visibleNav.length && !visibleNav.some((item) => item.id === tab)) {
      setTab(visibleNav[0].id);
    }
  }, [visibleNav, tab]);

  useEffect(() => {
    api.request('/api/licensing/branding').then((r) => {
      setBranding(r.branding || null);
      if (r.branding?.name) document.title = r.branding.name;
    }).catch(() => {});
  }, []);

  if (!auth.token || !auth.user) {
    return <LoginPage onSubmit={auth.submitAuth} loading={auth.authLoading} error={auth.authError} />;
  }

  const actions = {
    attendanceCreate: (payload) => postAction('attendance', payload),
    projectCreate: (payload) => postAction('projects', payload),
    projectUpdate: (payload) => postAction('projects/update', payload),
    projectAssign: (payload) => postAction('projects/assign', payload),
    projectChat: (payload) => postAction('projects/chat', payload),
    logCreate: (payload) => postAction('logs', payload),
    vztCreate: (payload) => postAction('vzt', payload),
    invoiceCreate: (payload) => postAction('invoices', payload),
    invoiceAutoCreate: (payload) => postAction('invoices/auto', payload),
    invoicePay: (payload) => postAction('invoices/pay', payload),
    inventoryItemCreate: (payload) => postAction('inventory/item', payload),
    inventoryMovementCreate: (payload) => postAction('inventory/movement', payload),
    userApprove: (payload) => postAction('users/approve', payload),
    userRole: (payload) => postAction('users/role', payload),
    savePricing: (payload) => postAction('settings', payload)
  };

  function renderTab() {
    switch (tab) {
      case 'reporty':
        return <><DashboardPage db={db} /><ReportsPage db={db} /></>;
      case 'dochazka':
        return <AttendancePage db={db} onCreate={actions.attendanceCreate} />;
      case 'projekty':
        return <ProjectsPage user={auth.user} db={db} onCreateProject={actions.projectCreate} onUpdateProject={actions.projectUpdate} onAssign={actions.projectAssign} onChat={actions.projectChat} />;
      case 'denik':
        return <DailyLogPage db={db} onCreate={actions.logCreate} />;
      case 'kalkulacka':
        return <VztCalculatorPage db={db} onCreate={actions.vztCreate} />;
      case 'faktury':
        return <InvoicesPage user={auth.user} db={db} token={auth.token} onCreate={actions.invoiceCreate} onAutoCreate={actions.invoiceAutoCreate} onPay={actions.invoicePay} />;
      case 'sklad':
        return <InventoryPage db={db} onCreateItem={actions.inventoryItemCreate} onCreateMovement={actions.inventoryMovementCreate} />;
      case 'asistent':
        return <AssistantPage db={db} token={auth.token} />;
      case 'kolize':
        return <CollisionsPage db={db} token={auth.token} />;
      case 'projekt-asistent':
        return <ProjectAssistantPage db={db} token={auth.token} />;
      case 'tlak':
        return <PrintPage db={db} token={auth.token} />;
      case 'licence':
        return <LicensingPage token={auth.token} user={auth.user} />;
      case 'platforma':
        return <PlatformAdminPage token={auth.token} user={auth.user} />;
      case 'autodetect':
        return <AutoDetectPage token={auth.token} db={db} />;
      case 'distribuce':
        return <DistributionPage token={auth.token} user={auth.user} db={db} />;
      case 'team':
        return <TeamPage user={auth.user} db={db} onApprove={actions.userApprove} onChangeRole={actions.userRole} />;
      case 'nastaveni':
        return <SettingsPage user={auth.user} db={db} token={auth.token} onSavePricing={actions.savePricing} />;
      case 'documents':
        return <DocumentsPage token={auth.token} />;
      case 'imports':
        return <ImportsPage token={auth.token} />;
      case 'exports':
        return <ExportsPage token={auth.token} />;
      case 'signatures':
        return <SignaturesPage token={auth.token} />;
      default:
        return <DashboardPage db={db} />;
    }
  }

  return (
    <AppShell
      user={auth.user}
      navItems={visibleNav}
      activeTab={tab}
      onChangeTab={setTab}
      onLogout={auth.logout}
      alarm={{
        enabled: alarmOn,
        onToggle: toggleAlarm,
        onStop: stopAlarm,
        events: alarmEvents,
        onClear: () => setAlarmEvents([]),
      }}
    >
      {renderTab()}
    </AppShell>
  );
}
