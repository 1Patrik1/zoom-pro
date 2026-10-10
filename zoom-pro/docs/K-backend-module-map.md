# K — Kompletní backend split po souborech pro Zoom Pro

Tento dokument je přesná mapa backendu v `apps/backend/src`. Je určený pro situaci, kdy chceš přesně vědět:

- jaké soubory backend tvoří,
- co dělá každý route/service/repository modul,
- jak mezi sebou vrstvy komunikují,
- kde přesně dál dopisovat logiku.

Důležité: **přesné kódy souborů jsou přímo v balíku** v `apps/backend/src/**`.
Tento dokument je jejich architektonický a implementační index.

---

## 1. Kořen backendu

```text
apps/backend/
├─ package.json
├─ .env.example
└─ src/
   ├─ app.js
   ├─ server.js
   ├─ config/
   ├─ middleware/
   ├─ repositories/
   ├─ routes/
   ├─ services/
   └─ utils/
```

---

## 2. Bootstrap a konfigurace

## `apps/backend/src/app.js`
Skládá Express aplikaci.

Napojené route moduly:
- `/api/auth`
- `/api/sync`
- `/api/attendance`
- `/api/projects`
- `/api/users`
- `/api/saas`
- `/api/logs`
- `/api/invoices`
- `/api/settings`
- `/api/vzt`
- `/api/documents`
- `/api/imports`
- `/api/exports`
- `/api/signatures`

Tady je také `GET /health` a globální `errorHandler`.

## `apps/backend/src/server.js`
Start procesu serveru.

Zodpovědnosti:
- zavolá `createApp()`
- startne listen
- řeší SIGTERM / SIGINT
- uzavírá PostgreSQL pool
- loguje uncaught / unhandled chyby

## `apps/backend/src/config/env.js`
Parsování `.env` a central export `env` objektu.

## `apps/backend/src/config/db.js`
PostgreSQL pool a helpery:
- `pool`
- `query()`
- `withTransaction()`

---

## 3. Middleware vrstva

## `middleware/async-handler.js`
Obalí async route handlery, aby chyby spadly do `next(err)`.

## `middleware/auth.js`
JWT autentizace.

Zodpovědnosti:
- ověřit Bearer token
- načíst uživatele z DB
- připojit `req.user`

## `middleware/role-guard.js`
Role-based guard.

Použití je vhodné tam, kde nestačí jen obecný auth.

## `middleware/error-handler.js`
Centrální mapování chyb do JSON response.

Doporučené další rozšíření:
- jednotný `code`
- audit error logu
- rozlišení validation vs domain vs infra errorů

---

## 4. Utility vrstva

## `utils/http-error.js`
Doménová HTTP chyba s kódem a message.

## `utils/jwt.js`
Podepisování a verifikace JWT.

## `utils/logger.js`
Základní logger.

Doporučené další rozšíření:
- request correlation id
- structured JSON logy
- audit channel

---

## 5. Route / service / repository matice

Níže je přesná mapa backend modulů.

---

# AUTH modul

## Soubory
- `routes/auth.routes.js`
- `services/auth.service.js`
- `repositories/auth.repo.js`

## Route
- `POST /api/auth/register`
- `POST /api/auth/login`

## Service zodpovědnost
- registrace nové firmy + ownera
- registrace join uživatele do firmy
- ověření hesla
- kontrola licence firmy
- vydání JWT

## Repository zodpovědnost
- najít usera podle e-mailu
- najít firmu podle id
- vytvořit firmu a ownera v transakci
- vytvořit join usera

## Poznámka
Tady dává největší smysl držet transakčně:
- create company
- create owner
- init consumables summary

---

# SYNC modul

## Soubory
- `routes/sync.routes.js`
- `services/sync.service.js`
- `repositories/sync.repo.js`

## Route
- `GET /api/sync`

## Service zodpovědnost
- agregovat dashboard model pro frontend

## Repository zodpovědnost
- company
- users
- projects
- assignments
- chats
- attendance
- logs
- invoices
- components
- consumables
- allCompanies (jen pro superadmin)

