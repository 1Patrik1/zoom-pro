# Zoom Pro — kompletní instalace jako nová aplikace

Datum revize: **2026-08-22** · verze **1.2.0** (web + backend + mobile + distribuce + AI)

Tento návod tě provede instalací **od nuly** na čistý stroj (Linux / macOS / Windows / Termux) i kontejnerovým nasazením přes Docker. Nemusíš znát nic mimo `node` a `git`.

---

## Obsah balíčku

```
zoom-pro/
├─ apps/
│  ├─ backend/          # Node.js + Express + PostgreSQL
│  ├─ frontend/         # React 18 + Vite + Tailwind (web PWA)
│  └─ mobile/           # Capacitor 6 + React (Android/iOS/PWA)
├─ 001…014_*.sql        # 14 DB migrací (schema, seedy, upgrades)
├─ scripts/
│  ├─ install.sh                    # ★ jednotný instalátor pro Linux/macOS
│  ├─ install.ps1                   # ★ Windows PowerShell instalátor
│  ├─ doctor.mjs                    # ★ diagnostika prostředí
│  ├─ db-run-sql.mjs                # aplikace SQL migrací
│  ├─ db-migrate-all.mjs            # ★ automatické spuštění všech 14 migrací
│  ├─ seed-distribution.mjs         # ★ seed katalogu + dodavatelů + ceníků
│  └─ termux/                       # skripty pro Android/Termux
├─ docker-compose.yml               # jen postgres (pro dev)
├─ docker-compose.prod.yml          # postgres + backend + nginx frontend
├─ .env.example                     # ★ šablona pro root .env
└─ INSTALL.md                       # tento návod
```

---

## Předpoklady

| Nástroj    | Verze  | Instalace |
|-----------|--------|-----------|
| Node.js    | ≥ 20   | https://nodejs.org  |
| PostgreSQL | 15/17  | https://postgres.org  · nebo Docker |
| Git        | ≥ 2.30 | https://git-scm.com  |
| Docker     | volitelně (produkce) | https://docs.docker.com/get-docker |

Pro mobilní build navíc: Android Studio (Android), Xcode (iOS – jen macOS).

---

## Rychlá instalace (Linux / macOS / WSL) — 5 kroků

```bash
# 1) klonuj / rozbal balík
git clone <repo> zoom-pro && cd zoom-pro
# nebo: unzip zoom-pro-installer.zip -d zoom-pro && cd zoom-pro

# 2) spusť jednotný installer (spustí doctor + npm install + DB + seedy)
bash scripts/install.sh

# 3) start dev serverů (dvě konzole nebo jedním příkazem)
npm run dev

# 4) otevři v prohlížeči
#    http://localhost:5173

# 5) přihlas se demo účtem:
#    owner@platform.local  ·  PlatformOwner2026!
```

Instalátor se zeptá na:
- **DATABASE_URL** (default `postgresql://USER:CHANGE_ME@localhost:5432/DB_NAME?schema=public`),
- **JWT_SECRET** (default náhodně vygenerovaný),
- **GEMINI_API_KEY** (volitelně — bez klíče AI funkce vrátí offline hlášku).

## Rychlá instalace (Windows PowerShell)

```powershell
cd zoom-pro
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
npm run dev
```

## Rychlá instalace (Android / Termux)

```bash
pkg install -y git nodejs-lts postgresql
git clone <repo> && cd zoom-pro
bash scripts/termux/install.sh
```

## Rychlá instalace (Docker produkce)

```bash
cp .env.example .env      # uprav si hesla + JWT_SECRET
npm run docker:prod:up
# → aplikace na http://<server>:80, backend na :5000
```

---

## Krok za krokem (bez installeru)

### 1. Instalace balíčků

```bash
npm install
```

Nainstaluje web frontend + backend (jsou v npm workspace). Mobilní app má vlastní adresář:

```bash
cd apps/mobile
npm install
cd ../..
```

### 2. Vytvoření .env souborů

```bash
# root
cp .env.example .env
# backend
cp apps/backend/.env.example apps/backend/.env
# frontend
cp apps/frontend/.env.example apps/frontend/.env
# mobile
cp apps/mobile/.env.example apps/mobile/.env   # jen pokud existuje
```

Uprav minimálně `DATABASE_URL` a `JWT_SECRET`.

