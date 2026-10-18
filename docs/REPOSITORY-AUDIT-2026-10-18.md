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
| P0 | Distribuce | Ceníky, RFQ/PO a některé související dotazy nekontrolovaly všechny vazby na tenant. Návrh izolace, transakcí a testů byl sloučen v PR #27; další dvoufiremní integrační testy zůstávají nutné. |
| P0 | Projekty a tým | Projektový chat a přiřazení týmu nepřed ověřovaly tenant projektu/cílového uživatele. Oprava je v PR #23. |
| P0 | Faktury | Ruční vytvoření faktury mohlo přijmout ID zaměstnance nebo projektu z jiné firmy. Oprava je v PR #30. |
| P0 | Dokumenty a podpisy | Vytváření dokumentů/podpisových požadavků přijímalo cizí ID šablony, projektu, faktury, poskytovatele nebo podepisujícího. Opravy jsou v PR #33 a #31. |
| P0 | Sklad a sync | Skladový pohyb mohl odkazovat na projekt jiné firmy; několik synchronizačních JOINů spojovalo metadata pouze podle ID. Oprava je v PR #32. |
| P1 | Chybové odpovědi | Error handler vracel interní `err.message` a `err.details` i u 5xx. Návrh bezpečných odpovědí a testy jsou v PR #18. |
| P1 | Neaktivní firma | Existující JWT mohl dál používat API po deaktivaci firmy. Middleware kontrolující aktuální stav firmy je v PR #19. |
| P1 | Produkční konfigurace | Dlouhý, ale předvídatelný ukázkový JWT secret mohl projít kontrolou délky; CORS mohl v produkci spadnout na `*`. Oprava PR #34 byla sloučena. |
| P1 | Readiness | `/health` nekontroloval databázi. PR #36 přidal `/ready`, který vrací 503 bez detailů při nedostupné DB. |
| P1 | AI/AutoDetect | PR #37 přidal validaci promptů/obrázků, limit 3 MB, whitelist MIME/modelů, timeout, rate limiting a přestal ukládat surová data URL obrázků. Zbývá sdílený limit napříč instancemi (Issue #39). |
| P2 | Závislosti | PR #38 zapnul týdenní Dependabot aktualizace pro root npm workspace a mobilní aplikaci; zranitelnosti v lockfile je stále nutné vyhodnotit a postupně opravit. |

## Ověření CI

GitHub Actions CI proběhlo úspěšně pro všechny opravné PR #16, #18, #19, #20, #22, #23, #27, #30, #31, #32, #33 a #34 před jejich sloučením. Tyto opravy byly následně sloučeny do `main` jako samostatné squash commity. PR #35 je samostatná dokumentační změna.

Úspěšný CI běh ověřuje kroky workflow (migrace v testovací PostgreSQL, frontendové testy/build, backendové testy a syntaxi), ale nenahrazuje testy izolace dvou tenantů ani produkční smoke test. Po sloučení je nutné ověřit také výsledný CI běh hlavní větve.

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

## Stav po první vlně oprav

PR #16, #18, #19, #20, #22, #23, #27, #30, #31, #32, #33, #34, #36, #37 a #38 byly sloučeny do `main`; jejich CI běhy na jednotlivých větvích prošly. CI hlavní větve se po posledních sloučeních musí ověřit na nejnovějším commitu. Úspěch jednotlivých CI běhů nenahrazuje produkční smoke test ani dvoufiremní integrační testy.

## Doporučené pořadí další práce

1. Potvrdit CI hlavní větve na nejnovějším commitu po PR #38.
2. Doplnit integrační testy izolace tenantů pro distribuci, faktury, dokumenty, podpisy a synchronizaci.
3. Vyřešit GitHub secrets/variables pro deploy a monitor a ověřit skutečně nasazenou aplikaci.
4. Auditovat aktuální lockfile závislostí a postupně opravit ověřené produkční zranitelnosti.
5. Dokončit sdílené limity AI požadavků podle Issue #39.
6. Auditovat lokální `apps/control` samostatně po zpřístupnění jeho aktuálního zdrojového stavu.

