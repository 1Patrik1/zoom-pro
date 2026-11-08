# Analýza a bezpečný plán migrace ZOOM-PRO na Cloudflare D1

**Stav:** pouze analýza a plán; žádná databáze ani produkční služba nebyla vytvořena, změněna nebo migrována.  
**Cílová větev:** `docs/cloudflare-d1-migration-analysis`  
**Výchozí revize:** `8458c0515da606b3d9954bc42d07067256fc2f2f`

## 1. Rozhodnutí a doporučený cílový stav

Cílem je provozovat web i API na Cloudflare a databázi přesunout z PostgreSQL na Cloudflare D1 (SQLite). D1 není PostgreSQL kompatibilní databáze. Migrace proto není pouhá změna connection stringu: vyžaduje převod schématu, SQL dialektu, transakcí, databázové vrstvy a dat.

Cílová architektura:
- React/PWA frontend: Cloudflare Pages nebo statické assets obsluhované Workers.
- API: Cloudflare Workers; zachovat stávající HTTP API kontrakty a autentizační chování.
- Databáze: Cloudflare D1, přístup výhradně přes binding a připravené SQL statements.
- Soubory a přílohy: Cloudflare R2 (odděleně od relačních metadat v D1).
- Asynchronní práce a plánované úlohy: Queues / Cron Triggers podle konkrétní potřeby.
- Tajné hodnoty: Cloudflare secrets, nikdy v repozitáři ani v klientském bundle.

## 2. Zjištěný současný stav repozitáře

Kontrola provedena nad výchozí revizí uvedenou výše.

| Oblast | Zjištění | Dopad |
|---|---|---|
| Backend | `apps/backend` používá Node.js, Express 5 a ES modules. | Bude potřeba Workers entry point a ověření runtime kompatibility. |
| Databázový ovladač | `apps/backend/src/config/db.js` importuje `pg`, vytváří `Pool`, exportuje `query()` a `withTransaction()`. | `pg.Pool` nelze zaměnit za D1 binding; databázová vrstva se musí navrhnout znovu. |
| SQL | Repositories používají PostgreSQL placeholdery `$1`, `$2`, `RETURNING`, `::enum`, `::jsonb`, `gen_random_uuid()`, `NOW()`. | Nutná systematická konverze a testy každého repository dotazu. |
| Schéma | `schema.prisma` deklaruje PostgreSQL a obsahuje rozsáhlé více-entitní schéma (cca 36 modelů v předchozím auditu). | Prisma schema není D1 schéma; je nutné vytvořit a verzovat samostatné SQLite/D1 DDL. |
| Migrace | Kořenové očíslované SQL migrace `001_*.sql` až `021_*.sql`; `scripts/db-migrate-all.mjs` používá `pg`, `information_schema`, `TIMESTAMPTZ`, transakce a PostgreSQL baseline. | Současný migrátor nelze použít pro D1. D1 musí mít vlastní migrace a historii. |
| JSON a pole | Migrace obsahují `JSONB`, výchozí JSON hodnoty a PostgreSQL pole typu `text[]`. | JSON se ukládá jako validovaný TEXT/JSON; pole je třeba normalizovat do vazebních tabulek nebo serializovat podle přístupových vzorů. |
| Databázové transakce | `withTransaction()` získává dedikované spojení z poolu a provádí BEGIN/COMMIT/ROLLBACK. | D1 používá API bindingu a `batch()`; transakční hranice se musí navrhnout pro každý use-case. |
| Funkční rozsah | Backend registruje autentizaci, firmy, uživatele, projekty, docházku, faktury, sklad, VZT, dokumenty, podpisy, licence, distribuci a notifikace. | Migrace se musí řídit závislostmi a pokrýt všechny moduly, ne pouze základní tabulky. |

### Konkrétní nekompatibility nalezené v kódu

- `apps/backend/src/config/db.js`: Node `pg.Pool`, `pool.connect()`, `client.query()`, `client.release()`.
- `scripts/db-migrate-all.mjs`: dotazy do `information_schema.tables`, PostgreSQL typ `TIMESTAMPTZ`, `ON CONFLICT` a klient `pg`.
- Repository dotazy: poziční parametry `$1`…, enum casty, JSONB casty, UUID generování na serveru DB, PostgreSQL array casty.
- Příklady z migrací: `021_notifications.sql` používá UUID, JSONB, TIMESTAMPTZ a partial index; `013_distribution_platform.sql` používá JSONB a DOUBLE PRECISION; `018_license_requests.sql` používá JSONB a UUID reference.

Tyto nálezy znamenají, že nelze bezpečně spustit existující SQL migrace na D1 ani pouze změnit proměnnou `DATABASE_URL`.

## 3. D1 limity a návrhové důsledky

