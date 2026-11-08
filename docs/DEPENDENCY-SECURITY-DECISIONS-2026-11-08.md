# Dependency security decision — 2026-11-08

## Evidence

GitHub Actions generated clean-install audit reports from the committed lockfiles.

| Scope | Total findings | High | Critical |
|---|---:|---:|---:|
| Root workspaces | 2 moderate | 0 | 0 |
| Mobile | 8 (6 moderate, 2 low before the patch below) | 0 | 0 |

All findings in these reports are in development/build tooling; the reports do not identify a vulnerable production runtime dependency.

## Applied in this PR

- Mobile `deepmerge` is pinned through npm overrides to patched `4.3.2` (the prior lockfile contained `4.3.1`).
- CI uses `npm ci` and retains separate root/mobile audit artifacts.
- No `npm audit fix --force`, `--legacy-peer-deps`, or unreviewed major upgrade is used.

## Temporarily accepted compatibility risk

1. Root: `nodemon` resolves `minimatch` 10.x. The advisory is fixed at `11.0.1+`, but the current `nodemon` dependency range is `^10.2.1`. Forcing a major transitive override without a dedicated test is not justified for a development-only tool.
2. Mobile: Capacitor 6 CLI uses `rimraf 4` / `glob 9` / `minimatch 8`. npm's automatic fix proposes Capacitor CLI 8.6.0, which is a major platform upgrade and conflicts with this repository's intentionally aligned Capacitor 6 native plugins.
3. Mobile: `vite-plugin-pwa 2.0.0` pulls Workbox build tooling with affected `glob` / `minimatch` ranges. The automatic npm suggestion downgrades the PWA plugin across a major version boundary; that is not accepted without a Vite 8/PWA integration test.

These are development/build-time findings, not a claim that the packages are risk-free. Keep the audit gate visible and resolve them as part of a separately tested Capacitor 8 / Workbox dependency upgrade. Re-run the audit after every lockfile change.

## Release gate

- No high or critical finding may remain unresolved.
- Moderate/low development-only findings require a recorded compatibility decision and must not be hidden with npm audit flags.
- Production runtime dependency findings must be fixed or explicitly blocked before deployment.
