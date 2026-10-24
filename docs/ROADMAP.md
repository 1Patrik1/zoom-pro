# zoom-pro — roadmap stabilizace a inovací

> Aktualizace 2026-10-24: offline fronta mobilu byla bezpečnostně svázána s účtem (PR #64) a normalizace owner ID opravena (PR #66). Aktuální audit a doporučení k závislostem jsou v [REPOSITORY-AUDIT-2026-10-24.md](REPOSITORY-AUDIT-2026-10-24.md). Před změnou každého úkolu znovu ověř jeho stav v kódu a GitHubu.

> Stav: návrh pro řízenou implementaci. Tento dokument není potvrzením, že jsou úkoly hotové nebo že aplikace prošla produkčním testováním.
> Cílový repozitář: `1Patrik1/zoom-pro`. Repozitáře `zoom-pro.app` a `zoom-pro.app-` nejsou součástí tohoto plánu.

## Zásady práce

1. Nejdříve ověřit současný stav kódu a reprodukovat problém; nehádat implementaci podle názvu souboru.
2. Pracovat v malých izolovaných změnách a přes pull request. Bez přímého merge do `main`, dokud nejsou ověřeny testy a diff.
3. Nikdy necommitovat `.env`, přístupové tokeny, klíče, servisní účty, produkční data ani zálohy.
4. Destruktivní databázové změny a zásahy do skutečných účtů/hesel neprovádět v automatických smoke testech.
5. Každá změna musí mít akceptační kritéria, odpovídající testy a popis dopadu na migrace, mobilní aplikaci a provoz.
6. Pokud test vyžaduje tajemství nebo produkční službu, bezpečně jej přeskočit s jasným důvodem; neoznačovat jej za úspěšný.
7. Neaktivovat platby, push ani jiné externí integrace pouhou změnou UI nebo nastavení. Implementovat ověření, idempotenci, logování a bezpečné chybové stavy.

## P0 — Sprint 1: stabilizace a bezpečnost

### P0.1 — Výchozí stav repozitáře a reprodukovatelnost
- [ ] Zaznamenat aktuální commit, větev, pracovní strom a dostupné workflow.
- [ ] Spustit instalaci závislostí, lint, build a dostupné testy podle skutečných skriptů v package.json.
- [ ] Uložit výsledky do artefaktu CI nebo do komentáře PR; rozlišovat FAIL, PASS a SKIP.
- [ ] Zkontrolovat lockfile, Node.js verzi a shodu lokálního/Docker/CI prostředí.
- Akceptace: lze z čistého checkoutu zopakovat build a získat jednoznačný výsledek každé kontroly.

### P0.2 — Tajemství a produkční konfigurace
- [ ] Projít Docker Compose, Dockerfile, env validaci, workflow a dokumentaci; hledat pouze názvy/proměnné a známé nebezpečné výchozí hodnoty, nikoli vypisovat hodnoty tajemství do logu.
- [ ] Ověřit, že produkční start selže při chybějícím nebo zjevně výchozím `JWT_SECRET`.
- [ ] Ověřit, že tajemství nejsou v Git historii, obrazech, artefaktech CI ani klientském bundlu; případný únik řešit rotací, ne pouze smazáním souboru.
- [ ] Ověřit CORS, `TRUST_PROXY`, cookie/token nastavení, limity požadavků a chybové odpovědi.
- Akceptace: automatické konfigurační testy prokážou bezpečné selhání při neplatné produkční konfiguraci; žádné tajemství se nevypisuje.

### P0.3 — Healthcheck a start backendu
- [ ] Ověřit implementaci `GET /health`, co přesně kontroluje a zda vrací správný HTTP status.
- [ ] Rozlišit liveness a readiness; readiness má bezpečně vyhodnotit závislosti potřebné pro obsluhu požadavků.
- [ ] Zkontrolovat Docker HEALTHCHECK a pořadí startu databáze, migrátoru a backendu.
- [ ] Reprodukovat a opravit chyby Vite proxy `/api/sync` / `ECONNREFUSED 127.0.0.1:5000`.
- Akceptace: health/readiness testy a test startu po restartu kontejnerů mají očekávané výsledky; chyby závislostí nejsou maskovány.

### P0.4 — Kontrakt API a chyba `n.map is not a function`
- [ ] Najít skutečný zdroj volání `.map()` v minifikovaném bundlu přes zdrojové komponenty a source maps.
- [ ] Určit konkrétní API endpoint a odpověď, která vrací jiný typ než pole.
- [ ] Opravit primárně kontrakt backendu/serializaci; na frontendu přidat explicitní validaci a bezpečný stav chyby.
- [ ] Normalizaci odpovědí sdílet pouze tam, kde je pro daný endpoint definovaný kontrakt; nepřevádět libovolné objekty automaticky na pole.
- Akceptace: regresní test pokrývá správné pole, prázdná data, chybný typ a HTTP chybu; UI nespadne na `.map()`.

### P0.5 — Bezpečné funkční smoke testy
- [ ] V `scripts/audit-functionality.mjs` nahradit obecné `status < 500` přesnými očekávanými statusy pro jednotlivé scénáře.
- [ ] Ověřit `/health`, neplatné přihlášení (401), neautorizovaný přístup (401/403 dle kontraktu) a autorizované endpointy.
- [ ] Odstranit změnu hesla skutečného admina ze standardního smoke testu; destruktivní/self-test scénáře povolit jen proti výslovně vyhrazenému testovacímu účtu a testovací DB.
- [ ] Profilový test musí používat unikátní testovací identitu a nesmí přepisovat reálný profil.
- [ ] Zajistit správné ukončení při chybě srozumitelným výstupem a souhrnem PASS/FAIL/SKIP.
- Akceptace: očekávané chyby (např. 404 místo 200) způsobí FAIL; testy nepoškozují skutečné účty ani data.

### P0.6 — Lint a kvalita kódu
- [ ] Opravit známé chyby ESLint `no-useless-assignment` v `apps/frontend/src/features/vzt/calculations.js` po ověření aktuálních řádků.
- [ ] Projít varování, opravit bezpečné a jasné případy; nepřidávat plošné vypínání pravidel.
- [ ] Zajistit, že lint/build/test příkazy odpovídají skutečným package.json skriptům.
- Akceptace: žádné nové lint chyby; všechny výjimky jsou zdůvodněné a lokální.

## P1 — Datová integrita a spolehlivé vydávání

- [ ] Rozhodnout a zdokumentovat, zda běžný backend používá `pg`, Prisma, nebo obojí; každá cesta musí mít jasný účel a jednotný přístup k migracím.
- [ ] Ověřit evidenci SQL migrací, opakované bezpečné spuštění, pořadí, transakčnost a chování při částečném selhání.
- [ ] Zálohování: ověřit obnovu do izolované databáze, nejen existenci souboru zálohy.
- [ ] CI: lint, build, unit/integration testy, audit závislostí a kontrola tajemství; ochrana proti nechtěnému deployi z neověřené větve.
- [ ] Zpevnit autorizaci a izolaci dat mezi firmami (tenant isolation) a pokrýt ji negativními testy.
- [ ] Přidat korelační ID požadavků, strukturované logy a metriky chyb bez osobních údajů a tajemství.

## P2 — VZT, zakázky a mobilní práce

- [ ] Vytvořit referenční testovací případy pro průtok, rychlost, tlakové ztráty, rozměry a jednotky; ověřit hraniční hodnoty a zaokrouhlení.
- [ ] Propojit návrhy VZT se zakázkou a ukládat je na server; přidat verzování a audit změn.
- [ ] Generovat kusovník z verze návrhu; změny návrhu nesmějí tiše přepsat již vydaný materiál.
- [ ] Navrhnout offline frontu mobilních změn, idempotentní synchronizaci, řešení konfliktů a viditelný stav čekajících změn.
- [ ] Propojit výdej materiálu, docházku a výkazy s náklady zakázky.
- [ ] Ověřit přístupnost a kompaktní rozhraní pro telefon i desktop.

## P3 — Automatizace a nové funkce

- [ ] Provozní centrum: stav API, databáze, front synchronizace, poslední záloha a výsledek obnovovacích testů.
- [ ] AI asistent: shrnutí stavu zakázky, odchylky rozpočtu a doporučené další kroky s dohledatelným zdrojem dat.
- [ ] AI nesmí autonomně vystavovat faktury, měnit oprávnění, aktivovat licence/platby ani provádět nevratné operace bez potvrzení oprávněného uživatele.
- [ ] QR sklad: výdej/příjem, šarže a vazba na zakázku; ochrana před duplicitním skenem.
- [ ] Digitální předávací protokoly, fotografie, podpisy, export a auditní stopa.
- [ ] Platební bránu řešit až po výběru poskytovatele: serverový checkout, ověřování podpisu webhooku, idempotence, testovací režim a audit stavů. Tajné klíče nikdy neposílat do klienta.
- [ ] Push notifikace: doložit konfiguraci, registraci zařízení, oprávnění, chybové stavy a end-to-end test doručení; nepovažovat pouhé UI za funkční integraci.

## Doporučený postup pro každý PR

1. Popis problému a reprodukční kroky.
2. Rozsah změny a dotčené soubory.
3. Testy před opravou (pokud lze chybu reprodukovat) a regresní testy.
4. Lint, build, cílené testy a relevantní integrační testy.
5. Kontrola bezpečnosti, migrací, logování a kompatibility mobilní aplikace.
6. Přehled změn, rizik, neprovedených testů a návratového postupu.
7. Žádné automatické sloučení bez kontroly výsledků.

## První konkrétní pořadí

1. P0.1 výchozí stav a reprodukovatelnost.
2. P0.2 produkční tajemství a konfigurace.
3. P0.3 healthcheck a start backendu.
4. P0.4 reprodukce a oprava API/ `n.map`.
5. P0.5 bezpečné smoke testy.
6. P0.6 lint a čistý build.

## Evidence výsledků

Každý bod označit až po doložení výsledku:
- `TODO` — nezačato.
- `IN_PROGRESS` — probíhá, bez tvrzení o dokončení.
- `PASS` — akceptační kritéria splněna a důkaz je dostupný.
- `FAIL` — test selhal; připojit výstup a reprodukční kroky.
- `BLOCKED` — chybí bezpečné prostředí, oprávnění nebo závislost.
- `SKIP` — neprovedeno; uvést důvod.

Roadmap aktualizovat podle skutečných výsledků CI a PR, nikoli jen podle toho, že byl kód upraven.
