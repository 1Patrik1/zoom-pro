# Zoom Pro — Kompletní audit projektu

Revize: **2026-08-22** · verze **1.2.0**

## Souhrn

| Vrstva | Stav | Poznámka |
|---|---|---|
| **Backend (Node + Express)** | ✅ | 25 routes, 23 services, 6 middleware, 3 utils, syntaxe OK |
| **Databáze (PostgreSQL)** | ✅ | 14 migrací aplikováno, 57 public tabulek, 104 Permission řádků |
| **Frontend web (React + Vite)** | ✅ | 20 feature modulů, rolovací sidebar, PWA ready |
| **Mobilní app (Capacitor + React)** | ✅ | 15 obrazovek, 11 lib modulů, Android + iOS + PWA |
| **AI (Gemini)** | ✅ | Chat, troubleshoot, AutoDetect (Vision) |
| **Distribuce & nákup** | ✅ | Katalog, dodavatelé, ceníky, RFQ, PO, AP |
| **Licensing (SaaS)** | ✅ | 4 tarify + moduly + platform admin |
| **Instalátory** | ✅ | Linux/macOS + Windows + Termux + Docker |
| **Doctor & migrátor** | ✅ | Idempotentní, baseline pro existující DB |

## Inventář

### Backend (25 routes / 23 services)

Routes: `assistant`, `attendance`, `auth`, `autodetect`, `collisions`, `devices`,
`distribution`, `documents`, `exports`, `gemini`, `imports`, `inventory`, `invoices`,
`licensing`, `logs`, `monter-invoices`, `print`, `projects`, `saas`, `settings`,
`signatures`, `sync`, `troubleshooting`, `users`, `vzt`.

Services: stejné pokrytí + navíc `auth` service.

Middleware: `async-handler`, `auth`, `error-handler`, `require-capability`,
`role-guard`, `validate-request`.

### Databáze — 14 migrací

| # | Soubor | Obsah |
|---|---|---|
| 001 | initial_schema | Core tabulky (Company, User, Project, Attendance, Log, …) |
| 002 | seed_permissions | Standardní permissions + role |
| 003 | seed_default_module_settings | Výchozí nastavení modulů |
| 004 | upgrade_legacy_in_place | Migrace ze staré verze |
| 005 | seed_platform_superadmin | owner@platform.local |
| 006 | seed_demo_profiles_and_records | Demo firma + 3 účty |
| 007 | project_geo_and_gallery | GPS, radius, galerie |
| 008 | invoice_automation_and_permissions | Auto faktury |
| 009 | attendance_geo_guard_and_log_media | Geo-guard, přílohy |
| 010 | collisions_and_qr_labels | Kolize, QR |
| 011 | zoom_pro_licensing | Licence, tarify |
| 012 | monter_invoices | Výkazy montérů |
| 013 | distribution_platform | Katalog, dodavatelé, RFQ, PO, AutoDetect |
| 014 | mobile_devices | Push registrace |

### Frontend (20 feature modulů)

Assistant, Attendance, AutoDetect, Collisions, Daily-log, **Distribution** (5 tabů),
Documents, Exports, Imports, Inventory, Invoices, **Licensing** (2 stránky),
Print, Projects, Reports, Settings, Signatures, Team, Troubleshooting, VZT.

### Mobilní app (39 souborů)

Screens: Home, Login, Attendance, DailyLog, AutoDetect, Invoices, Projects,
Scanner, Inclinometer, Signature, OfflineMaps, Watch, Diagnostics, Sync, Settings.

Lib: api, biometric, exif, geofence, inclinometer, media, offlineMaps,
push, scanner, storage, voice.

### Scripts

- `scripts/install.sh` — jednotný Linux/macOS instalátor
- `scripts/install.ps1` — Windows PowerShell instalátor
- `scripts/doctor.mjs` — diagnostika prostředí
- `scripts/db-run-sql.mjs` — spuštění konkrétních migrací
- `scripts/db-migrate-all.mjs` — auto-migrátor s baseline
- `scripts/init-env.mjs` — inicializace .env
- `scripts/seed-distribution.mjs` — seed katalogu (16 SKU + 5 dodavatelů + 10 cen)
- `scripts/termux/` — install / run-backend / run-frontend / github-sync

## Ověření (doctor běh)

```
✅ Node.js 20.20.2 (>=20)
✅ 14/14 migrací
✅ DB připojení OK (57 tabulek, 104 Permission)
✅ .env obsahuje DATABASE_URL, JWT_SECRET, CORS_ORIGIN
⚠ GEMINI_API_KEY (volitelné pro AI)
⚠ apps/mobile/node_modules (spustí se v mobile buildu)
=== 0 chyb, 2 varování ===
```

## Kompatibilita

- **Node.js** ≥ 20 (testováno na 20.20.2)
- **PostgreSQL** 15/16/17
- **Android** 8+ (API 26) — Capacitor 6
- **iOS** 13+ — Capacitor 6
- **Prohlížeče** Chrome 100+, Safari 15+, Firefox 100+ (PWA)

## Bezpečnost — checklist před produkcí

- [ ] Změň `JWT_SECRET` v `apps/backend/.env` (instalátor generuje náhodný)
- [ ] Změň heslo `owner@platform.local`
- [ ] Nastav CORS_ORIGIN jen na produkční doménu
- [ ] Zapni HTTPS (Cloudflare Tunnel / nginx + Let's Encrypt)
- [ ] Zálohuj DB (`docker exec zoom-pro-postgres pg_dump ...`)
- [ ] Uzavři port 5432 firewallem
- [ ] `TRUST_PROXY=true` když jsi za reverzní proxy
