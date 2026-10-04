# Architektura pro tvoji PWA appku — Zoom Pro

Tento dokument je architektonický blueprint pro tvoji aplikaci jako celek. Je psaný prakticky: ne jen „jak by to mohlo vypadat“, ale jak to má být rozdělené, proč je to tak a co kam přesně patří.

---

## 1. Hlavní architektonický cíl

Tvoje appka není jen jednoduchý frontend s backendem. Je to reálně **ERP / provozní PWA systém** pro firmu ve VZT provozu.

To znamená, že architektura musí zvládnout zároveň:

- přihlášení a správu uživatelů
- více firem / tenant model
- projekty a stavby
- docházku a polohu
- deník a interní provozní záznamy
- VZT kalkulace
- fakturaci
- sklad / spotřební materiál
- role a oprávnění
- konfiguraci modulů
- dokumenty
- import / export
- elektronické podpisy
- auditní stopu

Taková appka musí být navržená jako **modulární platforma**, ne jako jeden velký komponent a jeden velký server file.

---

## 2. Celkový high-level model

```text
[ PWA Frontend ]
        |
        v
[ REST API Backend ]
        |
        v
[ PostgreSQL ]
        |
        +--> [ Documents / Exports / Signatures / Audit ]
        +--> [ Company + Users + Projects + Attendance + Logs + Invoices + Inventory ]
```

### Budoucí rozšíření
```text
Frontend
  -> REST API
  -> Job Queue / Worker
  -> File Storage
  -> Signature Provider
  -> Reporting / Export Engine
```

---

## 3. Architektonické vrstvy

## Vrstva 1 — Presentation / PWA frontend
Tato vrstva řeší:
- UI
- navigaci
- lokální stav obrazovky
- formuláře
- volání backendu
- případně offline UX / cache / installability

Tato vrstva **nesmí** obsahovat těžkou business logiku, výpočty oprávnění natvrdo a SQL-like rozhodování.

## Vrstva 2 — API / backend
Tato vrstva řeší:
- autentizaci
- autorizaci
- validaci
- business pravidla
- audit
- transakce
- přístup k datům
- orchestraci dokumentů / exportů / podpisů

## Vrstva 3 — persistence / databáze
Tato vrstva řeší:
- uložení dat
- vztahy
- indexy
- constraints
- enumy
- auditovatelnost
- historičnost dat

---

## 4. Architektura frontendu

## Současný problém
Původní frontend měl velký `App.jsx`, kde bylo pohromadě:
- auth
- sync polling
- tab nav
- reporty
- docházka
- projekty
- chat
- deník
- kalkulačka
- faktury
- sklad
- team
- settings

To je rychlé na začátek, ale neškáluje.

## Doporučený cílový frontend model

```text
src/
├─ api/
├─ hooks/
├─ layouts/
├─ pages/
├─ features/
├─ utils/
├─ config/
└─ styles/
```

### Principy
- `App.jsx` pouze orchestruje
- každá doména je ve `features/*`
- společné UI patří do `components/` nebo `layouts/`
- API komunikace jde přes `api/client.js`
- auth a sync jdou přes hooky
- role/viditelnost jde přes utilitu nebo capability model

## Proč je to správně
- menší coupling
- jednodušší testování
- jednodušší nahrazení interní navigace routerem
- jednodušší připojení nových modulů

---

## 5. Architektura backendu

## Cílový backend pattern

```text
routes -> services -> repositories -> db
```

### `routes`
- HTTP endpointy
- auth middleware
- validace vstupů
- mapování request -> service

### `services`
- business logika
- práva a workflow rozhodnutí
- skládání více repository operací
- transakční orchestrace

### `repositories`
- SQL dotazy
- bez UI logiky
- bez rozhodování podle role na vyšší úrovni

### `config`
- env
- db pool
- runtime flags

### `middleware`
- JWT auth
- capability guard
- role guard
- error handler
- audit middleware

### `utils`
- common helpers
- JWT helper
- logger
- HttpError

---

## 6. Modulární rozdělení backendu

Aktuální backend by měl být rozdělen minimálně takto:

### Core moduly
- auth
- sync
- users
- settings
- permissions
- audit

### Provozní moduly
- attendance
- projects
- project-chat
- daily-log
- vzt
- invoices
- inventory
- saas

### Platformové moduly
- documents
- imports
- exports
- signatures
- templates
- approval-flows

---

## 7. Datová architektura