Před implementací vždy znovu ověřit aktuální limity Cloudflare dokumentace. V době analýzy dokumentace uvádí zejména:
- maximální velikost jedné D1 databáze: 10 GB na Workers Paid a 500 MB na Free;
- jedna databáze zpracovává dotazy postupně (single-threaded); nadměrná souběžnost může vést k frontě a chybám přetížení;
- maximálně 100 sloupců na tabulku a 2 MB na hodnotu BLOB/TEXT nebo řádek;
- dotazy v jednom Worker invocation jsou limitované; dávkování přes `batch()` snižuje počet subrequestů;
- Time Travel poskytuje bodovou obnovu, délka historie se liší podle tarifu.

Důsledky:
1. Před rozhodnutím o produkčním D1 je nutné změřit velikost PostgreSQL databáze, největší řádky, počet tabulek/řádků, objem příloh a špičkovou souběžnost.
2. Velké dokumenty, obrázky a přílohy neukládat do D1; použít R2 a v D1 držet metadata a klíče objektů.
3. Kritické seznamy a dashboardy optimalizovat indexy, stránkováním a dávkovými dotazy.
4. Pokud měření ukáže vysoký write contention, databázi blížící se 10 GB nebo nevhodný workload, migraci zastavit a znovu posoudit PostgreSQL/Hyperdrive nebo rozdělení tenantů. D1 není automaticky správná volba pro každou relační zátěž.

## 4. Migrační strategie — bez ztráty dat

### Fáze 0 — inventura a bezpečnostní brána

- [ ] Získat skutečné schéma a anonymizovaný/bezpečný výpis metadat produkční PostgreSQL databáze.
- [ ] Změřit velikost DB, tabulky, počty řádků, indexy, foreign keys, enumy, pohledy, triggery, sekvence a rozšíření.
- [ ] Zmapovat všechna SQL volání v `apps/backend/src` a jejich vstupní/výstupní kontrakty.
- [ ] Zjistit všechny PostgreSQL funkce, které aplikace používá (např. JSON operátory, array operátory, full-text, ILIKE, advisory locks).
- [ ] Vytvořit katalog tabulek a závislostí; ověřit tenant isolation přes `companyId` a oprávnění.
- [ ] Změřit objem souborů a určit, co přesunout do R2.
- [ ] Zaznamenat požadované RPO/RTO, dobu odstávky a plán návratu.

**Brána:** žádná implementace datového převodu, dokud není inventura úplná a schválená.

### Fáze 1 — D1 datový model a SQL migrace

- [ ] Připravit samostatné D1 migrace v `apps/backend/d1/migrations/` nebo obdobném jasném umístění.
- [ ] Převést PostgreSQL typy: UUID → TEXT (zachovat přesné hodnoty), TIMESTAMPTZ → ISO-8601 TEXT nebo INTEGER epoch (jednotně), BOOLEAN → INTEGER 0/1, JSONB → validovaný TEXT, enumy → TEXT + CHECK constraint.
- [ ] PostgreSQL pole převést podle skutečného využití na normalizované child tables nebo JSON TEXT; rozhodnutí dokumentovat pro každé pole.
- [ ] Zachovat PK/FK, ON DELETE chování, unikátní omezení, indexy a tenant-scoped přístup.
- [ ] Nahradit server-side UUID a timestamp generování deterministickou aplikační funkcí; nespoléhat na neexistující PostgreSQL funkce.
- [ ] Vytvořit verzi migrací a kontrolu checksum; migrace musí být idempotentní tam, kde je to možné, a nikdy nesmí automaticky přepsat produkční data.
- [ ] Definovat datové invarianty a referenční kontroly po každé dávce.

### Fáze 2 — databázová vrstva a API

- [ ] Zavést rozhraní databázového adaptéru s oddělenými implementacemi pro PostgreSQL (současná) a D1 (nová).
- [ ] Zachovat současný PostgreSQL adaptér během celé migrace; nepřepisovat jej destruktivně.
- [ ] D1 adaptér musí používat binding `env.DB`, prepared statements a parametrizaci; žádné skládání SQL z nedůvěryhodných vstupů.
- [ ] Převést repository dotazy po modulech; nepřepisovat vše jedním regexem.
- [ ] Nahradit `withTransaction()` D1 batch/transaction patternem a ověřit atomicitu pro každý vícekrokový zápis (docházka, skladové pohyby, faktury, licence, podpisy).
- [ ] Vytvořit Workers entry point; ověřit Express middleware a balíčky. Pokud Express adapter není spolehlivý, migrovat směrování po modulech na kompatibilní router, bez změny API kontraktů.
- [ ] Ověřit auth/JWT, rate limiting, CORS, uploady, e-mail/push a background jobs v Workers runtime.
- [ ] Zachovat OpenAPI/API contract testy a přidat testy pro chyby D1, retry, timeout a souběžné zápisy.

### Fáze 3 — převod a validace dat

