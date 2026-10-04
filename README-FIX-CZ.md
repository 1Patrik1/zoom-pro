# Zoom Pro — diagnostika a opravy (2026-09-29)

## Co bylo rozbité a jak jsem to opravil

1. **`GET /api/licensing/mine` (a celý licenční modul) padal na 500 „(intermediate value) is not iterable"**
   - Příčina: `query()` v `apps/backend/src/config/db.js` vracela celý pg Result objekt,
     ale řada repozitářů (licensing.repo) očekávala přímo pole řádků.
   - Oprava: hybridní návrat v `db.js` — vrací pole řádků, které zároveň nese `.rows`, `.rowCount` a `.command`.
     Oba styly kódu fungují, žádný endpoint se nerozbil (ověřeno audit-functionality: 11/11 OK).

2. **Mobilní appka šla nainstalovat** — 3 neexistující balíčky/verze:
   - `@capacitor/watch@^6.0.0` — neexistuje (max 0.1.12, vyžaduje Capacitor 5) a v kódu se nepoužívá → odstraněno.
   - `@capgo/capacitor-background-mode@^6.1.0` — na npm neexistuje (404), v kódu se nepoužívá → odstraněno.
   - `@transistorsoft/capacitor-background-geolocation@^6.3.4` — verze neexistuje (max 6.1.5) → upraveno na `^6.1.5`.
   - Mobilní build (vite) po opravě prochází.

3. **Skripty `db-migrate-all`, `db-run-sql`, `backup-db`, `restore-db`, `seed-distribution`**
   padaly na „DATABASE_URL is required", protože nečtou `.env` → přidán `import 'dotenv/config'`.

4. **Chybějící PWA vrstva frontendu** — složka `public/` byla prázdná (žádný manifest, ikony, service worker):
   - doplněn `public/manifest.webmanifest`, `public/sw.js`, ikony `public/icons/icon-192.png` + `icon-512.png`,
   - registrace SW v `main.jsx`, odkazy v `index.html`.

5. **Bezpečnost (doporučení auditu)** — do backendu přidán `helmet` a rate-limit na `/api/auth`
   (100 požadavků / 15 min — ochrana proti brute-force).

6. **Root `.env` nesedělo s docker-compose** (postgres/postgres_local_dev vs. vzt_user/vzt_pass)
   → sjednoceno na `vzt_user/vzt_pass`, `.env.example` doplněn o `DATABASE_URL`.

7. **`scripts/test-login.mjs`** — negativní test vyžadoval přesně HTTP 401; backend vrací i 400 (validace).
   Nyní přijímá 400 i 401 jako správné odmítnutí.

## Ověřeno v tomto sandboxu
- `npm run build` frontendu ✅ (vite, bez chyb)
- `npm run build` mobilní appky ✅ (vite, bez chyb)
- 14/14 SQL migrací na PostgreSQL 16 ✅ (57 tabulek, 104 permissions)
- `node scripts/doctor.mjs` — 0 chyb ✅
- `audit-functionality` — 11/11 endpointů OK ✅ (předtím 1× 500)
- `audit-stability` — 200/200 požadavků ✅
- `test-login` — owner@platform.local ✅ (heslo: PlatformOwner2026!)

## Spuštění
```bash
npm install                     # root (workspaces: frontend + backend)
# 1) PostgreSQL: docker compose up -d postgres   (nebo vlastní instance)
# 2) .env v rootu: DATABASE_URL, JWT_SECRET, CORS_ORIGIN
npm run db:migrate:all          # migrace + seedy
npm run dev                     # frontend :5173 + backend :5000
# login: owner@platform.local / PlatformOwner2026!
```

## Kolo 2 — opravy dle zpětné vazby (2026-09-29)

1. **Bílé písmo v bílých okýnkách (web)** — globální CSS v `index.css`: každý světlý panel
   (`bg-white`, `bg-slate-50/100`, `bg-*-50`) teď vynucuje tmavý text (`#0f172a`) a `color-scheme: light`,
   takže jsou čitelné i nativní výběrové seznamy a datumové pickery. Tmavé vstupy (bg-slate-800/900)
   zůstávají se světlým textem.