## Poznámka
Toto je dnes centrální read-model backendu pro původní PWA UI.

---

# ATTENDANCE modul

## Soubory
- `routes/attendance.routes.js`
- `services/attendance.service.js`
- `repositories/attendance.repo.js`

## Route
- `POST /api/attendance`

## Service zodpovědnost
- přebrat payload z UI
- doplnit `userId`, `companyId`
- uložit docházku

## Repository zodpovědnost
- `INSERT INTO "Attendance"`

## Doporučené další rozšíření
- GPS policy validace
- geofence kontrola
- zákaz backfill podle company settings
- approval workflow pro ruční editace

---

# PROJECTS modul

## Soubory
- `routes/projects.routes.js`
- `services/projects.service.js`
- `repositories/projects.repo.js`

## Route
- `POST /api/projects`
- `POST /api/projects/assign`
- `POST /api/projects/chat`

## Service zodpovědnost
- práva na založení projektu
- práva na přiřazování lidí
- zápis chatu

## Repository zodpovědnost
- create project
- assign project member
- unassign project member
- create project chat message

## Poznámka
Projects modul dnes sdružuje dvě subdomény:
- project management
- project chat

Později se dá chat oddělit.

---

# USERS modul

## Soubory
- `routes/users.routes.js`
- `services/users.service.js`
- `repositories/users.repo.js`

## Route
- `POST /api/users/role`
- `POST /api/users/approve`

## Service zodpovědnost
- validace práva měnit role
- schvalování lidí

## Repository zodpovědnost
- update role
- approve user

## Doporučené další rozšíření
- capability-based guard místo čistě role-based ifů
- audit log změn role
- zákaz downgrade některých privilegovaných účtů

---

# SAAS modul

## Soubory
- `routes/saas.routes.js`
- `services/saas.service.js`
- `repositories/saas.repo.js`

## Route
- `POST /api/saas/toggle`

## Service zodpovědnost
- togglování stavu licence firmy

## Repository zodpovědnost
- update `Company.isActive`

---

# LOGS modul

## Soubory
- `routes/logs.routes.js`
- `services/logs.service.js`
- `repositories/logs.repo.js`

## Route
- `POST /api/logs`

## Service zodpovědnost
- vytvoření denního záznamu
- doplnění `authorId`, `companyId`

## Repository zodpovědnost
- insert `DailyLog`

## Doporučené další rozšíření
- attachments
- lock log entry
- approve log
- convert log to document

---

# INVOICES modul

## Soubory
- `routes/invoices.routes.js`
- `services/invoices.service.js`
- `repositories/invoices.repo.js`

## Route
- `POST /api/invoices`
- `POST /api/invoices/pay`

## Service zodpovědnost
- vytvoření faktury
- označení faktury jako zaplacené

## Repository zodpovědnost
- insert `Invoice`
- update invoice status + paidAt

## Důležitá poznámka
Tady je vhodné sjednotit invoice status model mezi skeletonem a enterprise schématem.

---

# SETTINGS modul

## Soubory
- `routes/settings.routes.js`
- `services/settings.service.js`
- `repositories/settings.repo.js`

## Route
- `POST /api/settings`
- `GET /api/settings/company`
- `GET /api/settings/modules/:moduleKey`
- `PUT /api/settings/modules/:moduleKey`

## Service zodpovědnost
- update pricing
- čtení company settings
- čtení modulových settings
- upsert modulových settings

## Repository zodpovědnost
- update `Company.costPerSqMeter`, `sellPerSqMeter`
- select `CompanySettings`
- select / upsert `ModuleSettings`

## Poznámka
Toto je první krok k plně konfigurovatelné platformě.

---

# VZT modul

## Soubory
- `routes/vzt.routes.js`
- `services/vzt.service.js`
- `repositories/vzt.repo.js`

## Route
- `POST /api/vzt`

## Service zodpovědnost
- validace typu VZT prvku
- výpočet plochy / hmotnosti
- uložení komponenty

## Repository zodpovědnost
- insert `VztComponent`

