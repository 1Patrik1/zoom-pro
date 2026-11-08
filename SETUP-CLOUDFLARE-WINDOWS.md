# Zoom Pro — Cloudflare Pages + samostatný backend

Tento postup odpovídá aktuálnímu repozitáři `1Patrik1/zoom-pro`.

## Cílová architektura

- **Frontend/PWA:** Cloudflare Pages, projekt `zoom-pro`.
- **Backend:** Node.js / Express na samostatném VPS.
- **Databáze:** PostgreSQL v privátní Docker síti na VPS.
- **Veřejné API:** Cloudflare Tunnel → `http://127.0.0.1:5000`.
- **D1 / Cloudflare Worker:** není součástí tohoto nasazení; migrace PostgreSQL na D1 se nesmí považovat za dokončenou.

Frontend a backend se nasazují odděleně. PostgreSQL port 5432 se nikdy nevystavuje do internetu.

## 1. Cloudflare Pages

V Cloudflare Dashboard vytvoř Pages projekt s názvem `zoom-pro` a připoj GitHub repository `1Patrik1/zoom-pro`.

Workflow `.github/workflows/cloudflare-pages-frontend.yml` provádí:
- instalaci přes `npm ci`,
- build `npm run build -w apps/frontend`,
- deploy složky `apps/frontend/dist`.

Nastav v GitHub → Settings → Secrets and variables → Actions:

| Secret | Význam |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token s oprávněním Cloudflare Pages: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | ID Cloudflare účtu |
| `VITE_API_URL` | Veřejná základní URL backendu, např. `https://api.zoom-pro.app` |

`VITE_API_URL` je volitelný; workflow má výchozí hodnotu `https://api.zoom-pro.app`. Pokud používáš jinou API doménu, nastav secret.

Pages deploy se spouští po pushi do `main`, případně ručně přes `workflow_dispatch`. Před publikací čeká na úspěšné hlavní CI a oba dependency-audit joby pro tentýž commit.

## 2. Backend a PostgreSQL na VPS

Na serveru musí být Docker Engine a Docker Compose v2. Repo umísti do `/opt/zoom-pro`.

Vytvoř produkční konfiguraci:

```bash
cd /opt/zoom-pro
cp .env.production.example .env
```

Uprav `.env`:
- `POSTGRES_PASSWORD`: unikátní náhodné heslo v hex formátu (např. `openssl rand -hex 32`, aby šlo bezpečně vložit do `DATABASE_URL`).
- `JWT_SECRET`: náhodný tajný klíč alespoň 32 znaků (např. `openssl rand -hex 32`).
- `CORS_ORIGIN`: přesná veřejná URL Cloudflare Pages (bez API domény); pro nativní Capacitor klienty případně přidej `capacitor://localhost,https://localhost`.
- `BACKEND_PORT=5000`.
- `INITIAL_ADMIN_PASSWORD`: jen pro první vytvoření/rotaci SUPERADMIN; nejméně 20 znaků.

Backend se mapuje pouze na `127.0.0.1:5000`; databáze není veřejně dostupná.

Spuštění ručně:

```bash
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 migrate backend
```

Compose nejprve spustí PostgreSQL, potom migrace a bezpečné vytvoření/ověření účtu SUPERADMIN. Backend se spustí až po úspěšných migracích. Před dokončením prvního seedu musí být dostupné `INITIAL_ADMIN_PASSWORD`; v neinteraktivním Docker běhu se heslo nikdy nevypisuje do logů.

Po prvním úspěšném vytvoření účtu smaž `INITIAL_ADMIN_PASSWORD` z hostitelského `.env`. Již nastavené heslo se při dalších deployích nemění.

## 3. Cloudflare Tunnel pro API

Vytvoř Tunnel a nastav veřejný hostname, například `api.zoom-pro.app`, na lokální službu:

```yaml
ingress:
  - hostname: api.zoom-pro.app
    service: http://127.0.0.1:5000
  - service: http_status:404
```

Cloudflare DNS záznam vytvoř přes Tunnel route / Dashboard. Nezveřejňuj port 5432. Backend má:
- `GET /health` — procesní health check,
- `GET /ready` — kontrola dostupnosti PostgreSQL.

Ověř:
- `https://api.zoom-pro.app/health`,
- `https://api.zoom-pro.app/ready`.

## 4. GitHub Actions deploy backendu

Workflow `.github/workflows/deploy.yml` se spouští tagem `v*` nebo ručně. Nasazuje přesný commit SHA, nikoliv neurčitý aktuální `main`.

Nastav GitHub Actions secrets:

| Secret | Význam |
|---|---|
| `DEPLOY_HOST` | SSH host VPS |
| `DEPLOY_USER` | SSH uživatel |
| `DEPLOY_SSH_KEY` | privátní SSH klíč |
| `INITIAL_ADMIN_PASSWORD` | pouze při prvním seedu nebo rotaci známého původního hesla |

Při deployi workflow:
1. checkoutne přesný commit na VPS,
2. spustí Compose a databázové migrace,
3. bezpečně ověří/provisionuje SUPERADMIN,
4. čeká na stav backendu `healthy`,
5. při chybě vypíše logy a ukončí deploy neúspěšně.

Po prvním úspěšném provisioningu můžeš secret `INITIAL_ADMIN_PASSWORD` z GitHubu odstranit. Následující deploye již zachovají existující heslo.

## 5. CORS a frontend

Nastav:
- Cloudflare Pages build variable `VITE_API_URL=https://api.zoom-pro.app`,
- backend `CORS_ORIGIN=https://<TVA_PAGES_DOMENA>`.

`CORS_ORIGIN` přijímá více povolených originů oddělených čárkami. Nepoužívej wildcard `*` v produkci.

## 6. Bezpečnostní pravidla

- Necommituj `.env`, Cloudflare tokeny, Tunnel credentials, SSH klíče ani FCM service account.
- PostgreSQL port 5432 zůstává jen v interní Docker síti.
- Backend port 5000 je mapován jen na loopback hosta.
- Nepoužívej Cloudflare SSL režim Flexible. Pro Tunnel se TLS ukončuje na Cloudflare edge; pro klasický origin zvol Full (strict) s platným certifikátem.
- Produkční PostgreSQL zůstává autoritativní, dokud nebude samostatně schválena a otestována migrace dat do D1.