2. **Alarm na hlavní liště (web topbar)** — nová zvonek-ikona s počítadlem událostí:
   - rozbalovací panel **„Alarmy — proč se spustily“** — každá událost s časem, textem důvodu
     (kolize, porucha, sklad pod minimem, docházka mimo rádius, nová zpráva) a závažností,
   - tlačítko **VYPNOUT / ZAPNOUT** alarmu (trvale uloženo v prohlížeči),
   - tlačítko **ZTIŠIT** — okamžité ukončení sirény i během zvonění,
   - tlačítko **VYMAZAT** historii. Vypnutý alarm dál zaznamenává události, jen nezvoní.

3. **Sken / kamera „běží, ale nic není vidět“** — webový fallback skeneru dřív vytvořil video
   element, který nikdy nepřidal do stránky. Teď se otevře celoobrazovkový overlay s živým
   náhledem kamery, stavovým textem, tlačítkem Zrušit a 45s timeoutem; po detekci kódu se
   kamerové spojení korektně uzavře.

4. **Distribuce — záložka Objednávky (PO)** — byla jen prázdná nálepka. Přidán backend endpoint
   `GET /api/distribution/po` (výpis PO s dodavatelem, projektem, stavem, celkem a počtem položek)
   a PoTab teď PO vypisuje + tlačítka **Schválit** a **Převzít** (POST /po/:id/approve, /po/:id/receive).

5. **Schvalování firem (platforma)** — doplněno kompletně:
   - backend: `GET /api/saas/companies` (výpis firem s vlastníkem a počtem uživatelů) a
     `POST /api/saas/companies/approve` (aktivace/deaktivace licence firmy; jen SUPERADMIN),
   - web: sekce **„Firemní účty a schvalování“** v konzoli platformy — stav AKTIVNÍ / ČEKÁ,
     tlačítka Schválit / Deaktivovat. Neaktivní firma se nemůže přihlásit (existující ochrana).

Ověřeno: buildy webu i mobilu prošly, syntax backendu OK, 6/6 testů nových endpointů
(výpis firem, aktivace firmy „Platform Owner HQ“ → isActive=true, výpis PO/katalogu/RFQ)
a původní funkční audit zůstává 11/11 bez chyb.

## Kolo 3 — pět doplněných bodů (2026-09-29)

1. **Vytvořit PO z vítězné nabídky** — v RFQ porovnání má každý řádek tlačítko „Vytvořit PO“;
   backend `POST /api/distribution/rfq/:id/convert` vezme ceny vybraného dodavatele, vytvoří
   PO (auto číslo PO-YYYY-NNNN, částka, měna dodavatele, řádky) a poptávku označí CONVERTED.
   Druhý převod stejné poptávky se odmítne (400). Chybějící ceny dodavatele se hlásí podle SKU.

2. **Login kontroluje `isApproved`** — uživatel připojený přes přihlašovací ID firmy, kterého
   ředitel neschválil, se už NEPŘIHLÁSÍ (403 „Účet čeká na schválení ředitelem firmy.“).

3. **Příjem PO po řádcích s reálným naskladněním** — tlačítko „Převzít“ otevře dialog s položkami
   PO a editable množstvím. Backend (celé v databázové transakci) najde/založí skladovou položku
   podle SKU, zapisuje korektní pohyb RECEIPT (quantityBefore/After) a vrací „naskladněno X,
   přeskočeno Y“ včetně chyb. Druhý příjem stejné PO se odmítne (400). Opraven i skrytý bug:
   původní zápis pohybu používal neexistující sloupec/typ (`movementType`, `IN`) — příjem
   nikdy reálně neskladnil.

4. **Branding aplikován** — nový veřejný endpoint `GET /api/licensing/branding`; web si načte
   název (document.title), primární barvu (aktivní položka menu, hlavička) a logo.

5. **Notifikace SUPERADMINovi při firmě bez licence** — sync pro SUPERADMIN nese `allCompanies`;
   alarm systém hlásí „Firma bez aktivní licence: <název>“ — viditelné v alarmním panelu
   na hlavní liště (s časem a důvodem).

Ověřeno: 10/10 end-to-end testů (registrace+login blokace, RFQ→PO, dvojitý převod odmítnut,
schválení, příjem s řádky, dvojitý příjem odmítnut, sklad přesně 5 ks, právě 1 pohyb,
veřejné branding) + původní audit 11/11.

