# ZOOM-PRO — AI IMPLEMENTATION MASTER PLAN

> **Účel:** Tento dokument je závazný technický plán pro AI coding agenty pracující v repozitáři `1Patrik1/zoom-pro`.
>
> **Platí pouze pro:** `1Patrik1/zoom-pro`.
> Repozitáře/složky `zoom-pro.app` a `zoom-pro.app-` nejsou zdrojem pravdy, pokud člověk výslovně neurčí jinak.

## 0. Závazná pravidla

1. **Neprováděj destruktivní změny bez výslovného potvrzení člověka.**
   - Žádné mazání databází.
   - Žádné `DROP DATABASE`, `TRUNCATE`, destruktivní migrace nebo force reset.
   - Žádné mazání historie Git.
   - Žádné force push.
   - Žádné přepisování produkčních secrets.
2. Před změnou vždy nejprve:
   - prozkoumej aktuální stav,
   - najdi skutečný source of truth,
   - vysvětli problém,
   - navrhni opravu,
   - proveď pouze bezpečnou změnu.
3. **Nikdy nevkládej skutečné secrets do Git, logů, testů, README ani issue.**
4. Považuj dříve zveřejněné credentials za kompromitované. Neopakuj jejich hodnoty.
5. Neměň API kontrakt, DB schema nebo migration strategy bez analýzy dopadu.
6. Každá změna musí být co nejmenší, atomická a snadno vratná.
7. Po každé změně spusť relevantní testy.
8. Pokud test selže, neopravuj pouze symptom. Najdi příčinu.
9. Nehlaš „hotovo“, pokud změna nebyla skutečně ověřena.
10. Pokud si nejsi jistý, zastav se na bezpečném bodě a požádej člověka o rozhodnutí.

---

# 1. Source of truth

Primární repository:

`https://github.com/1Patrik1/zoom-pro`

Pracovní strom musí být nejprve ověřen:

```bash
git remote -v
git status
git branch --show-current
git log --oneline --decorate -20
```

Pokud remote neodpovídá očekávanému projektu, nepokračuj v automatických úpravách.

---

# 2. Aktuální známé problémy

AI musí při auditu ověřit zejména:

### P0 — Security
- veřejně známé SUPERADMIN credentials,
- fallback `POSTGRES_PASSWORD`,
- fallback `JWT_SECRET`,
- secrets v Git historii,
- případně veřejně vystavené API keys.

### P1 — Stabilita
- backend `/api/sync` dříve selhával přes Vite proxy:
  `ECONNREFUSED 127.0.0.1:5000`,
- frontend dříve padal:
  `TypeError: n.map is not a function`,
- chybí dostatečná automatizace CI/testů,
- produkční migration workflow obsahuje seed/demo kroky,
- Node 20 je nutné ověřit a naplánovat upgrade na podporovaný LTS,
- Docker build musí být reprodukovatelný.

### P1 — Database
- ověřit vztah `schema.prisma` ↔ SQL migrations ↔ skutečná PostgreSQL DB,
- určit, zda je source of truth `pg + SQL`, nebo Prisma,
- nepoužívat dvě migration strategie bez explicitního důvodu,
- zavést migration ledger/checksum.

### P2 — Kvalita
- `pg` vs Prisma architektonicky sjednotit,
- observability,
- performance testing,
- backup/restore testing,
- dokumentace,
- UI/design system.

---

# 3. Fáze implementace

AI musí postupovat v tomto pořadí:

1. Repository baseline
2. Security / secrets
3. Backend startup
4. API contract
5. `n.map` runtime crash
6. Database source of truth
7. Migration system
8. Authentication / RBAC / tenant isolation
9. Automated tests
10. CI/CD
11. Node.js / Docker
12. PostgreSQL
13. Offline/sync
14. VZT calculations
15. Performance
16. Observability
17. UI/design
18. Production release

**Nepřeskakuj na velké nové funkce, pokud předchozí blokující fáze selhává.**

---

# 4. FÁZE 1 — Repository baseline

Proveď:

```bash
git status
git remote -v
git branch --show-current
git log --oneline --decorate -20
node -v
npm -v
uname -m
```

Inventura:

```bash
find apps -maxdepth 3 -type f | sort
npm ls --depth=0
```

Výstup musí obsahovat:
- commit SHA,
- branch,
- Node/npm verzi,
- OS/architekturu,
- počet a stav workspace,
- seznam známých problémů.

---

# 5. FÁZE 2 — Security

Prohledej repository i historii na secrets, ale **nikdy nevypisuj jejich skutečné hodnoty do výsledku**.