## Doporučené další rozšíření
- výpočet více typů dílů
- material presets
- napojení na price engine a documents

---

# DOCUMENTS modul

## Soubory
- `routes/documents.routes.js`
- `services/documents.service.js`
- `repositories/documents.repo.js`

## Route
- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents`
- `POST /api/documents/:id/approve`

## Service zodpovědnost
- list dokumentů
- detail dokumentu
- create dokumentu
- hash preview
- approve dokumentu

## Repository zodpovědnost
- select list s filtry
- select one
- insert `Document`
- update approve state

## Poznámka
Documents modul je zárodek platformové vrstvy pro formální dokumenty celé appky.

---

# IMPORTS modul

## Soubory
- `routes/imports.routes.js`
- `services/imports.service.js`
- `repositories/imports.repo.js`

## Route
- `GET /api/imports/profiles`
- `GET /api/imports/jobs`
- `POST /api/imports/jobs`

## Service zodpovědnost
- list profilů
- list jobů
- create import job

## Repository zodpovědnost
- select `ImportProfile`
- select `ImportJob`
- insert `ImportJob`

## Doporučené další rozšíření
- upload endpoint
- preview rows
- validation rows
- import result summary

---

# EXPORTS modul

## Soubory
- `routes/exports.routes.js`
- `services/exports.service.js`
- `repositories/exports.repo.js`

## Route
- `GET /api/exports/profiles`
- `GET /api/exports/jobs`
- `POST /api/exports/jobs`

## Service zodpovědnost
- list profilů
- list jobů
- create export job

## Repository zodpovědnost
- select `ExportProfile`
- select `ExportJob`
- insert `ExportJob`

## Doporučené další rozšíření
- artifact file URL
- export worker
- final status transitions

---

# SIGNATURES modul

## Soubory
- `routes/signatures.routes.js`
- `services/signatures.service.js`
- `repositories/signatures.repo.js`

## Route
- `GET /api/signatures/providers`
- `POST /api/signatures/requests`

## Service zodpovědnost
- list providerů
- create signature request

## Repository zodpovědnost
- select `SignatureProvider`
- insert `SignatureRequest`

## Doporučené další rozšíření
- webhook endpoint
- status sync
- artifact store
- retry policy

---

## 6. Jak přesně přidávat nové moduly

Když budeš přidávat nový backend modul, drž tento vzor:

### 1. repository
Nejdřív napiš DB vrstvu.

Např.
- `repositories/reports.repo.js`

### 2. service
Potom business logiku.

Např.
- `services/reports.service.js`

### 3. route
Nakonec HTTP endpointy.

Např.
- `routes/reports.routes.js`

### 4. registrace v `app.js`
Připojit `app.use('/api/reports', reportsRoutes)`

### 5. capability / role guard
Doplnit autorizaci.

---

## 7. Kde přesně dál psát kód podle typu změny

## Nový SQL dotaz
-> `repositories/*`

## Nové business pravidlo
-> `services/*`

## Nový endpoint
-> `routes/*`

## Globální auth/error chování
-> `middleware/*`

## .env / runtime config
-> `config/*`

## helper funkce
-> `utils/*`

---

## 8. Co je dnes v backendu nejvíc potřeba doplnit

### 1. request validace
Každý route modul by měl dostat schema validaci.

### 2. capability middleware
Role guard nestačí na enterprise růst.

### 3. audit log middleware
Citlivé změny mají být auditované automaticky.

### 4. transakce ve workflow operacích
Např. document approve + audit + signature create.

### 5. background jobs
Import/export/signature worker.

---

## 9. Shrnutí K

Backend je už rozdělený správným směrem a v balíku máš **přesné implementační soubory**, ne jen návrh.

To znamená, že teď už je možné dělat další práci disciplinovaně po modulech, bez vracení se k monolitickému `server.js` stylu.

Prakticky:
- přesné route soubory už existují,
- přesné service soubory už existují,
- přesné repository soubory už existují,
- tento dokument ti říká, co kde přesně řešit.
