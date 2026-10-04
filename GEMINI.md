# Gemini Instructions — ZOOM-PRO

Použij jako závazný master plán:
`AI-IMPLEMENTATION-MASTER-PLAN.md`

Repository:
`1Patrik1/zoom-pro`

## Povinné chování

- Pracuj pouze v tomto repository.
- Před každou změnou proveď audit aktuálního stavu.
- Neprováděj destruktivní změny bez explicitního potvrzení člověka.
- Nikdy nevypisuj ani necommituj secrets.
- Nejprve oprav P0/P1 problémy, potom P2 a nové funkce.
- Každou změnu otestuj.
- Nehlaš úkol jako dokončený bez důkazů z testů/buildů.
- Pokud je potřeba změnit DB schema, migration strategy, API contract nebo security model, nejprve popiš dopad a navrhni postup.

## Povinné pořadí

1. repository baseline
2. secrets/security
3. backend startup
4. API contract
5. `n.map is not a function`
6. DB source of truth
7. migrations
8. auth/RBAC/tenant isolation
9. tests
10. CI/CD
11. Node/Docker
12. PostgreSQL
13. sync/offline
14. VZT
15. performance
16. observability
17. UI
18. production release

## První akce

Než začneš měnit kód, vytvoř audit:

- `git status`
- `git remote -v`
- `git log --oneline -20`
- Node/npm verze
- architektura OS
- package/workspace inventura
- CI inventura
- Docker inventura
- migration inventura
- test inventura
- security scan

Výstup rozděl na P0/P1/P2/P3.

## Bezpečnostní zákaz

Nikdy automaticky:
- nemaž databázi,
- nespouštěj `prisma migrate reset`,
- nepoužívej `db push` jako náhradu migration strategie,
- nemaž Git historii,
- nepoužívej force push,
- necommituj `.env`,
- nehardcoduj credentials.

## Očekávaný report

Po každém úkolu:

- Zjištění
- Riziko
- Změna
- Soubory
- Testy + výsledek
- Zbývající práce
- Git branch/commit

Pokud je možné bezpečně připravit opravu, připrav ji. Pokud změna vyžaduje destruktivní nebo produkční zásah, zastav se před tímto krokem a požádej o potvrzení.