## Tenant model
Aplikace je multi-company / multi-tenant ve smyslu oddělení dat po `companyId`.

To znamená:
- téměř každá business tabulka musí mít `companyId`
- každá query musí být company-safe
- auth middleware musí načíst uživatele včetně `companyId`
- repository vrstva musí filtrovat podle firmy

## Core entity
- `Company`
- `User`
- `Project`
- `Attendance`
- `DailyLog`
- `Invoice`
- `VztComponent`
- `ConsumablesSummary`
- `ProjectAssignment`
- `ProjectChat`

## Governance entity
- `CompanySettings`
- `ModuleSettings`
- `Permission`
- `RolePermission`
- `UserPermissionOverride`
- `AuditLog`

## Document engine entity
- `DocumentTemplate`
- `Document`
- `DocumentVersion`
- `DocumentSignature`
- `DocumentExport`
- `ApprovalFlow`
- `ApprovalFlowStep`
- `ApprovalDecision`

## Import/Export entity
- `ImportProfile`
- `ImportJob`
- `ImportJobRow`
- `ExportProfile`
- `ExportJob`

## Signature entity
- `SignatureProvider`
- `SignatureRequest`
- `SignatureArtifact`

---

## 8. Přesný tok dat v appce

## Login flow
```text
LoginPage
 -> POST /api/auth/login
 -> backend auth.service
 -> auth.repo
 -> User + Company
 -> JWT token
 -> frontend localStorage
 -> useSync(token)
 -> GET /api/sync
 -> načtení celého dashboard modelu
```

## Standardní write flow
Např. vytvoření faktury:

```text
InvoicesPage form submit
 -> postAction('invoices', payload)
 -> POST /api/invoices
 -> invoices.service.create()
 -> invoices.repo.create()
 -> DB INSERT
 -> response
 -> frontend reload /api/sync
 -> UI refresh
```

## Document flow
```text
Document form
 -> POST /api/documents
 -> documents.service.create()
 -> documents.repo.create()
 -> Document row
 -> hash preview
 -> případně approval flow
 -> sign request
 -> export job
```

---

## 9. Proč dnes dává smysl centrální `/api/sync`

Pro současný stav tvé appky je centrální `GET /api/sync` funkční kompromis.

### Výhody
- jednoduchý frontend
- rychlé načtení celé obrazovky
- minimum klientské orchestrace

### Nevýhody
- může být těžké payloadově
- při růstu dat bude neefektivní
- polling každých 5 s škáluje hůř

## Doporučená budoucnost
Postupně přejít z centrálního sync modelu na kombinaci:
- dashboard summary endpointy
- feature-specific list endpointy
- selective refresh po modulech
- websocket / SSE jen tam, kde to má smysl (chat, notifications)

---

## 10. Oprávnění a bezpečnostní model

## Dnešní stav
Část pravidel je role-based.

## Cílový stav
Role mají být jen základ. Reálné řízení musí dělat capability systém.

### Příklad
Ne otázka:
- „je user REDITEL?“

Ale otázka:
- „má capability `invoices.issue`?“
- „má capability `daily_log.approve`?“
- „má capability `settings.manage_modules`?“

## Proč
Protože časem budeš chtít:
- různé typy administrativy
- výjimky na uživatele
- jemnější řízení pravomocí
- audit, kdo směl co udělat

---

## 11. Dokumentová architektura

Dokumenty v téhle appce nemají být bokem. Mají být **průřezová platformová vrstva**.

### Napojení na moduly
- faktury -> invoice documents
- docházka -> attendance statements
- deník -> daily log reports
- projekty -> handover protocol / assignment documents
- sklad -> issue/receipt documents
- VZT -> calculation sheets / production sheets

### Princip
Provozní data vznikají v core modulech, ale dokumenty nad nimi vytvářejí:
- formalizovaný výstup
- schvalování
- podpis
- export
- archivaci

---

## 12. Import / export architektura

## Import
Import engine musí mít fáze:

```text
upload -> parse -> map -> validate -> preview -> confirm -> import -> report
```

### Proč je to důležité
U firemních dat nesmí být import „naslepo“. Musí existovat:
- preview
- validace
- chyba po řádcích
- audit
- možnost dry-run

## Export
Export engine musí mít fáze:

```text
select data -> apply filters -> generate file -> store artifact -> audit -> download/sign
```

---

## 13. Architektura elektronických podpisů

Podpisy musí být provider-agnostic. To je zásadní.

