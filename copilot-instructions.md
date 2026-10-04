# GitHub Copilot Instructions — ZOOM-PRO

## Repository

Primary repository: `1Patrik1/zoom-pro`.

Ignore `zoom-pro.app` and `zoom-pro.app-` unless explicitly requested.

The complete implementation roadmap is in:

`AI-IMPLEMENTATION-MASTER-PLAN.md`

## Non-negotiable rules

1. Inspect before modifying.
2. Never make destructive database/Git changes without explicit approval.
3. Never commit secrets.
4. Treat previously exposed credentials as compromised.
5. Keep changes small and reviewable.
6. Preserve API and database compatibility unless the task explicitly requires a migration.
7. Run relevant tests after every code change.
8. Do not claim completion without test evidence.
9. Prefer root-cause fixes over defensive symptom suppression.
10. If uncertain about schema, API, security, or migration ownership, stop and explain the ambiguity.

## Priority order

P0 security → P1 stability → database/migrations → tests → CI/CD → runtime/Docker → authorization/tenant isolation → sync → domain calculations → performance → observability → UI → new features.

## Known regressions to verify

- `/api/sync` previously returned Vite proxy `ECONNREFUSED 127.0.0.1:5000`.
- Frontend previously crashed with `TypeError: n.map is not a function`.
- ESLint previously reported useless assignments in `apps/frontend/src/features/vzt/calculations.js`.
- Prisma/Android previously had an architecture mismatch between AArch64 device and x86_64 engine.
- Production configuration previously contained unsafe secret fallbacks.
- Public SUPERADMIN credentials must never be restored.

## Database

Before changing migrations:

1. inspect `schema.prisma`;
2. inspect SQL migrations;
3. inspect database access code;
4. identify the source of truth;
5. document differences.

Never run destructive reset commands automatically.

## Testing

Every new feature should include, as applicable:

- validation tests,
- authorization tests,
- unit tests,
- integration tests,
- migration tests,
- frontend regression tests,
- error-path tests.

## Completion criteria

A change is done only when:

- code is implemented,
- lint passes,
- relevant tests pass,
- build passes,
- security implications are checked,
- documentation matches reality,
- no unapproved destructive action was taken.
