# Zoom Pro — audit repozitáře (2026-10-18)

## Rozsah a omezení

Tento dokument shrnuje první cílený audit veřejné větve `main` repozitáře `1Patrik1/zoom-pro`. Byly zkontrolovány routy backendu, middleware, služby a repozitáře pro autentizaci, oprávnění, SaaS/licence, projekty, docházku, sklad, faktury, dokumenty/podpisy, distribuci, synchronizaci, AI/AutoDetect, import/export, notifikace, CI a nasazení.

**Nejde o potvrzení úplné bezpečnosti ani o audit živé produkce.** Z tohoto prostředí nebylo možné naklonovat lokální pracovní kopii, spustit testy proti lokální databázi nebo ověřit produkční tajemství a chování nasazených služeb. Audit nezahrnuje lokální necommitnuté změny ani administrační aplikaci `apps/control`, která není ve stromu vzdáleného `main`. Žádné existující SQL migrace ani databázové schéma nebyly měněny.

## Kritické a vysoké nálezy

| Priorita | Oblast | Zjištění / navržená náprava |
|---|---|---|
| P0 | Správa rolí | Validátor přijímal `SUPERADMIN` a služba umožňovala řediteli firmy tuto roli přidělit. Oprava a regresní test byly sloučeny v PR #16. |
| P0 | Individuální oprávnění | `BOOL_OR(granted)` slučovalo role a uživatelský override, takže explicitní zákaz mohl být přebit rolí. Priorita override je opravena a sloučena v PR #22. |
| P0 | Materiály | Seed endpoint důvěřoval klientskému `companyId`; oprava je sloučena v PR #20 a používá tenant přihlášeného uživatele. |
| P0 | Distribuce | Ceníky, RFQ/PO a některé související dotazy nekontrolovaly všechny vazby na tenant. Návrh izolace, transakcí a testů byl sloučen v PR #27; další dvoufiremní integrační testy zůstávají nutné. |
| P0 | Projekty a tým | Projektový chat a přiřazení týmu nepřed ověřovaly tenant projektu/cílového uživatele. Oprava je sloučena v PR #23. |
| P0 | Faktury | Ruční vytvoření faktury mohlo přijmout ID zaměstnance nebo projektu z jiné firmy. Oprava je sloučena v PR #30. |
| P0 | Dokumenty a podpisy | Vytváření dokumentů/podpisových požadavků přijímalo cizí ID šablony, projektu, faktury, poskytovatele nebo podepisujícího. Opravy jsou sloučeny v PR #33 a #31. |
| P0 | Sklad a sync | Skladový pohyb mohl odkazovat na projekt jiné firmy; několik synchronizačních JOINů spojovalo metadata pouze podle ID. Oprava je v PR #32. |
| P1 | Chybové odpovědi | Error handler vracel interní `err.message` a `err.details` i u 5xx. Bezpečné odpovědi a regresní testy jsou sloučeny v PR #18. |
| P1 | Neaktivní firma | Existující JWT mohl dál používat API po deaktivaci firmy. Middleware kontrolující aktuální stav firmy je sloučen v PR #19. |
| P1 | Produkční konfigurace | Dlouhý, ale předvídatelný ukázkový JWT secret mohl projít kontrolou délky; CORS mohl v produkci spadnout na `*`. Oprava PR #34 byla sloučena. |
| P1 | Readiness | `/health` nekontroloval databázi. PR #36 přidal `/ready`, který vrací 503 bez detailů při nedostupné DB. |
| P1 | AI/AutoDetect | PR #37 přidal validaci promptů/obrázků, limit 3 MB, whitelist MIME/modelů, timeout, rate limiting a přestal ukládat surová data URL obrázků. Zbývá sdílený limit napříč instancemi (Issue #39). |
| P1 | Závislosti | PR #41 a #58 aktualizovaly kompatibilní balíčky; PR #51 aktualizoval Vitest. PR #61 odstranil kritické root zranitelnosti v `shell-quote` a `proxy-addr`; PR #62 odstranil kritickou zranitelnost `tar` v mobilním CLI override. Aktuální npm audit uvádí 10 nálezů v root workspace (3 moderate, 7 high, 0 critical) a 10 v mobilní aplikaci (4 moderate, 6 high, 0 critical). Zbývající vysoké nálezy vyžadují kompatibilitní práci na Vite/Tailwind/Nodemon. |

## Ověření CI

GitHub Actions CI úspěšně prošlo na hlavní větvi po PR #62. CI nyní zahrnuje migrace proti izolované PostgreSQL, frontendové testy/build, mobilní produkční build, backendové testy a kontrolu syntaxe. Samostatný audit workflow publikuje JSON reporty pro root a mobile lockfile.