Hledej:
- JWT secrets,
- DB passwords,
- API keys,
- static admin passwords,
- `.env`,
- fallback credentials.

Bezpečné pravidlo pro production Compose:

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
```

Zakázané:
- `change-me`
- `vzt_pass`
- `dev-super-secret`
- statické production credentials.

Navrhni bootstrap admina bez pevného hesla:
- jednorázový bootstrap secret,
- interaktivní CLI,
- nebo secret manager.

---

# 6. FÁZE 3 — Backend startup

Ověř:

```bash
cd apps/backend
npm run dev
```

Poté:

```bash
curl http://127.0.0.1:5000/health
```

Musí existovat jednoznačný health response.

Přidej bezpečný startup diagnostic output bez secret values.

Odděl:
- liveness,
- readiness,
- DB readiness.

---

# 7. FÁZE 4 — API contract

Najdi všechny kritické API responses.

Normalizuj response model.

Preferovaný tvar:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 0
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Frontend nesmí hádat, zda data jsou:
- `response`,
- `response.data`,
- `response.items`,
- `response.data.items`.

---

# 8. FÁZE 5 — Oprava `n.map is not a function`

Najdi skutečný source `.map()`:

```bash
grep -R "\.map(" apps/frontend/src \
  --include='*.js' \
  --include='*.jsx' \
  --include='*.ts' \
  --include='*.tsx'