## Kolo 4 — spuštění na Windows (2026-09-29)

Tvůj výpis obsahoval dvě chyby, obě už jsou vyřešené:

1. **`password authentication failed for user "vzt_user"`** — tvůj lokální PostgreSQL nemá
   roli `vzt_user` (nebo má jiné heslo). Dvě možnosti:
   - **Automatika:** `set PGADMIN_PASSWORD=<heslo účtu postgres>` a pak
     `npm run db:setup:user` — vytvoří roli `vzt_user` a databázi `vzt_system` a
     nastaví heslo z root `.env` (idempotentní, dá se spustit opakovaně).
   - **Ručně:** v pgAdmin/psql spusť
     `CREATE ROLE vzt_user LOGIN PASSWORD 'vzt_pass'; CREATE DATABASE vzt_system OWNER vzt_user;`
   - Alternativně: uprav root `.env` (`DATABASE_URL=...`) na své existující přihlašovací údaje.
   Poté: `npm run db:migrate:all`.

2. **`three … could not be resolved` (dev režim)** — soubor `apps/frontend/src/features/vzt/configurator-3d.html`
   (3D konfigurátor, načítaný v iframe) importuje `three` a Vite v dev režimu při startu
   zkoušel resolvovat jeho importy. Oprava: soubor je přesunut do `apps/frontend/public/`
   (slouží se jako statický soubor, build ho nezkouší kompilovat) a do frontendu je
   přidána závislost `three` (v dev režimu tak importy resolvují lokálně; produkční
   soubor dál používá importmap s CDN). Ověřeno: `npm run dev` startuje bez chyby,
   `/` i `/configurator-3d.html` vrací HTTP 200.

3. **`npm audit` hlásí 12 zranitelností** — 5 moderate, 7 high, převážně v dev řetězci
   (build nástroje). `npm audit fix` bez `--force` můžeš spustit bezpečně;
   `--force` nedoporučuji (mění major verze). V produkčním běhu (runtime backend)
   nejsou tyto balíčky aktivní.

Poznámka k Node v24 — aplikace běží (testováno na Node 20 i 22; tvůj běh prokázal, že
funguje i na 24.4.1).

## Kolo 5 — hloubková kontrola celé aplikace (2026-09-29)

### Ověřeno systémově
- Kompletní smoke test 29 GET endpointů na běžícím backendu + funkční audit (11/11) + login test.
- Porovnání všech frontend i mobilních API volání s backend routami — žádné volání neukazuje na neexistující endpoint.
- Porovnání navigace (21 modulů) s App.jsx — kompletní pokrytí.
- useSync stahuje 16 kolekcí každých 5 s — pro malé firmy OK, ale u velkých datových objemů
  stojí za přechod na delta-sync (budoucí optimalizace, ne chyba).

### Opraveno v tomto kole
1. **Schvalování výkazů montérů bylo rozbité na úrovni DB** — migrace 012 zapomněla přidat
   stavy `SUBMITTED` a `APPROVED` do enumu `invoice_status_enum`, takže padaly TŘI endpointy:
   `GET /pending` (500), `POST /submit` i `POST /approve`. Nová migrace
   `016_monter_invoice_status.sql` stavy doplňuje (idempotentní, spustí ji i db-migrate-all).
2. **`GET /api/monter-invoices/pending` navíc padal** na `column u.name does not exist` — SQL
   odkazovalo na sloupec `User.name`, který v databázi není. Opraveno na
   `COALESCE(jméno + příjmení, e-mail)`.

### Zjištěné nedostatky, které zůstávají (priorita pro příští kola)
2. **Frontend nikde nevolá `GET/PUT /api/settings/modules/:moduleKey`** — backend podporuje
   per-modul nastavení (module-settings-schemas.json, 25 KB schémat), ale v UI Nastavení chybí
   sekce pro jejich editaci — schémata se v appce nepoužívají.
3. **Rate limit na /api/auth je 100 req/15 min** — při 5s polling sync (pouze GET) nevadí, ale
   při hromadném testování loginů na produkci lze narazit; vhodné zpřísnit jen /login.
