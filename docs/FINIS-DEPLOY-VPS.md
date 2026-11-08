# FINIS — produkční nasazení Zoom Pro

## Aktuální produkční cílový model

- Frontend/PWA: Cloudflare Pages, projekt `zoom-pro`.
- Backend: samostatná Node.js / Express služba na VPS.
- Databáze: PostgreSQL v privátní Docker síti.
- API hostname: Cloudflare Tunnel do backendu na `127.0.0.1:5000`.

Cloudflare D1 / Worker není zatím integrovaný do hlavní aplikace. PostgreSQL zůstává autoritativní databází.

## 1. VPS a Docker

Doporučené minimum:
- Ubuntu 24.04 LTS nebo Debian 12,
- 2 vCPU, 4 GB RAM, 30 GB SSD,
- Docker Engine + Docker Compose v2.

Repo musí být na VPS v `/opt/zoom-pro`.

## 2. Produkční environment

```bash
cd /opt/zoom-pro
cp .env.production.example .env
```

V `.env` nastav skutečné hodnoty:
- `POSTGRES_PASSWORD`: unikátní silné heslo,
- `JWT_SECRET`: unikátní náhodný řetězec alespoň 32 znaků,
- `CORS_ORIGIN`: přesná doména Cloudflare Pages,
- `BACKEND_PORT=5000`,
- `INITIAL_ADMIN_PASSWORD`: jen pro první vytvoření nebo rotaci SUPERADMIN (min. 20 znaků).

Hodnoty `.env` nikdy necommituj.

## 3. První start

```bash
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 migrate backend
```

Compose:
1. spustí PostgreSQL a počká na jeho health check,
2. nainstaluje zamčené workspace závislosti přes `npm ci`,
3. spustí `scripts/db-migrate-all.mjs`,
4. bezpečně vytvoří nebo zkontroluje SUPERADMIN,
5. spustí backend až po úspěšných migracích.

Backend je publikován pouze na `127.0.0.1:5000`. PostgreSQL nemá veřejný port. Po prvním úspěšném provisioningu odstraň `INITIAL_ADMIN_PASSWORD` z hostitelského `.env`.

## 4. Cloudflare Pages a API Tunnel

Cloudflare Pages workflow:
- build command: `npm run build -w apps/frontend`,
- output: `apps/frontend/dist`,
- Pages project: `zoom-pro`.

GitHub Actions secrets pro Pages:
- `CLOUDFLARE_API_TOKEN`,
- `CLOUDFLARE_ACCOUNT_ID`,
- volitelně `VITE_API_URL` (výchozí `https://api.zoom-pro.app`).

Cloudflare Tunnel route pro API:
```yaml
ingress:
  - hostname: api.zoom-pro.app
    service: http://127.0.0.1:5000
  - service: http_status:404
```

Nastav backend `CORS_ORIGIN` na přesnou Pages doménu. API testuj přes:
- `GET https://api.zoom-pro.app/health`,
- `GET https://api.zoom-pro.app/ready`.

## 5. Automatický backend deploy

Workflow `.github/workflows/deploy.yml` spouštěj až po úspěšném CI, typicky tagem `v*`.

GitHub Actions secrets:
- `DEPLOY_HOST`,
- `DEPLOY_USER`,
- `DEPLOY_SSH_KEY`,
- `INITIAL_ADMIN_PASSWORD` pouze při prvním seedu nebo rotaci původního veřejně známého hesla.

Workflow nasazuje přesný commit SHA, spouští migrace a čeká na backend health check. Chyba migrace nebo health checku deploy zastaví; není potlačena.

## 6. SUPERADMIN

Nová instalace vytváří účet `owner@platform.local` bez veřejného výchozího hesla. Počáteční heslo je náhodné a při neinteraktivním deployi se předává jako chráněný secret; nikdy se nevypisuje do CI logů.

Pro existující databázi lze bezpečně ověřit a případně otočit pouze staré veřejně známé heslo:

```bash
npm run db:rotate:public-admin
```

Tento příkaz nespouští ostatní SQL seedy. Pokud již bylo heslo změněno, zachová ho.

## 7. Bezpečnostní checklist

- [ ] PostgreSQL port 5432 není veřejný.
- [ ] Backend port 5000 je dostupný pouze na loopback hosta.
- [ ] Cloudflare Tunnel publikuje jen API hostname.
- [ ] `CORS_ORIGIN` obsahuje přesnou Pages doménu, nikoliv wildcard.
- [ ] JWT secret má alespoň 32 náhodných znaků.
- [ ] DB password je unikátní.
- [ ] `INITIAL_ADMIN_PASSWORD` je po prvním provisioningu odstraněn.
- [ ] Cloudflare API token má jen Pages deployment oprávnění.
- [ ] SSH deploy používá samostatný klíč a omezený účet.
- [ ] Databáze má pravidelné zálohy a ověřenou obnovu.
- [ ] `/health` i `/ready` vracejí očekávané výsledky.

## 8. Zálohy

Před každým produkčním nasazením doporučuji zálohu:

```bash
docker exec -t zoom-pro-postgres pg_dump -U vzt_user vzt_system > backup-$(date +%F-%H%M).sql
```

Obnovu nejprve ověř na staging databázi. Nikdy netestuj obnovu přepsáním jediné produkční kopie.

## 9. Zakázané automatické kroky

Bez samostatného schválení neprováděj:
- produkční přepnutí PostgreSQL → D1,
- mazání PostgreSQL databáze nebo volume,
- změny DNS / Cloudflare Tunnel hostnames,
- rotaci produkčního JWT secretu,
- nevratné migrace dat.

