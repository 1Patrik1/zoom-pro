# PWA VZT System — finální spustitelný balík

Tento balík je připraven jako **finální lokálně spustitelná vývojová i produkční verze** projektu PWA VZT System.

Obsahuje:
- `apps/frontend` — React + Vite + Tailwind PWA
- kalkulačka nově obsahuje i vložený 3D VZT konfigurátor
- `apps/backend` — Node.js + Express + PostgreSQL API
- SQL schéma a seedy `001` až `009`
- seed pro **SUPERADMIN / majitele platformy**
- demo data pro **documents / imports / exports / signatures**
- helper skripty pro `.env` a aplikaci SQL
- `docker-compose.yml` pro rychlý dev PostgreSQL start
- `docker-compose.prod.yml` pro finální kontejnorové spuštění
- `Dockerfile` s targety pro backend i frontend/nginx
- produkční nginx proxy pro frontend + `/api` reverse proxy na backend

---

## 1. Ověřený stav balíku

Před zabalením bylo ověřeno:
- `npm install`
- frontend build
- backend start
- vytvoření PostgreSQL DB
- aplikace migrací a seedů
- přihlášení přes seednutého SUPERADMIN uživatele
- funkčnost endpointů:
  - `/health`
  - `/api/auth/login`
  - `/api/sync`
  - `/api/documents`
  - `/api/imports/profiles`
  - `/api/imports/jobs`
  - `/api/exports/profiles`
  - `/api/exports/jobs`
  - `/api/signatures/providers`
  - `/api/signatures/requests`
- smoke test POST operací pro documents / imports / exports / signatures
- smoke test projektů: založení stavby, editace GPS/adresy/odchylky, chat s fotkou a galerie
- smoke test faktur: ruční vystavení a automatická faktura z docházky / deníku
- smoke test docházky: GPS kontrola proti stavbě, stavy OK / OUT_OF_RADIUS
- smoke test deníku: uložení zápisu s fotkou

---

## 2. SUPERADMIN / majitel platformy

Po seedování DB je připraven první účet:

- **E-mail:** `owner@platform.local`
- **Heslo:** `PlatformOwner2026!`
- **Role:** `SUPERADMIN`
- **Tenant / firma:** `Platform Owner HQ`

Po prvním spuštění doporučuji heslo změnit.

---

## 3. Nejrychlejší DEV start

Požadavky:
- Node.js 20+
- npm 10+
- Docker / Docker Compose

### Postup

```bash
cd app-refactor-pack
npm install
npm run env:init
docker compose up -d postgres
npm run db:setup:new
npm run dev
```

Po spuštění:
- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`
- backend health: `http://localhost:5000/health`

---

## 4. Finální PRODUKČNÍ / demo container start

Toto je doporučený finální režim pro předání, demo server nebo první staging.

### 4.1 Připrav produkční env

V kořeni projektu zkopíruj soubor:

```bash
cp .env.production.example .env
```

Uprav minimálně:

```env
POSTGRES_DB=vzt_system
POSTGRES_USER=vzt_user
POSTGRES_PASSWORD=vlastni-silne-heslo
JWT_SECRET=vlastni-velmi-silny-secret
CORS_ORIGIN=http://localhost
HTTP_PORT=80
```

### 4.2 Spusť finální stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Nebo přes npm script:

```bash
npm run docker:prod:up
```

### 4.3 Co se při tom stane

- spustí se PostgreSQL
- proběhne jednorázový `migrate` kontejner
- aplikují se soubory:
  - `001_initial_schema.sql`
  - `002_seed_permissions.sql`
  - `003_seed_default_module_settings.sql`
  - `007_project_geo_and_gallery.sql`
  - `008_invoice_automation_and_permissions.sql`
  - `009_attendance_geo_guard_and_log_media.sql`
  - `005_seed_platform_superadmin.sql`
  - `006_seed_demo_profiles_and_records.sql`
- spustí se backend
- spustí se frontend přes nginx
- nginx proxy předá `/api/*` na backend

### 4.4 Výsledek

Aplikace poběží na:

```text
http://localhost
```

Pokud změníš `HTTP_PORT`, poběží na odpovídajícím portu.

---

## 5. Docker soubory

### `docker-compose.prod.yml`
Obsahuje služby:
- `postgres`
- `migrate`
- `backend`
- `frontend`

### `Dockerfile`
Obsahuje targety:
- `backend`
- `frontend`

### `deploy/nginx/frontend.conf`
Řeší:
- SPA fallback na `index.html`
- reverse proxy `/api/` → `backend:5000`
- jednoduchý frontend health endpoint `/health`

---

## 6. .env soubory

