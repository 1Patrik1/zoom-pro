# Zoom Pro — audit novinek a dokumentace (2026-10-24)

## Rozsah a zdroj

Kontrola veřejného repozitáře [1Patrik1/zoom-pro](https://github.com/1Patrik1/zoom-pro), výchozí větev `main`, commit `03329f4b8309640881c52893443c76ae2933e589` (poslední commit na větvi: 2026-10-19). Rekurzivní strom obsahoval 639 položek a 32 souborů Markdown. Prohlédnuty byly všechny Markdown soubory; změny dokumentace v této větvi opravují zastaralé odkazy na migrace a přidávají tento audit. Databáze, kód aplikace a migrace nebyly spuštěny ani změněny.

## Co je nového a již je v main

- **Mobilní offline fronta — bezpečnostní oprava (PR #64, 18. 10.):** nové položky se vážou k ID přihlášeného uživatele; bearer token se před uložením i přehráním odstraňuje; bez ověřeného vlastníka se položka nezařadí. Staré položky bez vlastníka nebo od jiného uživatele jsou blokované a zachované k ruční kontrole.
- **Normalizace vlastníka (PR #66, 18. 10.):** helper vrací normalizované ID, ne původní hodnotu s mezerami. Mobilní unit testy jsou součástí CI.
- **SQL migrace 021:** ve stromu `main` je `021_notifications.sql`; starší návody končily migrací 020. Přítomnost souboru nepotvrzuje aplikaci na produkční databázi.
- **Závislost geolokace:** main aktualizoval `@transistorsoft/capacitor-background-geolocation` na 9.7.0 (PR #45), zatímco aplikace používá Capacitor 6. Doporučuji ověřit nativní Android/iOS build a běh geolokace před jakoukoli další změnou této oblasti.

## Aktuální provozní signály

- Poslední pět dostupných běhů workflow **Zoom-pro availability monitor** selhalo. Kontrola detailu běhu z 24. 10. ukazuje, že selže krok vyžadující repository variable `ZOOM_PRO_HEALTH_URL`; samotný endpoint se proto vůbec netestuje. To není důkaz výpadku aplikace. Po nastavení veřejné HTTPS URL na `/health` lze monitor teprve považovat za funkční.
- Otevřené Dependabot PR #69 (React 19), #71 (Capacitor Toast 8) a #72 (biometrické ověřování 10) obsahují hlavní verze a nejsou nízkorizikové při současném React 18 / Capacitor 6. PR #70 aktualizuje bcryptjs 2.x na 3.x; i ten vyžaduje kompatibilitní ověření. V tomto auditu nebyly sloučeny ani aplikovány.
- Kód a CI nebyly z tohoto prostředí spuštěny; poslední ověřený commit CI není důkazem aktuálního produkčního stavu. Žádná kontrola tajemství, živé DB, domény ani skutečného nasazení nebyla provedena.

## Doporučení bez rizika pro stávající aplikaci

1. Ponechat React 18 a Capacitor 6, dokud oddělená větev neprokáže build, mobilní synchronizaci, biometriku, push a testy pro daný major upgrade.
2. Nastavit `ZOOM_PRO_HEALTH_URL` na veřejný HTTPS health endpoint; jde o konfiguraci monitoru, ne o změnu aplikačního kódu.
3. Při příštím mobilním vydání ověřit scénáře offline → přihlášení jiným účtem, odhlášení během fronty, legacy položka bez owner ID a odstranění tokenů z uložených options. Stávající oprava tyto případy blokuje, ale produkční data nebyla prověřena.
4. Migraci 021 aplikovat až standardním migrátorem po záloze a úspěšné CI; tato kontrola migraci nespouštěla.
5. Zachovat starší audity jako datované záznamy. Dokumenty, které popisují historické postupy či návrhy, nebyly přepsány na současná fakta; do jejich navigace byly doplněny odkazy na tento audit.

## Markdown soubory prošlé při kontrole

Celkem 32 souborů:

- `.vs/scripts/termux/README-TERMUX.md`
- `AI-IMPLEMENTATION-MASTER-PLAN.md`
- `AUDIT.md`, `GEMINI.md`, `INSTALL.md`, `README-AI-INSTRUCTIONS.md`, `README-FIX-CZ.md`, `README.md`, `README_UPDATE_BUNDLE_CZ.md`, `SETUP-CLOUDFLARE-WINDOWS.md`, `copilot-instructions.md`
- `apps/mobile/README.md`
- `deploy/cloudflare/README-CLOUDFLARE-GITHUB-DEPLOY.md`, `deploy/windows/README-WINDOWS-ZOOM-PRO-APP.md`
- `docs/AKTUALIZACE-2026-10-11.md`, `docs/ARCHITEKTURA-PWA-APP.md`, `docs/FINIS-DEPLOY-VPS.md`, `docs/FINIS-GO-LIVE-CHECKLIST.md`, `docs/I-frontend-refactor-plan.md`, `docs/J-api-contracts.md`, `docs/K-backend-module-map.md`, `docs/L-frontend-pages-documents-imports-exports-signatures.md`, `docs/LOCKFILE-AUDIT-FIX-TRIGGER.md`, `docs/NOTIFICATIONS-SETUP.md`, `docs/P-advanced-calculator-vzt-voda-topeni.md`, `docs/Q-project-gps-chat-gallery.md`, `docs/R-invoice-automation-and-3d-module.md`, `docs/REPOSITORY-AUDIT-2026-10-18.md`, `docs/ROADMAP.md`, `docs/S-attendance-gps-and-daily-log-media.md`, `docs/VZT-CALCULATORS-AND-ALERTS-ROADMAP.md`
- `misc-legacy/README.md`
- `scripts/termux/README-TERMUX.md`