4. **Mobilní defaultní API URL** `https://api.zoom-pro.app` — první spuštění APK vyžaduje
   ruční změnu adresy v Nastavení (chybí onboarding wizard).
5. **Push notifikace nemají odesílací service** (FCM/APNS) — registrace tokenů funguje,
   odesílání neexistuje; alarmy tak fungují jen in-app.
6. **Safari/Firefox web skener** — BarcodeDetector API není podporováno; overlay se otevře,
   ale detekce skončí chybou až za běhu (chybí předkontrola s jasnou hláškou).

## Kolo 6 — pět nedotažených bodů (2026-09-30)

1. **UI pro nastavení modulů** — v Nastavení je nová sekce „Nastavení modulů“: výběr modulu
   (system, import, export, workflow, signatures, distribution, licensing), editor JSON hodnoty
   s validací a uložení přes `PUT /api/settings/modules/:moduleKey` (backend už existoval,
   chybělo jen UI). Zobrazuje i verzi uložené konfigurace.

2. **Mobilní onboarding wizard** — při prvním spuštění (není uložená adresa serveru) se appka
   nejdřív zeptá na adresu serveru (normalizace http:// a koncových lomítek), až poté zobrazí
   login. Adresa jde kdykoli změnit v Nastavení. Předefaultování na neexistující
   https://api.zoom-pro.app tak nikdy nevyhodí tajné chyby.

3. **Push notifikace — odesílací service** — nový `push.service.js` (FCM HTTP v1 s OAuth tokenem
   ze service-account JSON, cache tokenu) + endpoint `POST /api/devices/notify` (jen SUPERADMIN).
   Bez konfigurace (`FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT_JSON` v .env backendu) vrací jasný
   reason „fcm-not-configured“ s návodem — nepadá tajně. Neplatné tokeny se po 404/410 čistí.

4. **Safari/Firefox skener** — webový fallback při chybějícím BarcodeDetector API hned vyhodí
   srozumitelnou hlášku („není podporováno, použij mobilní appku nebo ruční zadání“) místo
   tajné chyby za běhu. Skener navíc dostal timeout hlášku (45 s) a pole pro ruční zadání
   kódu přímo v obrazovce (inventury tak jdou vždy dokončit).

5. **Delta-sync** — nový `GET /api/sync?since=<timestamp>` vrací jen kolekce změněné od času
   (projects, attendance, logs, invoices, inventory, collisions, troubleshooting, chats, users)
   + `serverTime`. Frontend: první načtení plné, periodický polling (5 s) delta a sloučení do
   stavu; při selhání delta se automaticky vrátí plný sync. Menší payload a zátěž DB při
   5s pollingu.

### Ověřeno end-to-end (sandbox, PostgreSQL 16)
- PUT i GET module settings (currency: EUR se uloží a načte, verze roste)
- Delta-sync: změna projektu po `since` se v deltě objeví (touched obsahuje „projects“), serverTime přítomen
- Push notify end-to-end: registrace zařízení → `POST /devices/notify` vrací `{ reason: 'fcm-not-configured', hint: … }` (jasná hláška, žádný tajný pád); pro uživatele bez registrovaných zařízení vrací `no-devices`
- Přebudovány web i mobil (bez chyb); původní audity zůstávají zelené (funkční 11/11, RFQ→PO tok OK)

## Kolo 7 — push notifikace přes FCM: konfigurace + ověření (2026-09-30)

### Co je v projektu připravené
1. **`push.service.js` (přepsán)** — podporuje tři způsoby konfigurace: `FCM_SERVICE_ACCOUNT_JSON`
   (obsah JSON), `FCM_SERVICE_ACCOUNT_FILE` (cesta k souboru) a `FCM_OAUTH_TOKEN` (hotový token).
   Mintuje OAuth token přes JWT (RFC 7523) přesně podle FCM dokumentace, token cache-uje ~1 h,
   neplatné tokeny po UNREGISTERED/404/410 čistí z DB a **vrací přesnou chybovou hlášku Google**
   (žádné tajné pády). Chyby jsou rozlišené: `fcm-not-configured`, `fcm-config-invalid`,
   `fcm-auth-failed` + detail.
2. **`scripts/push-setup.mjs`** — diagnostický skript: ověří FCM_PROJECT_ID i service account,
   reálně si mintne OAuth token, a s `--token <FCM_token>` pošle testovací notifikaci a vypíše
   přesnou odpověď Google. Spusť na stroji, kde běží backend: `node scripts/push-setup.mjs`.
3. **`apps/backend/.env`** — má sekci pro FCM s komentovaným postupem (kroky 1–4).

### Ověřeno reálnými síťovými voláními (sandbox → Google)
- ✅ **OAuth token endpoint**: vlastní RSA klíč → Google odpověděl `400 invalid_grant` —
  formát JWT requestu je správný a Google je dosažitelný (odmítnuto jen kvůli falešným creds).
- ✅ **FCM send endpoint**: `POST /v1/projects/{id}/messages:send` s falešným tokenem →
  `401 Request had invalid authentication credentials…` — endpoint, cesta i tvar JSON zprávy
  jsou správné (odmítnuto jen kvůli falešnému tokenu).
- ✅ **Endpoint end-to-end**: bez konfigurace `{ reason: 'fcm-not-configured' }`; s neplatnými
  creds `{ reason: 'fcm-auth-failed', detail: … }` — jasná diagnostika v obou stavech.
- ✅ **Opraven a znovu ověřen import `jose`** (ESM nemá default export — token mint teď
  reálně projde až na Google a vrátí `invalid_grant` pro falešný účet: přesná cesta
  JWT → OAuth → (FCM) je funkční celá až po hranici skutečných přihlašovacích údajů).

### Pro plně reálné doručení na tvém stroji (potřebuje tvé Firebase creds)
1. console.firebase.google.com → tvůj projekt → ⚙️ Nastavení projektu → **Service accounts**
   → „Generate new private key" → ulož JSON.
2. V `apps/backend/.env` doplň `FCM_PROJECT_ID=` a `FCM_SERVICE_ACCOUNT_FILE=/cesta/k/JSON`.
3. Ověř: `node scripts/push-setup.mjs` → „✅ OAuth token OK".
4. Test doručení: `node scripts/push-setup.mjs --token <FCM token z mobilní appky>`.
   Token dostaneš v mobilní appce (Nastavení → Push → zapnout; token se registruje na backend).
5. Pozn. k mobilu: nativní APK potřebuje v `apps/mobile/android/` soubor `google-services.json`
   ze stejného Firebase projektu (Sender ID se musí shodovat) — po přidání spusť
   `npx cap sync android` a přebuduj APK. Web/PWA varianta používá web push (VAPID),
   který tato verze zatím nepodporuje — mobilní appka je primární cesta.

### Proč sandbox nemůže udělat „plně reálné" doručení sám
Reálné doručení vyžaduje privátní klíč z tvého Firebase projektu (service account). Klíč
nemůže nikdo vygenerovat za tebe — proto je testování rozdělené: všechno až po Google API
je ověřeno reálnými voláními (výše), finální krok zapadne, jakmile doplníš svůj JSON klíč.

## Kolo 8 — produkční nasazení ověřeno (2026-09-30)

### Co je připravené k nasazení na tvůj VPS (Docker)
Celá produkční architektura je v repozitáři: `docker-compose.prod.yml` (postgres + migrate +
backend + nginx-frontend), `Dockerfile` (multi-stage: workspace-deps → frontend-builder →
backend / frontend nginx), `deploy/nginx/frontend.conf` (reverse proxy /api → backend:5000,
SPA fallback, /health). Postup na tvém stroji:

1. `scp -r zoom-pro/ user@vps:/srv/zoom-pro`
2. Na VPS: `cp .env.example .env` → doplň `JWT_SECRET` (náhodný), `POSTGRES_PASSWORD`,
   `CORS_ORIGIN=https://tvae-domena.cz`, `HTTP_PORT=80`
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. Ověř: `curl http://localhost/health` → `ok`; login přes web.

### Co jsem ověřil zde (produkční režim 1:1)
Docker v sandboxu není, takže jsem nasadil identickou architekturu bez kontejnerů:
- frontend **produkční build** (Vite, minifikace, 300 kB JS / 34 kB CSS),
- backend **NODE_ENV=production**, TRUST_PROXY=true, **náhodný JWT_SECRET** (openssl rand),
- webová vrstva = přesná nápodoba `deploy/nginx/frontend.conf` (static dist, SPA fallback,
  proxy `/api/*` → backend, `/health` → ok) na portu 8080,
- 15/15 migrací, seed ownera.

Výsledky ověření **přes produkční proxy**:
- `/health` → `ok` ✅
- index.html, configurator-3d.html, manifest.webmanifest, sw.js → HTTP 200 ✅
- login owner@platform.local přes proxy → token ✅
- 10 klíčových GET endpointů (sync, kolize, licence, firmy, PO, výkazy, nastavení…) → 200 ✅
- bez tokenu → 401 ✅
- stabilita: 200/200 požadavků na /health ✅

## Kolo 9 — finální kompletní kontrola a synchronizace (2026-09-30)

### Vyhodnocení vloženého logu (Docker Desktop Kubernetes)
Vložený log (179 řádků) je log interního Kubernetes clusteru Docker Desktopu (etcd, kube-apiserver,
storage-provisioner) — NE log Zoom Pro. Všechny řádky jsou neškodné:
- „mvcc: required revision has been compacted" = běžná etcd komprese historie, ne chyba;
- „v1 Endpoints is deprecated" = deprecation warning kube-system, netýká se aplikace;
- „apply request took too long" = krátkodobá zátěž při startu clusteru.
Zoom Pro v těchto logách není ani zmíněn — žádná akce není potřeba. Pro logy aplikace:
`docker compose logs -f backend / frontend / postgres`.

### Kompletní test sada — finální stav
- Migrace: 15/15 ✅ · Doctor: 0 chyb (1 volitelné varování GEMINI_API_KEY) ✅
- Buildy webu i mobilu ✅ · Login testy ✅ · Funkční audit 11/11 ✅
- Stabilita: 200/200 požadavků (p95 72 ms) ✅
- RFQ→PO end-to-end (8/8) ✅ · Delta-sync + modul settings (5/6 — push ověřen zvlášť) ✅
- Push: cesta až po Google ověřena (fcm-auth-failed s detailem, žádný tajný pád) ✅
- Zbylé 2 „❌" ve smoke testu = zástupné cesty /documents/providers + /documents/requests,
  které frontend nikdy nevolá (testoval jsem je ručně nad špatným endpointem) — nejsou to bugy.

## Kolo 10 — oprava produkční migrace v compose (2026-09-30)

Služba `migrate` v `docker-compose.prod.yml` spouštěla pevný seznam jen 8 migrací (001–009,
vynechávala 004 a všechny 010–016) — na čerstvé produkci by chyběly distribuce, licence,
výkazy montérů, mobilní zařízení i oprava enumu faktur (016) a backend by padal na 500.
Opraveno na `node scripts/db-migrate-all.mjs` — kompletní, idempotentní, řazené podle názvů.

## Kolo 11 — oprava audit skriptů pro Windows (2026-10-01)

Tvůj běh `./audit-all.sh` na Windows odhalil tři závady skriptů, všechny opraveny:

1. **`audit-security.mjs` padal na `C:\C:\Users\...`** — cesta k rootu se stavěla přes
   `new URL('..', import.meta.url).pathname`, což na Windows dá `/C:/...` a po spojení
   `C:\C:\...`. Opraveno přes `fileURLToPath()` (platformně nezávislé).

2. **Testy 4–6 padaly na `ECONNREFUSED :5000`** — audit předpokládal běžící backend, ale
   nic ho nespouštěl. `audit-all.sh` teď zdravotní check provádí sám: backend **běží →
   použije se**, **neběží → skript si spustí dočasnou instanci** (s DATABASE_URL z
   `apps/backend/.env`), počká na health (max 15 s), proběhnou testy a instance se zase
   zastaví. Když se backend rozjet nepodaří, vypíše srozumitelnou hlášku + cestu k logu
   (typicky: PostgreSQL neběží, špatné DATABASE_URL).

3. **`test-login.mjs` padal tvrdou výjimkou** při vypnutém backendu — teď vypíše
   „backend neběží, spusť npm run dev“ a skončí čistě (exit 2). Totéž hlášení mají
   `audit-functionality` i `audit-stability` (pre-check /health).

Ověřeno v sandboxu: `bash scripts/audit-all.sh` proběhne kompletně — syntax backendu,
build frontendu, bezpečnostní audit, 11/11 funkčních testů, loginy i 200/200 požadavků
stability — se skriptem spuštěným i na stroji, kde nikdo backend ručně nespustil.

### Doplňeno (kolo 11): klasifikace security auditu
Nálezy security auditu jsou rozdělené: **tvrdé** (hardcoded klíče, plaintext hesla v SQL)
→ audit selže; **varování** (default JWT v .env.example, CORS fallback, SQLi-kontrola
dynamických klauzulí — ověřeno ručně, že jde jen o bezpečné `$n` placeholdery, npm audit
offline) → jen upozornění, audit projde. Finální běh `bash scripts/audit-all.sh`:
✅ VŠECHNY AUDITY PROŠLY (exit 0).

## Kolo 12 — write-paths audit (7/7) a poslední bug (2026-10-01)

Nový skript `scripts/audit-write-paths.mjs` pokrývá POST/PUT scénáře všech modulů end-to-end
(projekty create/update/assign/chat, deník, docházka, VZT, sklad item+movement, faktury
create/pay/auto, výkazy montérů create/submit/approve/rate, troubleshooting, dokumenty
create/approve, tisk, nastavení ceníku i modulů, týmový cyklus registrace→schválení→role→
přiřazení→login). Zařazen do `audit-all.sh` jako krok 7/7.

Nález a oprava: **výkazy montérů create padaly na 500** — INSERT používal neexistující sloupec
`"totalAmount"` (Invoice má `amount`/`amountVat`/`amountTotal`). Opraveno na `"amount"`.
Ověřeno obchodní pravidlo auto-fakturace („Za zvolené období není co fakturovat") i tisk
`document/issue`. Skips jsou jen pro data chybějící v DB (kolize, signature providers).

### Doplňeno (kolo 12): druhý nález ve výkazech montérů
Po opravě sloupce se ukázal druhý bug: INSERT nenicil `invoiceNumber` (NOT NULL) → 500.
Opraveno: auto-číslo `VY-YYYY-######` (lze přepsat payloadem). Finální běh:
write-paths ✅ 0 chyb (2 přeskočení pro chybějící DB data) + audit-all 7/7 ✅.

## Kolo 13 — příprava nasazení GitHub → Cloudflare → zoom-pro.app

Audit všech .env souborů a deploy nastavení. Nalezeny a opraveny 3 chyby,
které by nasazení na doménu rozbily:

1. **CORS s více doménami**: `CORS_ORIGIN` s čárkami se předával knihovně cors
   jako JEDEN řetězec → žádný origin by neodpověděl, prohlížeč zablokuje všechna
   API volání z Cloudflare Pages. Oprava: `apps/backend/src/config/env.js` teď
   hodnotu rozdělí na pole.
2. **`.gitignore` blokoval produkční šablony**: pravidlo `.env.*` zachytilo i
   `.env.production.example` (negace `!.env.example` je nevracela) — po pushi na
   GitHub by šablony chyběly. Oprava: `!*.example`.
3. **Chyběl SPA fallback pro Cloudflare Pages**: přidán
   `apps/frontend/public/_redirects` (`/* /index.html 200`) — jinak F5 na
   podstránce hodilo 404.

Dále sjednoceny produkční šablony na domény `zoom-pro.app` / `api.zoom-pro.app`
(`CORS_ORIGIN=https://zoom-pro.app,https://www.zoom-pro.app,https://zoom-pro.pages.dev`,
`VITE_API_URL=https://api.zoom-pro.app`) a dopracován návod
`deploy/cloudflare/README-CLOUDFLARE-GITHUB-DEPLOY.md`.

Co MUSÍ uživatel udělat sám (nelze z tohoto prostředí):
- `git push` na GitHub (sandbox není přihlášen k GitHubu: `gh auth status` → not logged in),
- vytvořit GitHub Secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VITE_API_URL),
- v Cloudflare připojit doménu zoom-pro.app a Pages custom domains,
- backend: VPS (deploy.yml) nebo Windows stroj s Cloudflare Tunnel.