PR #16, #18–#20, #22–#23, #27, #30–#34, #36–#38, #41, #51, #56–#62, #64 a #66 jsou sloučeny do `main`. Úspěšný CI nenahrazuje dvoufiremní integrační testy ani produkční smoke test.

## Provoz a funkční mezery

- **Nasazení a monitor:** [Issue #21](https://github.com/1Patrik1/zoom-pro/issues/21). Běh deploye selhal na chybějícím `CLOUDFLARE_API_TOKEN`; monitor dostupnosti se zastavuje, protože chybí `ZOOM_PRO_HEALTH_URL`. To samo o sobě nedokazuje výpadek backendu.
- **Readiness:** vyřešeno v PR #36; Issue #26 je uzavřen. `/health` zůstává liveness kontrolou a `/ready` kontroluje databázi.
- **Import/export:** [Issue #24](https://github.com/1Patrik1/zoom-pro/issues/24). API vytváří joby se stavem `PENDING`; v tomto auditu nebyl nalezen worker, který by je zpracovával. Je potřeba potvrdit, zda neběží mimo tento repozitář.
- **Mobilní offline fronta:** [Issue #25](https://github.com/1Patrik1/zoom-pro/issues/25). Nutná idempotence, rozlišení retry/permanentních chyb, řešení konfliktů a bezpečné chování při odhlášení.
- **Závislosti:** [Issue #28](https://github.com/1Patrik1/zoom-pro/issues/28). Pravidelné npm audit reporty nyní ukazují 10 nálezů v root workspace (3 moderate, 7 high, 0 critical) a 10 v mobilní aplikaci (4 moderate, 6 high, 0 critical). Jde o souhrn včetně vývojových a tranzitivních balíčků, ne o 20 potvrzených produkčních zranitelností. Zbývají vysoké nálezy vyžadující major upgrady.
- **AI/AutoDetect:** PR #37 doplnil validaci vstupů, whitelist modelů, timeouty, limit velikosti obrázků a IP rate limit. [Issue #39](https://github.com/1Patrik1/zoom-pro/issues/39) sleduje sdílený per-user/per-company limit pro více backendových instancí.
- **Distribuce:** podrobnosti a akceptační kritéria jsou v [Issue #17](https://github.com/1Patrik1/zoom-pro/issues/17).
- **Frontend:** hlavní JavaScriptový bundle měl v posledním dohledaném buildu přibližně 901 kB před kompresí. Rozdělit moduly dynamickými importy až po měření a regresním průchodu UI.

## Testovací pokrytí

Před tímto auditem bylo ve vzdáleném stromu nalezeno jen několik automatických testovacích souborů vzhledem k počtu modulů. PR #16, #18–#20, #22–#23, #27, #30–#34 a #36–#37 doplnily regresní testy, ale část z nich je testem tvaru SQL dotazu nebo mockované služby. Zůstává potřeba integračních testů nad izolovanou testovací PostgreSQL databází pro:
- dva tenanty a pokusy o přístup k cizím ID,
- skutečné chování override oprávnění v SQL,
- úplný životní cyklus RFQ/PO/příjemky a rollback při chybě,
- import/export joby a mobilní opakování synchronizace.

## Stav po první vlně oprav

Bezpečnostní opravy, readiness endpoint, AI validace, zabezpečení mobilní offline fronty, Dependabot, automatické audit reporty, mobilní unit testy/build v CI a kompatibilní lockfile opravy byly sloučeny. Po PR #62 prošlo CI hlavní větve včetně mobilního buildu. Kritické npm audit nálezy byly sníženy na nulu v obou lockfilech; zbývá 7 high nálezů v root workspace a 6 high v mobilní aplikaci, převážně navázaných na major upgrady Vite/Tailwind a související nástroje.

Toto není potvrzení úplné bezpečnosti: stále chybí produkční deploy/monitoring, dvoufiremní integrační testy, zpracování import/export jobů a úplný audit lokální administrační aplikace.

## Doporučené pořadí další práce

1. Doplnit dvoufiremní integrační testy distribuce, faktur, dokumentů, podpisů a synchronizace.
2. Vyřešit GitHub secrets/variables pro deploy a monitor; ověřit skutečně nasazenou aplikaci.
3. Projít zbývající high nálezy a naplánovat kompatibilní upgrady Vite/Tailwind/Nodemon; Vite 8 nyní selhává na konfiguraci `manualChunks`.
4. Dokončit sdílené limity AI požadavků podle Issue #39.
5. Implementovat/ověřit worker pro import/export podle Issue #24; u offline fronty doplnit idempotenci, konflikty a uživatelskou správu zablokovaných položek podle Issue #25.
6. Auditovat lokální `apps/control` po zpřístupnění jeho aktuálního zdrojového stavu.