### DEV backend — `apps/backend/.env`

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://vzt_user:vzt_pass@127.0.0.1:5432/vzt_system
JWT_SECRET=dev-super-secret
CORS_ORIGIN=http://localhost:5173
APP_NAME=pwa-vzt-system
TRUST_PROXY=false
PG_POOL_MAX=10
PG_IDLE_TIMEOUT_MS=30000
```

### DEV frontend — `apps/frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_CHAT_URL=http://localhost:5001
VITE_APP_NAME=PWA VZT System
```

### PROD root env — `.env`

```env
POSTGRES_DB=vzt_system
POSTGRES_USER=vzt_user
POSTGRES_PASSWORD=vzt_pass
JWT_SECRET=change-me-in-production
CORS_ORIGIN=http://localhost
HTTP_PORT=80
```

---

## 7. NPM skripty

### Development

```bash
npm run env:init
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run start
```

### Database

```bash
npm run db:migrate:new
npm run db:migrate:legacy
npm run db:seed:platform
npm run db:seed:demo
npm run db:setup:new
```

### Docker production

```bash
npm run docker:prod:up
npm run docker:prod:down
npm run docker:prod:logs
```

---

## 8. Co je v systému připravené

### Core moduly
- auth
- sync
- attendance
- projects
- users
- saas
- logs
- invoices
- vzt
- settings

### Platformové moduly
- documents
- imports
- exports
- signatures
- capability middleware
- request validation middleware
- permissions seed
- company settings
- module settings

### Frontend obrazovky
- reporty
- docházka
- projekty
- deník
- kalkulačka
- faktury
- sklad
- team
- nastavení
- dokumenty
- importy
- exporty
- podpisy

---

## 9. Důležité SQL soubory

- `001_initial_schema.sql` — hlavní schéma
- `002_seed_permissions.sql` — role + capability seed
- `003_seed_default_module_settings.sql` — default company/module settings
- `004_upgrade_legacy_in_place.sql` — legacy upgrade cesta
- `005_seed_platform_superadmin.sql` — platform owner účet
- `006_seed_demo_profiles_and_records.sql` — demo záznamy nových modulů
- `007_project_geo_and_gallery.sql` — GPS projekty, odchylka od stavby, fotochat, galerie
- `008_invoice_automation_and_permissions.sql` — automatická fakturace z docházky a práce, nové invoice sloupce a práva pro zaměstnance
- `009_attendance_geo_guard_and_log_media.sql` — GPS kontrola docházky proti stavbě, fotky ve stavebním deníku

---

## 10. Helper skripty

### `scripts/init-env.mjs`
Zakládá `.env` soubory z `.env.example`.

### `scripts/db-run-sql.mjs`
Spouští zadané SQL soubory přes Node `pg` client.
To znamená, že pro lokální setup není nutné ručně psát dlouhé `psql` příkazy.

---

## 11. Známé hranice finální verze

Tato verze je **finální spustitelný balík pro development, demo a staging**, ale některé enterprise části jsou stále MVP základ:

- imports = evidence jobů, ne plná import pipeline
- exports = evidence export jobů, ne kompletní generátor PDF/DOCX/XLSX obsahu
- signatures = workflow a provider evidence, ne finální komerční provider integrace
- documents = CRUD + approval flow, ne kompletní šablonovací/render engine

Jinými slovy:
- **aplikace jde rozběhnout a používat jako funkční základ systému**
- **architektura je připravená správně**
- **další enterprise rozšíření už navazují na čistý základ, ne na monolitický chaos**

---

## 12. Doporučený první test po spuštění

1. otevři aplikaci
2. přihlas se přes:
   - `owner@platform.local`
   - `PlatformOwner2026!`
3. ověř načtení záložek a `/api/sync`
4. otevři moduly:
   - Dokumenty
   - Importy
   - Exporty
   - Podpisy
5. založ testovací záznamy

### Login API test

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@platform.local","password":"PlatformOwner2026!"}'
```

Pro dev backend bez nginx použij místo `http://localhost` adresu `http://localhost:5000`.

---

## 13. Troubleshooting

### Backend hlásí `DATABASE_URL is required`
Zkontroluj `apps/backend/.env` nebo produkční env proměnné.

### Frontend nekomunikuje s backendem
V dev režimu zkontroluj `apps/frontend/.env` a `VITE_API_URL`.
V produkčním docker režimu jde API přes nginx proxy `/api`.

### Docker stack nenajede napoprvé
Zkontroluj logy:

```bash
npm run docker:prod:logs
```

### Chceš čistý restart produkční DB

```bash
docker compose -f docker-compose.prod.yml down -v
npm run docker:prod:up
```

Pozor: `down -v` smaže data volume.

---

## 14. FINIS dokumenty

Pro finální nasazení na VPS a go-live kontrolu použij také:

- `docs/FINIS-DEPLOY-VPS.md`
- `docs/FINIS-GO-LIVE-CHECKLIST.md`
- `docs/P-advanced-calculator-vzt-voda-topeni.md`
- `docs/Q-project-gps-chat-gallery.md`
- `docs/R-invoice-automation-and-3d-module.md`
- `docs/S-attendance-gps-and-daily-log-media.md`

## 15. Shrnutí

### DEV režim

```bash
npm install
npm run env:init
docker compose up -d postgres
npm run db:setup:new
npm run dev
```

### FINÁLNÍ docker režim

```bash
cp .env.production.example .env
npm run docker:prod:up
```

### Přihlášení

```text
owner@platform.local
PlatformOwner2026!
```

Tohle je aktuálně nejkratší cesta k finálnímu rozběhu celé appky včetně DB, seedů, backendu, frontendu a přihlašovacího účtu majitele platformy.
