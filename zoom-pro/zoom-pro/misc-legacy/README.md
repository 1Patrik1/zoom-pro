# misc-legacy — osamocené soubory z nahrání

Tyto soubory NEJSOU součástí běžící aplikace Zoom Pro (monorepo apps/*):

- `vite.config.ts`, `tsconfig.json`, `index.html` (root), `firebase-applet-config.json`,
  `metadata.json`, `prisma.compute.json` — zbytky starší varianty projektu z Google AI Studio
  (pwa-vzt-system, TypeScript + Prisma + Firebase). Současná aplikace je React+Vite (JS)
  monorepo a tyto soubory nepoužívá.
- `server_startup.log` — log ze staré varianty (chyba „Port 24678 is already in use" =
  dva vývojové servery současně na stejném Vite WebSocket portu; po zavření prvního
  instance zmizí).
- `check_data.sql`, `list_users.sql`, `desc_*.sql` — diagnostické dotazy.
- `seed_demo_users.sql` — POZOR: obsahuje zástupný (neplatný) bcrypt hash, po spuštění
  by se demo uživatelé NEŠLI přihlásit. Nepoužívat; správný seed je 006_seed_demo_profiles_and_records.sql.
