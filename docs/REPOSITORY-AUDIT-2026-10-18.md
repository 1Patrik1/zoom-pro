# Zoom Pro — audit repozitáře (2026-10-18)

## Rozsah a omezení

Tento dokument shrnuje první cílený audit veřejné větve `main` repozitáře `1Patrik1/zoom-pro`. Byly zkontrolovány routy backendu, middleware, služby a repozitáře pro autentizaci, oprávnění, SaaS/licence, projekty, docházku, sklad, faktury, dokumenty/podpisy, distribuci, synchronizaci, AI/AutoDetect, import/export, notifikace, CI a nasazení.

**Nejde o potvrzení úplné bezpečnosti ani o audit živé produkce.** Z tohoto prostředí nebylo možné naklonovat lokální pracovní kopii, spustit testy proti lokální databázi nebo ověřit produkční tajemství a chování nasazených služeb. Audit nezahrnuje lokální necommitnuté změny ani administrační aplikaci `apps/control`, která není ve stromu vzdáleného `main`. Žádné existující SQL migrace ani databázové schéma nebyly měněny.

## Kritické a vysoké nálezy

| Priorita | Oblast | Zjištění / navržená náprava |
|---|---|---|
| P0 | Správa rolí | Validátor přijímal `SUPERADMIN` a služba umožňovala řediteli firmy tuto roli přidělit. Serverová kontrola i regresní test jsou navrženy v PR #16. |
| P0 | Individuální oprávnění | `BOOL_OR(granted)` slučovalo role a uživatelský override, takže explicitní zákaz mohl být přebit rolí. Priorita override je opravena v návrhu PR #22. |
| P0 | Materiály | Seed endpoint důvěřoval klientskému `companyId`; oprava používá tenant přihlášeného uživatele v PR #20. |
| P0 | Distribuce | Ceníky, RFQ/PO a některé související dotazy nekontrolovaly všechny vazby na tenant. Návrh izolace, transakcí a testů je v PR #27; další dvoufiremní integrační testy zůstávají nutné. |
| P0 | Projekty a tým | Projektový chat a přiřazení týmu nepřed ověřovaly tenant projektu/cílového uživatele. Oprava je v PR #23. |
| P0 | Faktury | Ruční vytvoření faktury mohlo přijmout ID zaměstnance nebo projektu z jiné firmy. Oprava je v PR #30. |
| P0 | Dokumenty a podpisy | Vytváření dokumentů/podpisových požadavků přijímalo cizí ID šablony, projektu, faktury, poskytovatele nebo podepisujícího. Opravy jsou v PR #33 a #31. |
| P0 | Sklad a sync | Skladový pohyb mohl odkazovat na projekt jiné firmy; několik synchronizačních JOINů spojovalo metadata pouze podle ID. Oprava je v PR #32. |
| P1 | Chybové odpovědi | Error handler vracel interní `err.message` a `err.details` i u 5xx. Návrh bezpečných odpovědí a testy jsou v PR #18. |
| P1 | Neaktivní firma | Existující JWT mohl dál používat API po deaktivaci firmy. Middleware kontrolující aktuální stav firmy je v PR #19. |
| P1 | Produkční konfigurace | Dlouhý, ale předvídatelný ukázkový JWT secret mohl projít kontrolou délky; CORS mohl v produkci spadnout na `*`. Přísnější validace je v PR #34. |

## Ověření CI

Na větvích návrhů byly spuštěny GitHub Actions. Při sestavení tohoto reportu jsou úspěšné CI běhy pro PR #16, #18, #19, #20, #22, #23, #27, #30, #31, #32 a #33. PR #34 má běh CI stále v průběhu/čekání; jeho stav je třeba znovu ověřit.

Úspěšný CI běh ověřuje kroky workflow (migrace v testovací PostgreSQL, frontendové testy/build, backendové testy a syntaxi), ale nenahrazuje testy izolace dvou tenantů ani produkční smoke test. Všechny uvedené PR jsou drafty a žádný nebyl tímto auditem sloučen do `main`.

## Provoz a funkční mezery

- **Nasazení a monitor:** [Issue #21](https://github.com/1Patrik1/zoom-pro/issues/21). Běh deploye selhal na chybějícím `CLOUDFLARE_API_TOKEN`; monitor dostupnosti se zastavuje, protože chybí `ZOOM_PRO_HEALTH_URL`. To samo o sobě nedokazuje výpadek backendu.
- **Readiness:** [Issue #26](https://github.com/1Patrik1/zoom-pro/issues/26). `/health` potvrzuje, že proces odpovídá, ale nekontroluje dostupnost databáze; přidat oddělený `/ready`.
- **Import/export:** [Issue #24](https://github.com/1Patrik1/zoom-pro/issues/24). API vytváří joby se stavem `PENDING`; v tomto auditu nebyl nalezen worker, který by je zpracovával. Je potřeba potvrdit, zda neběží mimo tento repozitář.
- **Mobilní offline fronta:** [Issue #25](https://github.com/1Patrik1/zoom-pro/issues/25). Nutná idempotence, rozlišení retry/permanentních chyb, řešení konfliktů a bezpečné chování při odhlášení.
- **Závislosti:** [Issue #28](https://github.com/1Patrik1/zoom-pro/issues/28). Deploy log hlásil 32 npm audit nálezů po doinstalování Wrangleru (10 moderate, 17 high, 5 critical). Je nutné udělat aktuální audit committed lockfile a oddělit runtime/dev/tranzitivní závislosti; čísla nelze bez toho považovat za přesný inventář produkčních zranitelností.
- **AI/AutoDetect:** [Issue #29](https://github.com/1Patrik1/zoom-pro/issues/29). Doplnit limity velikosti obrázků/promptů, whitelist modelů, timeouty a limity nákladných volání.
- **Distribuce:** podrobnosti a akceptační kritéria jsou v [Issue #17](https://github.com/1Patrik1/zoom-pro/issues/17).
- **Frontend:** hlavní JavaScriptový bundle měl v posledním dohledaném buildu přibližně 901 kB před kompresí. Rozdělit moduly dynamickými importy až po měření a regresním průchodu UI.

## Testovací pokrytí

Před tímto auditem bylo ve vzdáleném stromu nalezeno jen několik automatických testovacích souborů vzhledem k počtu modulů. PR #16, #18–#20, #22–#23, #27, #30–#34 doplňují regresní testy, ale část z nich je testem tvaru SQL dotazu nebo mockované služby. Zůstává potřeba integračních testů nad izolovanou testovací PostgreSQL databází pro:
- dva tenanty a pokusy o přístup k cizím ID,
- skutečné chování override oprávnění v SQL,
- úplný životní cyklus RFQ/PO/příjemky a rollback při chybě,
- import/export joby a mobilní opakování synchronizace.

## Doporučené pořadí další práce

1. Nechat doběhnout a zkontrolovat CI všech draft PR.
2. Projít diff každého PR; sloučit až po review a po ověření, že lokální necommitnuté změny zůstaly nedotčené.
3. Doplnit integrační testy izolace tenantů pro distribuci, faktury, dokumenty, podpisy a synchronizaci.
4. Vyřešit GitHub secrets/variables pro deploy a monitor a ověřit skutečně nasazenou aplikaci.
5. Auditovat aktuální lockfile závislostí a zmenšit frontendový bundle.
6. Auditovat lokální `apps/control` samostatně po zpřístupnění jeho aktuálního zdrojového stavu.

