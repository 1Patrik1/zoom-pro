# Nasazení GitHub → Cloudflare → zoom-pro.app (trvale online)

Cílová architektura „pushnu do GitHubu a je to online":

```
GitHub repo (main)
   ├─ GitHub Actions: cloudflare-pages-frontend.yml
   │    → build apps/frontend → Cloudflare Pages (web PWA, CDN, HTTPS, 24/7)
   │      doména: zoom-pro.app + www.zoom-pro.app
   └─ GitHub Actions: deploy.yml (po tagu v*)
        → SSH na VPS → docker compose prod → backend API + PostgreSQL
          doména: api.zoom-pro.app
```

> Backend (Express + PostgreSQL) **nelze** hostovat na Cloudflare Pages —
> Pages hostuje jen statický frontend. Backend běží na VPS (deploy.yml)
> nebo na existujícím Windows stroji přes Cloudflare Tunnel
> (šablony v `deploy/windows/`). V obou případech směřuje
> `api.zoom-pro.app` na tenhle server.

## 1. Vložení projektu na GitHub
1. `git init && git add . && git commit -m "Zoom Pro"` (`.env` reálné soubory
   zůstávají lokální — `.gitignore` je blokuje; `*.example` šablony jdou nahoru).
2. Vytvoř repozitář na GitHubu a pushni (`git remote add origin … && git push -u origin main`).

## 2. Frontend na Cloudflare Pages (nezávisí na doméně)
1. Cloudflare → My Profile → API Tokens → šablona „Edit Cloudflare Workers/Pages".
2. GitHub repo → Settings → Secrets and variables → Actions:
   | Secret | Hodnota |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | token z kroku 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → pravý sloupec |
   | `VITE_API_URL` | `https://api.zoom-pro.app` |
3. Push do `main` → workflow sám buildne a nasadí na `zoom-pro.pages.dev`.

## 3. Backend + databáze
**Varianta A — VPS:** Ubuntu 22.04/24.04 + Docker → `git clone` do `/opt/zoom-pro`
→ `.env` z `.env.production.example` (silná hesla, `JWT_SECRET` 64 hex znaků)
→ `npm run docker:prod:up`. GitHub Secrets: `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY` → workflow `deploy.yml` nasazuje při tagu `v*`.

**Varianta B — vlastní Windows stroj + Cloudflare Tunnel:** `deploy/windows/`
(`install-cloudflared-service-zoom-pro.app.ps1`, `cloudflared-config.zoom-pro.app.yml`).

## 4. Doména zoom-pro.app
1. Doména musí mít nameservery Cloudflare (přidání domény v dashboardu).
2. Pages → projekt `zoom-pro` → Custom domains → `zoom-pro.app` i `www.zoom-pro.app`
   (DNS se vytvoří automaticky).
3. `api.zoom-pro.app` → CNAME na tunel (varianta B) nebo A záznam na VPS (varianta A), Proxy ON.
4. `CORS_ORIGIN` a `VITE_API_URL` už jsou na tyto domény nastavené v `.env` šablonách.

## 5. Kontrolované .env soubory (kolo 13)
| Soubor | Stav |
|---|---|
| `.env`, `apps/backend/.env` | lokální vývoj, v .gitignore — na GitHub nepatří |
| `.env.example`, `apps/*/.env.example` | vývojové šablony, jdou na GitHub |
| `*.env.production.example` | produkční šablony s doménami zoom-pro.app, jdou na GitHub |
| `apps/frontend/public/_redirects` | SPA fallback pro Cloudflare Pages (nové) |
| CORS_ORIGIN parsování | opraveno na pole (více domén) |
