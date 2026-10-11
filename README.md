# Zoom Pro

Multifiremní provozní aplikace pro projekty, docházku, stavební deník, sklad, VZT kalkulace, fakturaci, dokumenty, import/export, podpisy a správu licencí.

## Aktuální struktura

- `apps/frontend` — React webová aplikace / PWA.
- `apps/backend` — Node.js + Express API.
- `apps/mobile` — Capacitor aplikace pro Android/iOS.
- `schema.prisma` a kořenové SQL soubory `001_*.sql` až `020_*.sql` — schéma a migrace.
- `docs/` — instalační, provozní a modulové návody.

## Rychlý lokální start

Požadavky: Node.js 20+, npm a PostgreSQL 15+ (nebo Docker Compose).

```bash
npm install
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
docker compose up -d postgres
npm run db:migrate:all
npm run dev
```

Web běží na `http://localhost:5173`, API na `http://localhost:5000`. Nastavte vlastní `DATABASE_URL` a silné `JWT_SECRET`; nepoužívejte demo účet v produkci.

## Migrace

`npm run db:migrate:all` je hlavní migrátor pro novou i existující databázi. Načte kořenové očíslované SQL soubory ve vzestupném pořadí, eviduje je v `_migrations` a u rozpoznané starší databáze zavede baseline. Nové migrace přidávejte jako další idempotentní soubor `NNN_nazev.sql`; produkční Docker spouští tentýž migrátor před backendem.

```bash
npm run db:migrate:all
npm run db:backup
```

Migrátor při skutečné chybě skončí s nenulovým návratovým kódem. Pro ruční jednorázové SQL použijte `scripts/db-run-sql.mjs`; ten nevede evidenci `_migrations` a není náhradou hlavního migrátoru.

## Funkční oblasti

- Projekty mají vlastní chat; chat podpory sdílí konverzace firem se SUPERADMINem.
- Změny účtů zahrnují jméno, příjmení, telefon a e-mail; registrace firem a členů podporují požadované firemní údaje.
- FCM push lze posílat na registrovaná mobilní zařízení pro projektové zprávy, chat podpory, žádosti o licenci a nové registrace.
- Nastavení alarmu umožňuje volbu melodie ve webu i v mobilu.
- SUPERADMIN má v Platformě přípravný panel platební brány. Zatím ukládá jen bezpečné předvolby; checkout, webhooky a automatické platby/licence nejsou implementované.

## Push notifikace

Backend potřebuje `FCM_PROJECT_ID` a `FCM_SERVICE_ACCOUNT_JSON`; v Docker produkci se proměnné předávají z root `.env`. Mobilní aplikace navíc potřebuje nativní Firebase/Apple Push konfiguraci a uživatel musí povolit oznámení. PWA/web push není tímto nastavením zprovozněn. Viz [mobilní návod](apps/mobile/README.md) a [produkční checklist](docs/FINIS-GO-LIVE-CHECKLIST.md).

## Platební brána

Panel v **Platforma → Platební brána** umí uložit předvolbu poskytovatele, prostředí a měny do `PlatformSetting`. Migrace `020_payment_gateway_settings.sql` vloží bezpečné výchozí nastavení. Pro reálné platby je ještě třeba zvolit poskytovatele a doplnit jeho serverovou integraci včetně ověřování webhooků. Platební tajemství se nesmějí ukládat do `PlatformSetting` ani commitovat do Git.

## Dokumentace

- [Instalace](INSTALL.md)
- [Architektura](docs/ARCHITEKTURA-PWA-APP.md)
- [Nasazení na VPS](docs/FINIS-DEPLOY-VPS.md)
- [Go-live checklist](docs/FINIS-GO-LIVE-CHECKLIST.md)
- [Přehled funkcí a migrací](docs/AKTUALIZACE-2026-10-11.md)
- [Historický audit](AUDIT.md) — původní auditní čísla jsou časový snímek a nemusí odpovídat dnešnímu provozu.