```

Neopravuj minifikovaný build.

Pro každý kritický seznam:
- definuj očekávaný typ,
- validuj API response,
- používej bezpečné defaulty,
- přidej regression test.

Preferuj schema validation před náhodným `Array.isArray()` na každém místě.

---

# 9. FÁZE 6 — Database source of truth

Než změníš DB:

1. Prohlédni `schema.prisma`.
2. Prohlédni všechny SQL migrations.
3. Prohlédni repository/database access layer.
4. Porovnej skutečné DB schema.
5. Zapiš rozdíly.

**Zakázáno bez potvrzení:**
```bash
prisma db push
prisma migrate reset
DROP DATABASE
```

Rozhodnutí musí být jedno z:

### SQL-first

PostgreSQL ← SQL migrations ← `pg`

nebo:

### Prisma-first

PostgreSQL ← Prisma migrations ← Prisma Client

Pokud je zachováno `pg + SQL`, Prisma může zůstat pouze jako pomocný nástroj, ale nesmí existovat dvojí source of truth.

---

# 10. FÁZE 7 — Migration system

Zaveď ledger:

```sql
schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
)
```

Požadavky:
- idempotence,
- checksum,
- detekce změněné již aplikované migrace,
- bezpečný upgrade,
- čistá DB test,
- upgrade-existing-DB test.

Odděl:

```text
db:migrate
db:seed:system
db:bootstrap:admin
db:seed:demo
```

Demo data nesmí být automaticky součástí produkční migrace.

---

# 11. FÁZE 8 — Auth, RBAC a multi-tenancy

Otestuj:
- JWT,
- expiraci,
- invalid token,
- role,
- capabilities,
- project assignments,
- tenant isolation,
- privilege escalation.

Minimální test:

Company A user nesmí číst/modifikovat data Company B pouze změnou ID resource.

Testuj:
- projects,
- invoices,
- documents,
- attendance,
- daily logs,
- inventory,
- sync.

---

# 12. FÁZE 9 — Testovací infrastruktura

Backend musí mít standardní scripts:

```json
{
  "scripts": {
    "dev": "...",
    "start": "...",
    "lint": "...",
    "test": "...",
    "test:unit": "...",
    "test:integration": "...",
    "test:coverage": "...",
    "security": "...",
    "db:verify": "..."
  }
}
```

Test pyramid:

- Unit
- Integration
- E2E

Minimální regression suite:
- auth,
- permissions,
- projects,
- attendance,
- daily log,
- invoices,
- documents,
- import/export,
- sync,
- VZT calculations.

---

# 13. FÁZE 10 — CI/CD

Vytvoř GitHub Actions pouze jako PR, pokud není potvrzen deployment.

PR gate:

```text
npm ci
↓
lint
↓
unit tests
↓
integration tests
↓
build
↓
npm audit
↓
Docker build
↓
container scan
```

Dále:
- CodeQL,
- Dependabot/Renovate,
- branch protection,
- required checks.

CI musí testovat migrace na čistém PostgreSQL.

---

# 14. FÁZE 11 — Node.js / Docker

Ověř aktuální Node lifecycle.

Cíl:
- podporovaný LTS,
- stejná verze lokálně/CI/Docker.

Docker:
- `npm ci`,
- multi-stage build,
- minimální runtime,
- non-root user,
- healthcheck,
- žádné secrets v image,
- image scanning,
- SBOM,
- pokud možno pin digest.

Po změně Node/Docker:
- lint,
- tests,
- build,
- startup,
- DB integration,
- smoke test.

---

# 15. FÁZE 12 — PostgreSQL

Ověř aktuální minor release.

Zaveď:
- backup,
- restore test,
- connection pool monitoring,
- slow query analysis,
- `pg_stat_statements`,
- index review.

Při DB změnách nikdy neprováděj destruktivní operaci bez explicitního potvrzení.

---

# 16. FÁZE 13 — Offline / Sync

Definuj:
- operation ID,
- entity ID,
- device ID,
- version,
- timestamp,
- operation,
- payload.

Testuj:
- offline,
- reconnect,
- duplicate,
- retry,
- conflict,
- partial failure,
- concurrent edit.

`/api/sync` musí mít idempotentní processing.

---

# 17. FÁZE 14 — VZT calculator

Oprav nejprve ESLint problémy v:

```text
apps/frontend/src/features/vzt/calculations.js
```

Poté vytvoř regression dataset.

Testuj:
- piece lengths,
- projected runs,
- pressure drop,
- offsets,
- rooms,
- routes,
- units,
- zero values,
- decimals,
- boundary conditions.

Výpočty nesmí být měněny pouze kvůli uspokojení lint/testu bez ověření doménové správnosti.

---

# 18. FÁZE 15 — Performance

Měř před optimalizací.

Backend:
- P50,
- P95,
- P99,
- DB query latency,
- connection pool saturation.

Frontend:
- initial load,
- JS bundle size,
- render performance,
- API waterfall.

DB:
- slow queries,
- missing indexes,
- expensive joins.

Každá optimalizace musí mít před/po měření.

---

# 19. FÁZE 16 — Observability

Přidej:
- request ID,
- JSON logs,
- `/health/live`,
- `/health/ready`,
- metrics,
- error tracking.

Nikdy neloguj:
- passwords,
- JWT,
- API keys,
- DATABASE_URL,
- secret tokens.

---

# 20. FÁZE 17 — UI

Až po stabilizaci API.

Cíl:
- kompaktní UI,
- konzistentní spacing,
- design tokens,
- jednotné formuláře,
- jednotné tabulky,
- jednotné status badges,
- mobile responsive layout.

Neprováděj kompletní redesign současně s backend refactorem.

---

# 21. Release gate

Produkce je povolena pouze pokud:

- [ ] žádné known secrets v repository
- [ ] credentials rotated
- [ ] production fallback secrets odstraněny
- [ ] health/readiness funguje
- [ ] migrations prošly na čisté DB
- [ ] migrations prošly na upgrade DB
- [ ] auth testy
- [ ] RBAC testy
- [ ] tenant isolation testy
- [ ] sync testy
- [ ] frontend build
- [ ] regression test `n.map`
- [ ] VZT regression tests
- [ ] npm audit
- [ ] container scan
- [ ] backup
- [ ] restore test
- [ ] rollback postup
- [ ] CI green

---

# 22. Povinný formát AI reportu

Po každém pracovním kroku vrať:

## Zjištění
Co bylo nalezeno.

## Riziko
P0 / P1 / P2 / P3.

## Změna
Co bylo změněno.

## Soubory
Přesné cesty.

## Testy
Přesné příkazy + výsledek.

## Zbývá
Co ještě není vyřešeno.

## Git
- branch
- commit SHA
- změněné soubory

Nikdy netvrď, že je něco hotové bez skutečného testu.

---

# 23. Definition of Done

Úkol je hotový pouze pokud:

1. změna je implementovaná,
2. lint prošel,
3. relevantní testy prošly,
4. build prošel,
5. security kontrola prošla,
6. nebyla porušena API/DB kompatibilita,
7. dokumentace odpovídá skutečnosti,
8. změna je reprodukovatelná,
9. člověk může změnu snadno reviewovat.

---

# 24. Priorita

Používej:

### P0
Bezpečnostní incident / data loss / produkce nedostupná.

### P1
Blokující chyba nebo zásadní production-readiness problém.

### P2
Významný technický dluh / výkon / maintainability.

### P3
UX, kosmetika, refactoring bez bezprostředního rizika.

---

# 25. Závěrečné pravidlo

**Neoptimalizuj podle množství změněného kódu. Optimalizuj podle snížení rizika.**

Nejdříve:
`security → stability → database → tests → CI → runtime → performance → UX → new features`.

Každý nový feature musí mít:
- API contract,
- authorization,
- validation,
- tests,
- error handling,
- migration pokud je potřeba,
- dokumentaci,
- CI coverage.