### 3. Databáze

**Varianta A: lokální PostgreSQL**
```bash
sudo -u postgres createuser -s vzt_user
sudo -u postgres createdb -O vzt_user vzt_system
sudo -u postgres psql -c "ALTER USER vzt_user WITH PASSWORD 'vzt_pass';"
```

**Varianta B: Docker**
```bash
docker compose up -d postgres
```

### 4. Migrace + seedy

Jedním příkazem spustí všech 14 migrací + platform superadmin + demo data:

```bash
npm run db:setup:full
```

Nebo ručně po částech (viz `package.json` sekce `db:*`).

### 5. Start dev serverů

```bash
npm run dev              # frontend + backend paralelně
# nebo samostatně:
npm run dev:backend
npm run dev:frontend
```

### 6. Mobilní build

```bash
cd apps/mobile
npx cap add android      # jednou
npm run android:apk      # → android/app/build/outputs/apk/debug/app-debug.apk
```

Pro iOS: `npx cap add ios && npm run cap:ios`.

---

## Ověření (doctor)

```bash
node scripts/doctor.mjs
```

Zkontroluje:
- Node ≥ 20, npm dostupné
- PostgreSQL se dá připojit z `DATABASE_URL`
- všechny SQL migrace existují a jdou zparsovat
- backend `/health` odpovídá `{ok:true}`
- frontend build funguje

---

## Přihlašovací údaje (po `db:seed:platform`)

| Role        | E-mail                   | Heslo               |
|-------------|--------------------------|---------------------|
| SUPERADMIN  | owner@platform.local     | PlatformOwner2026!  |
| REDITEL     | reditel@demo.local       | Demo2026!           |
| VEDOUCI     | vedouci@demo.local       | Demo2026!           |
| MONTER      | monter@demo.local        | Demo2026!           |

Změň hesla ihned po instalaci v **Team → uživatel → reset hesla**.

---

## Řešení běžných problémů

**„Missing required environment variable: DATABASE_URL"**
→ Backend se spouští bez `.env`. Zkopíruj `apps/backend/.env.example` do `apps/backend/.env`.

**Migrace 013 selže na `role_enum` / `Permission.code`**
→ Musíš mít nejdřív aplikované migrace 001–012. Použij `npm run db:migrate:all`.

**Frontend vidí `Network Error` u `/api/*`**
→ Zkontroluj CORS v `apps/backend/.env`:
```
CORS_ORIGIN=http://localhost:5173,capacitor://localhost,https://localhost
```

**Mobilní app hlásí offline i s Wi-Fi**
→ Zkontroluj `Server URL` v LoginScreen (`https://api.zoom-pro.app` je default, nastav si vlastní).

**Gemini AI vrací „offline"**
→ Doplň `GEMINI_API_KEY` do `apps/backend/.env` nebo přes UI **Platforma → Gemini AI klíč**.

---

## Struktura přihlášení + first-run flow

1. Otevřeš `http://localhost:5173`
2. LoginPage → přihlásíš se
3. Backend vrátí JWT → uloží se do `localStorage`
4. Frontend zavolá `/api/sync` a natáhne data
5. AppShell zobrazí sidebar (rolovací) podle role
6. První kliknutí na **AI AutoDetect / Distribuce** aktivuje moduly

---

## Nasazení na produkci

Viz `docker-compose.prod.yml` — spustí:
- `postgres:17` s persistent volume
- `zoom-pro-backend` (Node)
- `nginx` s frontend + reverzní proxy pro `/api`

```bash
cp .env.example .env
# uprav JWT_SECRET a hesla
npm run docker:prod:up
```

Pro Cloudflare Tunnel viz `deploy/windows/README-WINDOWS-ZOOM-PRO-APP.md`.

---

## Následující kroky

Po úspěšném spuštění:
1. **Nastavení → Firma** — vyplň IČO, DIČ, kontakty.
2. **Distribuce → Katalog** — importuj / zadej SKU (nebo použij seed).
3. **Distribuce → Dodavatelé** — přidej dodavatele.
4. **Licence** — vyber tarif (START/STANDARD/PRO/ENTERPRISE).
5. **Platforma → Gemini AI klíč** — pro AI funkce.
6. Vygeneruj APK z `apps/mobile` a rozdej montérům.
