# I — Frontend refactor plan pro Zoom Pro

Tento dokument převádí původní monolitický `App.jsx` do modulární struktury po feature blocích. Vychází z reálně nalezených sekcí v původním souboru:

- `reporty`
- `dochazka`
- `projekty`
- `denik`
- `kalkulacka`
- `faktury`
- `sklad`
- `team`
- `nastaveni`

Původní frontend používal centrální stav a jeden helper `action(endpoint, payload)` nad endpointy:

- `POST /api/attendance`
- `POST /api/projects`
- `POST /api/projects/assign`
- `POST /api/projects/chat`
- `POST /api/logs`
- `POST /api/vzt`
- `POST /api/invoices`
- `POST /api/invoices/pay`
- `POST /api/users/approve`
- `POST /api/users/role`
- `POST /api/settings`
- `GET /api/sync`
- `POST /api/auth/register`
- `POST /api/auth/login`

---

## 1. Cíl refaktoru

Cílem je rozdělit UI do tří vrstev:

1. **App orchestrace** — auth, synchronizace, routing přes taby
2. **layout / pages** — kostra aplikace a login/dashboard
3. **feature moduly** — samostatné funkční celky po doménách

---

## 2. Cílová struktura frontend části

```text
apps/frontend/src/
├─ App.jsx
├─ main.jsx
├─ index.css
├─ api/
│  └─ client.js
├─ config/
│  └─ nav.config.js
├─ hooks/
│  ├─ useAuth.js
│  └─ useSync.js
├─ layouts/
│  └─ AppShell.jsx
├─ pages/
│  ├─ LoginPage.jsx
│  └─ DashboardPage.jsx
├─ utils/
│  └─ permissions.js
└─ features/
   ├─ attendance/
   │  └─ AttendancePage.jsx
   ├─ projects/
   │  └─ ProjectsPage.jsx
   ├─ daily-log/
   │  └─ DailyLogPage.jsx
   ├─ vzt/
   │  └─ VztCalculatorPage.jsx
   ├─ invoices/
   │  └─ InvoicesPage.jsx
   ├─ inventory/
   │  └─ InventoryPage.jsx
   ├─ team/
   │  └─ TeamPage.jsx
   ├─ settings/
   │  └─ SettingsPage.jsx
   └─ reports/
      └─ ReportsPage.jsx
```

---

## 3. Přesné role jednotlivých souborů

## `App.jsx`
Hlavní kompozice celé aplikace.

Zodpovědnosti:
- načte `useAuth()`
- načte `useSync(token)`
- z `NAV_ITEMS` a role uživatele dopočte viditelnou navigaci
- drží aktivní tab
- mapuje UI akce na backend endpointy
- rozhoduje, která stránka se vykreslí

## `api/client.js`
Jednotná transportní vrstva nad `fetch`.

Zodpovědnosti:
- skládání URL podle `VITE_API_URL`
- přidání `Authorization: Bearer ...`
- JSON serializace/deserializace
- jednotné error hlášky

## `hooks/useAuth.js`
Oddělená autentizační logika.

Zodpovědnosti:
- login
- registrace firmy / join pracovníka
- ukládání tokenu a user objektu do `localStorage`
- logout

## `hooks/useSync.js`
Oddělená synchronizace doménových dat.

Zodpovědnosti:
- `GET /api/sync`
- polling každých 5 sekund
- helper `postAction(endpoint, payload)`
- obnova `db` modelu po write operaci

## `layouts/AppShell.jsx`
Společná shell kostra appky.

Zodpovědnosti:
- hlavička
- sidebar
- tab navigace
- logout tlačítko
- hlavní obsahová oblast

## `pages/LoginPage.jsx`
Samostatná přihlašovací / registrační stránka.

## `pages/DashboardPage.jsx`
Souhrnný dashboard dat z `/api/sync`.

## `features/*`
Každý feature soubor obsluhuje přesně jednu doménu a používá už jen props:
- `db`
- `user`
- callback `onCreate` / `onSave` / `onApprove`

Tím je odstraněné přímé sahání do globálního stavu z každé vnitřní části.

---

## 4. Přímé mapování starý stav -> nový soubor

