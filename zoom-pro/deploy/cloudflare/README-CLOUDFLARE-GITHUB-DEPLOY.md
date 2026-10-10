# Nasazení GitHub → Cloudflare (trvale online)

Cílová architektura „pushnu do GitHubu a je to online":

```
GitHub repo (main)
   ├─ GitHub Actions: cloudflare-pages-frontend.yml
   │    → build apps/frontend → Cloudflare Pages (web PWA, CDN, HTTPS, 24/7)
   └─ GitHub Actions: deploy.yml (po tagu v*)
        → SSH na VPS → docker compose prod → backend API + PostgreSQL
```

## 1. Frontend na Cloudflare Pages (nezávisí na doméně)
Cloudflare Pages přidělí veřejnou URL `https://zoom-pro.pages.dev` i bez vlastní domény.
1. V Cloudflare účtu vytvoř API token (My Profile → API Tokens → „Edit Cloudflare Workers/Pages" template).
2. V GitHub repozitáři přidej Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `VITE_API_URL` (URL backendu, zatím třeba dočasná)
3. Push do `main` → workflow `.github/workflows/cloudflare-pages-frontend.yml` sám buildne a nasadí.
4. Až bude doména: Pages → Custom domains → přidej `zoom-pro.app` (DNS se nastaví automaticky, protože doména bude v Cloudflare).

## 2. Backend + databáze (potřebuje server)
Backend (Express + PostgreSQL) na Pages nejde — potřebuje VPS:
1. Připrav Linux VPS (Ubuntu 22.04/24.04, Docker).
2. Naklonuj repo do `/opt/zoom-pro`, vytvoř `.env` z `.env.production.example`
   (nastav `JWT_SECRET`, hesla DB, `CORS_ORIGIN=https://zoom-pro.pages.dev` resp. doména).
3. `npm run docker:prod:up` — postaví postgres + backend + nginx frontend.
4. GitHub Secrets pro auto-deploy: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
   → workflow `deploy.yml` nasadí při tagu `v*`.

## 3. Doména (až bude připravená)
1. Přesuň DNS domény do Cloudflare (nameservery).
2. Pages → custom domain `zoom-pro.app`, `www.zoom-pro.app`.
3. Pro API buď subdoména `api.zoom-pro.app` → Cloudflare Tunnel na VPS
   (šablona: `deploy/windows/cloudflared-config.zoom-pro.app.yml`),
   nebo přímý A záznam na VPS s HTTPS (Caddy/Traefik/certbot).
4. Nastav `CORS_ORIGIN` na finální doménu a `VITE_API_URL` na `https://api.zoom-pro.app`.

## 4. Pořadí (podle aktuálního stavu)
1. ✅ Nejdřív dokončit kritické opravy aplikace (tento balík).
2. Push do GitHub → ověřit, že Pages build projde (zelený workflow).
3. Připravit VPS → docker prod → napojit `VITE_API_URL`.
4. Přidat doménu do Cloudflare → přepnout custom domains + API.