## Provider vrstva
Appka nemá být natvrdo přibetonovaná na jednoho poskytovatele.

Místo toho:
- `SignatureProvider` definuje aktivního providera
- `SignatureRequest` drží konkrétní podpisovou žádost
- `SignatureArtifact` drží výstupy

## Typické stavy
- pending
- sent
- viewed
- signed
- rejected
- expired
- cancelled

## Důsledek pro architekturu
Podpisy musí být oddělené od samotných dokumentů, ale zároveň s nimi pevně svázané.

---

## 14. PWA specifika

Protože je to PWA, doporučená architektura musí myslet i na:

- installable shell
- responsive touch-first UI
- dobré chování v terénu na mobilu
- případný offline cache layer
- postupné zlepšování UX bez rozbití core business logiky

## Doporučení
V první fázi neřešit plný offline CRUD. Nejprve stabilní online-first architektura.

Teprve později:
- read cache
- queued actions
- reconnect sync

---

## 15. Výkonnostní doporučení

## Frontend
- rozdělit velké komponenty
- lazy-load nové moduly (documents/imports/exports/signatures)
- omezit zbytečný rerender přes menší props API

## Backend
- omezit těžký `/api/sync`
- přidat indexy na `companyId`, `projectId`, `createdAt`, `status`
- zvažovat pagination pro logy, chat, attendance, invoices
- přesunout náročné exporty a podpisy do background workeru

## Databáze
- audit indexy
- company-safe constraints
- unique keys tam, kde hrozí duplicitní importy

---

## 16. Produkční architektura

Doporučené produkční rozdělení:

```text
[ Browser / Mobile PWA ]
        |
        v
[ Reverse Proxy / HTTPS ]
        |
        +--> [ Frontend static build ]
        |
        +--> [ Node backend API ]
                    |
                    +--> [ PostgreSQL ]
                    +--> [ File storage ]
                    +--> [ Worker queue ]
                    +--> [ Signature provider ]
```

### Minimální produkční stack
- frontend build přes Vite
- backend Node.js / Express
- PostgreSQL
- reverse proxy (Nginx / Caddy / Traefik)
- zálohy databáze

### Rozšířený stack
- Redis / queue
- S3 compatible file storage
- monitoring / error tracking
- CI/CD

---

## 17. Co je dnes architektonicky největší priorita

Kdybych měl určit úplně přesné priority pro tvoji appku, byly by tyto:

### priorita 1
Rozdělit frontend a backend do čisté modulární struktury.

### priorita 2
Udělat bezpečný a konzistentní DB model.

### priorita 3
Oddělit provozní data od dokumentového / podpisového / exportního engine.

### priorita 4
Z role-based systému přejít na permission/capability model.

### priorita 5
Omezit monolitický sync pattern a připravit cestu pro škálování.

---

## 18. Finální architektonický závěr

Tvoje PWA appka má být architektonicky chápána jako:

**multi-tenant provozní ERP platforma pro VZT firmu s PWA frontendem, modulárním backendem, centrálním datovým modelem, dokumentovým enginem, import/export vrstvou a podporou elektronických podpisů.**

To je správný mentální model celé aplikace.

Ne jako:
- jeden dashboard,
- jedna kalkulačka,
- pár formulářů,

ale jako **platforma**, která bude růst.

A přesně proto dává smysl architektura, kterou jsme teď připravili:
- workspace split
- frontend feature split
- backend route/service/repository split
- DB governance model
- documents/imports/exports/signatures jako samostatné platformové vrstvy

---

## 19. Co z toho už máš připravené v balíku

V aktuálním balíku už máš:
- root workspace
- frontend refactor starter files
- backend refactor skeleton
- SQL migrace
- Prisma schema
- module settings schemas
- README
- frontend refactor plan
- API contracts
- tuto architektonickou dokumentaci

To znamená, že teď už neřešíš „co s tím“, ale hlavně **v jakém pořadí to implementovat**.

---

## 20. Doporučený další krok po této dokumentaci

Nejrozumnější technický krok po této sadě dokumentace je:

1. rozběhnout nový frontend starter
2. napojit ho na backend refactor
3. ověřit `/api/sync`
4. odladit moduly attendance/projects/logs/vzt/invoices/team/settings
5. pak teprve doplnit pages pro documents/imports/exports/signatures
6. potom capability middleware + validace
7. nakonec export engine + signature provider + worker queue

To je nejbezpečnější cesta bez zbytečného chaosu a bez přepisování všeho najednou.
