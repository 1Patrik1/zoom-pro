# FINIS — nasazení na VPS / produkční server

Tento dokument je finální nasazovací postup pro Zoom Pro na čistý Linux VPS server.

Cíl:
- běžící frontend přes nginx kontejner,
- běžící backend přes Node kontejner,
- PostgreSQL v Docker Compose,
- doména směřující na server,
- možnost následně doplnit HTTPS přes Cloudflare Tunnel / reverzní proxy / certbot podle zvoleného provozu.

---

## 1. Doporučený produkční model

Nejjednodušší a nejstabilnější varianta pro první ostrý provoz:

- 1x VPS (Ubuntu 24.04 LTS nebo Debian 12)
- Docker + Docker Compose
- aplikace spuštěná přes `docker-compose.prod.yml`
- port 80 publikovaný ven
- databáze neveřejná, jen interně v Compose síti

Architektura:

```text
Internet
  -> domena.cz
  -> VPS
     -> frontend (nginx, port 80)
        -> /api -> backend:5000
     -> backend (node/express)
     -> postgres:5432 (interni pouze v Docker siti)
```

---

## 2. Minimální server requirements

Doporučeno:
- 2 vCPU
- 4 GB RAM
- 30+ GB SSD
- Ubuntu 24.04 LTS

Minimum pro demo/staging:
- 1 vCPU
- 2 GB RAM
- 20 GB SSD

---

## 3. Příprava serveru

### Aktualizace systému

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalace Dockeru

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Přidání aktuálního uživatele do docker group

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4. Nahrání projektu na server

Například do:

```bash
/opt/zoom-pro
```

### Vytvoření adresáře

```bash
sudo mkdir -p /opt/zoom-pro
sudo chown -R $USER:$USER /opt/zoom-pro
cd /opt/zoom-pro
```

### Rozbalení ZIPu

Nahraj finální ZIP na server a rozbal:

```bash
unzip zoom-pro-final.zip
cd app-refactor-pack
```

---

## 5. Produkční konfigurace

### Vytvoř produkční env

```bash
cp .env.production.example .env
```

Pak uprav `.env`:

```env
POSTGRES_DB=vzt_system
POSTGRES_USER=vzt_user
POSTGRES_PASSWORD=SEM_DEJ_SILNE_DB_HESLO
JWT_SECRET=SEM_DEJ_VELMI_SILNY_SECRET
CORS_ORIGIN=http://app.tvoje-domena.cz
HTTP_PORT=80
```

### Poznámky
- `POSTGRES_PASSWORD` musí být silné heslo
- `JWT_SECRET` musí být dlouhý tajný string
- `CORS_ORIGIN` nastav přesně na veřejnou URL frontend domény

---

## 6. Spuštění finální verze

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Nebo přes npm script:

```bash
npm run docker:prod:up
```

### Kontrola stavu

```bash
docker compose -f docker-compose.prod.yml ps
```

### Logy

```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

## 7. DNS nastavení domény

V DNS nastav A record:

```text
app.tvoje-domena.cz -> IP_adresa_VPS
```

Pokud chceš jednu hlavní doménu bez subdomény:

```text
tvoje-domena.cz -> IP_adresa_VPS
```

Pak do `.env` dej odpovídající `CORS_ORIGIN`.

---

## 8. HTTPS varianty

### Varianta A — Cloudflare proxy
Nejrychlejší pro první ostrý provoz.

- doménu převeď pod Cloudflare
- zapni proxy (oranžový mrak)
- SSL mód nastav na `Flexible` nebo lépe `Full` podle dalších kroků

### Varianta B — reverzní proxy před Dockerem
Pokud už máš na serveru vlastní Nginx/Caddy/Traefik, nech frontend kontejner jen interně a publikuj přes centrální proxy.

### Varianta C — certbot na hostu
Pokud chceš klasický host-level nginx + Let's Encrypt, doporučuji nasadit centrální reverse proxy mimo app stack.

Pro první dokončení je nejpraktičtější **Cloudflare + Docker stack**.

---

## 9. Firewall

Pokud používáš UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Port 5432 neotvírej veřejně.

---

## 10. První produkční kontrola po nasazení

### Ověření kontejnerů

```bash
docker compose -f docker-compose.prod.yml ps
```

### Ověření frontendu

Otevři v browseru:

```text
http://app.tvoje-domena.cz
```

### Ověření backend health z hosta

```bash
curl http://127.0.0.1/health
```

nebo pokud testuješ backend kontejner:

```bash
docker exec -it zoom-pro-backend wget -qO- http://127.0.0.1:5000/health
```

### Přihlášení

```text
owner@platform.local
PlatformOwner2026!
```

Po prvním loginu doporučeno ihned změnit heslo v další implementační fázi.

---

## 11. Upgrade / update aplikace

Při nové verzi:

```bash
cd /opt/zoom-pro/app-refactor-pack
docker compose -f docker-compose.prod.yml down
# nahraj novy ZIP / aktualizuj soubory
docker compose -f docker-compose.prod.yml up -d --build
```

Pokud přibudou nové SQL migrace, musí být zařazené do migration kroku.

---

## 12. Záloha databáze

### Jednorázová záloha

```bash
docker exec -t zoom-pro-postgres pg_dump -U vzt_user vzt_system > backup.sql
```

### Obnova

```bash
cat backup.sql | docker exec -i zoom-pro-postgres psql -U vzt_user -d vzt_system
```

Doporučuji pravidelnou denní zálohu přes cron.

---

## 13. Go-live checklist

Před ostrým spuštěním zkontroluj:

- [ ] změněné produkční DB heslo
- [ ] změněný produkční JWT secret
- [ ] nastavená správná doména v `CORS_ORIGIN`
- [ ] frontend je dostupný přes veřejnou URL
- [ ] login SUPERADMIN funguje
- [ ] moduly documents/imports/exports/signatures se načítají
- [ ] databáze není veřejně vystavená
- [ ] běží zálohování DB
- [ ] je rozhodnuto, jak bude řešené HTTPS

---

## 14. Doporučené další kroky po finis nasazení

Po tomto FINIS kroku doporučuji už řešit jen provozní dotažení:

1. změna default přihlašovacích údajů
2. přidání správy hesla / resetu hesla
3. audit log kritických akcí
4. pravidelné DB zálohy
5. monitoring kontejnerů
6. HTTPS a doména napevno
7. další implementace enterprise částí exportů/importů/podpisů

---

## 15. Krátká verze finis nasazení

```bash
cd /opt/zoom-pro
unzip zoom-pro-final.zip
cd app-refactor-pack
cp .env.production.example .env
# uprav .env
docker compose -f docker-compose.prod.yml up -d --build
```

Aplikace pak poběží na portu definovaném v `HTTP_PORT`.