| Starý blok v App.jsx | Nový soubor |
|---|---|
| login / registrace | `pages/LoginPage.jsx` |
| reporty | `pages/DashboardPage.jsx` + `features/reports/ReportsPage.jsx` |
| docházka | `features/attendance/AttendancePage.jsx` |
| projekty + assignment + chat | `features/projects/ProjectsPage.jsx` |
| deník | `features/daily-log/DailyLogPage.jsx` |
| kalkulačka | `features/vzt/VztCalculatorPage.jsx` |
| faktury | `features/invoices/InvoicesPage.jsx` |
| sklad | `features/inventory/InventoryPage.jsx` |
| team | `features/team/TeamPage.jsx` |
| nastavení ceníku | `features/settings/SettingsPage.jsx` |
| nav / shell | `layouts/AppShell.jsx` |
| auth helper | `hooks/useAuth.js` |
| sync helper | `hooks/useSync.js` |
| fetch helper | `api/client.js` |

---

## 5. Přesně připravené kódy souborů

Přesné implementační soubory už jsou připravené přímo ve workspace:

- `apps/frontend/src/App.jsx`
- `apps/frontend/src/api/client.js`
- `apps/frontend/src/config/nav.config.js`
- `apps/frontend/src/hooks/useAuth.js`
- `apps/frontend/src/hooks/useSync.js`
- `apps/frontend/src/layouts/AppShell.jsx`
- `apps/frontend/src/pages/LoginPage.jsx`
- `apps/frontend/src/pages/DashboardPage.jsx`
- `apps/frontend/src/features/attendance/AttendancePage.jsx`
- `apps/frontend/src/features/projects/ProjectsPage.jsx`
- `apps/frontend/src/features/daily-log/DailyLogPage.jsx`
- `apps/frontend/src/features/vzt/VztCalculatorPage.jsx`
- `apps/frontend/src/features/invoices/InvoicesPage.jsx`
- `apps/frontend/src/features/inventory/InventoryPage.jsx`
- `apps/frontend/src/features/team/TeamPage.jsx`
- `apps/frontend/src/features/settings/SettingsPage.jsx`
- `apps/frontend/src/features/reports/ReportsPage.jsx`
- `apps/frontend/src/utils/permissions.js`

To znamená: nejde už jen o návrh, ale o reálně připravený startovní refactor.

---

## 6. Doporučený další split po druhé vlně

Až poběží první refactor, doporučuji další krok:

### attendance
- `AttendanceActions.jsx`
- `AttendanceHistory.jsx`
- `useAttendanceActions.js`

### projects
- `ProjectList.jsx`
- `ProjectAssignments.jsx`
- `ProjectChat.jsx`
- `useProjectChat.js`

### invoices
- `InvoiceForm.jsx`
- `InvoiceList.jsx`
- `InvoiceStatusBadge.jsx`

### settings
- `PricingForm.jsx`
- `CompanySettingsForm.jsx`
- `ModuleSettingsLoader.jsx`

### reports
- `KpiCards.jsx`
- `RevenueSummary.jsx`
- `ProductionSummary.jsx`

---

## 7. Hlavní přínosy refaktoru

- menší soubory
- jednodušší debug
- jednodušší testování
- čistější napojení na nové moduly `documents / imports / exports / signatures`
- připravenost na React Router nebo jinou navigaci
- snadnější přidání validací a typizace

---

## 8. Praktický postup nasazení refaktoru

1. ponechat zálohu původního `App.jsx`
2. přepsat `apps/frontend/src/App.jsx` novou orchestrace verzí
3. doplnit nové soubory z připraveného balíku
4. spustit `npm install`
5. spustit `npm run dev`
6. krokově testovat:
   - login
   - sync
   - attendance
   - project create
   - project assign
   - chat
   - logs
   - vzt
   - invoices
   - team
   - settings

---

## 9. Co tento refactor zatím záměrně neřeší

- React Router
- central store typu Zustand / Redux
- websocket chat
- upload příloh
- documents/imports/exports/signatures pages
- generátor formulářů z JSON schema

To je v pořádku — cílem této fáze je udělat čistý a bezpečný mezikrok, ne velký riskantní přepis všeho naráz.