- [ ] Vytvořit opakovatelný ETL nástroj PostgreSQL → D1, který umí dry-run, checkpointy, dávkování a bezpečné opakování.
- [ ] Exportovat zdrojovou DB pomocí konzistentního snapshotu; nikdy neexportovat živou databázi nekonzistentním způsobem.
- [ ] Zachovat všechna ID a vztahy; převod enumů/JSON/polí provádět explicitními mapovacími funkcemi.
- [ ] Importovat tabulky v pořadí závislostí; ověřovat foreign keys.
- [ ] Porovnat počty řádků pro každou tabulku, agregace kritických částek/množství, NULL distribuce a deterministické checksumy po dávkách.
- [ ] Spustit integrační testy proti D1 local emulatoru i izolované staging D1 databázi.
- [ ] Projít kritické scénáře: login/refresh, izolace firem, docházka, synchronizace offline, faktury, skladové pohyby, VZT, dokumenty, podpisy, licence, notifikace a exporty.
- [ ] Provést výkonové testy s realistickými daty a souběžností.

### Fáze 4 — staging a cutover

- [ ] Vytvořit samostatné D1 databáze pro local/staging/production; nikdy nesdílet produkční DB s testy.
- [ ] Nasadit staging Worker a Pages preview; produkční secrets a bindingy oddělit od preview.
- [ ] Proveďte nejméně dva kompletní zkušební převody a změřte délku exportu/importu i validace.
- [ ] Před ostrým přepnutím vyhlásit údržbové okno, zastavit zápisy do PostgreSQL a vytvořit finální konzistentní export.
- [ ] Importovat poslední změny, spustit všechny kontroly a teprve po úspěchu přepnout API routing.
- [ ] Po přepnutí aktivně monitorovat chyby, latenci, D1 usage, fronty a kritické workflow.

**Nedoporučuje se** improvizované dual-write do PostgreSQL a D1: bez transakční koordinace může vzniknout rozdílný stav. Pokud bude potřeba téměř nulová odstávka, musí se nejdříve navrhnout a otestovat spolehlivý change-data-capture/outbox mechanismus.

### Fáze 5 — rollback a ukončení PostgreSQL

- [ ] PostgreSQL ponechat jako read-only rollback zdroj po předem stanovené retenční období.
- [ ] Před cutoverem nacvičit návrat DNS/routingu a obnovení zápisů do PostgreSQL.
- [ ] Po prvním zápisu do D1 nelze prostě vrátit routing na PostgreSQL bez přenosu nových zápisů zpět. Rollback musí proto zahrnovat zachycení a reconciliaci změn od cutoveru, nebo krátké read-only okno.
- [ ] PostgreSQL neodstraňovat, dokud nejsou splněny akceptační podmínky, retenční doba a výslovné schválení vlastníka.
- [ ] Po stabilizaci vytvořit závěrečný export a ověřit postup obnovy D1.

## 5. Akceptační kritéria — bez nich se nesmí přepnout produkce

- [ ] 100 % tabulek a očekávaných řádků z inventury převedeno nebo zdokumentovaně vyloučeno.
- [ ] Všechny FK a unikátní invarianty ověřeny; žádné osiřelé reference.
- [ ] Kritické finanční hodnoty, skladová množství, docházka a stavy licencí souhlasí přesnými kontrolními součty.
- [ ] API kontrakty a regresní testy pro všechny moduly procházejí.
- [ ] Ověřená tenant izolace a autorizace na D1.
- [ ] Staging výkon splňuje dohodnuté limity při realistické zátěži.
- [ ] Záloha/Time Travel a rollback postup byly prakticky otestovány.
- [ ] Produkční cutover má písemné schválení a stanovené údržbové okno.

## 6. Co je potřeba od vlastníka účtu/provozu

1. Přístup do Cloudflare účtu s možností vytvořit D1, Workers, Pages a R2. Přístupové tokeny neposílat do chatu ani do Git.
2. Bezpečný přístup k PostgreSQL pro inventuru a konzistentní export; nikdy nevkládat hesla ani plný produkční dump do issue/PR.
3. Potvrdit, zda lze naplánovat údržbové okno a jaká je maximální přípustná odstávka.
4. Potvrdit přibližnou velikost databáze a počet aktivních firem/uživatelů, pokud jsou tyto provozní metriky známé.

## 7. Co se v této fázi záměrně nedělá

- Nezakládá se D1 databáze ani Cloudflare prostředky.
- Nemění se produkční DNS, Pages, Workers, secrets ani GitHub Actions deployment.
- Nespouští se žádný export, import, mazání ani změna PostgreSQL.
- Nemění se existující backend ani API.
- Nemigrují se data a neprovádí se cutover.
- PostgreSQL zůstává autoritativním zdrojem dat až do samostatného schváleného migračního projektu.

## 8. Oficiální dokumentace

- [Cloudflare D1 — limity](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare D1 — import a export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Cloudflare D1 — Time Travel a obnova](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Cloudflare Workers — Node.js kompatibilita](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Cloudflare Workers — připojení k databázím](https://developers.cloudflare.com/workers/databases/connecting-to-databases/)
