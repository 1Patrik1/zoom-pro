# 🔥 Zoom Pro + Cloudflare Tunnel Setup na Windows

Tento průvodce ti provede nastavením **Zoom Pro s Cloudflare Tunnel** na Windows bez Docker.

---

## 📋 Předpoklady

- ✅ Windows 10/11
- ✅ Node.js 20+ (https://nodejs.org)
- ✅ PostgreSQL 15+ (https://www.postgresql.org/download/windows/)
- ✅ Git (https://git-scm.com)
- ✅ Cloudflare účet (zdarma: https://dash.cloudflare.com)
- ✅ Doména na Cloudflare (nebo subdoména)

---

## 🔧 KROK 1: PostgreSQL nastavení na Windows

### Instalace PostgreSQL

1. **Stáhni**: https://www.postgresql.org/download/windows/
2. **Spusť installer** → Next → Next
3. **Password**: Zapamatuj si heslo (např. `PostgresPassword123!`)
4. **Port**: Nech default `5432`
5. **Finish** → PostgreSQL běží jako služba

### Vytvoření DB

Otevři **pgAdmin** (je součástí PostgreSQL) nebo příkazový řádek:

```bash
# PowerShell jako Admin
cd "C:\Program Files\PostgreSQL\15\bin"

# Přihlášení
psql -U postgres

# V psql konoli:
CREATE USER vzt_user WITH PASSWORD 'tvoje_silna_hesla_123!';
CREATE DATABASE vzt_system OWNER vzt_user;
ALTER ROLE vzt_user WITH CREATEDB;
\q
```

---

## 🔓 KROK 2: Naklonování projektu

```bash
# Otevři PowerShell v ~/OneDrive nebo kde chceš
cd "$env:USERPROFILE\OneDrive"

# Klonuj repo
git clone https://github.com/1Patrik1/zoom-pro.git
cd zoom-pro
```

---

## ⚙️ KROK 3: Environment setup

### 3.1 Backend (.env)

```bash
# Kopíruj template
Copy-Item apps/backend/.env.example apps/backend/.env

# Edituuj v editoru (Notepad++ nebo VS Code)
notepad apps/backend/.env
```

**Obsah `apps/backend/.env`:**

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://vzt_user:tvoje_silna_hesla_123!@127.0.0.1:5432/vzt_system
JWT_SECRET=GenerujSuperSilneHeslo123456789!@#$%^&*
CORS_ORIGIN=https://app.tvoje-domena.cz,https://api.tvoje-domena.cz
APP_NAME=zoom-pro
TRUST_PROXY=true
PG_POOL_MAX=20
PG_IDLE_TIMEOUT_MS=30000
```

### 3.2 Frontend (.env)

```bash
Copy-Item apps/frontend/.env.example apps/frontend/.env
notepad apps/frontend/.env
```

**Obsah `apps/frontend/.env`:**

```env
VITE_API_URL=https://api.tvoje-domena.cz
VITE_CHAT_URL=https://api.tvoje-domena.cz
VITE_APP_NAME=Zoom Pro
```

---

## 📦 KROK 4: Instalace balíčků

```bash
# V kořeni projektu
npm install

# Můžeš koukat na progress
# Trvá cca 3-5 minut
```

---

## 🗄️ KROK 5: Migrace databáze

```bash
# Spusť všechny migrace + seedy najednou
npm run db:setup:full

# Nebo v případě potíží postupně:
# npm run db:migrate:all
# npm run db:seed:platform
# npm run db:seed:demo
```

**Output by měl být bez chyb.** Zkontroluj v pgAdmin, že `vzt_system` DB existuje.

---

## 🚀 KROK 6: Spuštění lokálně (bez Tunnel zatím)

Otevři **3 PowerShell terminály**:

### Terminal 1: Backend

```bash
cd ~/OneDrive/zoom-pro
npm run dev:backend
# ✅ Měl by běžet na http://localhost:5000
```

### Terminal 2: Frontend

```bash
cd ~/OneDrive/zoom-pro
npm run dev:frontend
# ✅ Měl by běžet na http://localhost:5173
```

### Terminal 3: Zkouška

```bash
# Zkus se přihlásit
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"owner@platform.local","password":"PlatformOwner2026!"}'

# Měl bys dostat JWT token
```

**V prohlížeči:** http://localhost:5173

---

## 🌐 KROK 7: Cloudflare Tunnel setup

### 7.1 Instalace Cloudflared

**Možnost A: Přes Chocolatey (pokud máš)**

```bash
choco install cloudflare-warp
```

**Možnost B: Stažení přímo**

```bash
# Stáhni z: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/local/
# Windows 64-bit: cloudflared-windows-amd64.exe

# Přejmenuj a přesuň do: C:\Users\SF\cloudflared.exe
# Nebo kdekoli, a přidej do PATH
```

### 7.2 Přihlášení Cloudflare

```bash
# Otevři PowerShell
cloudflared.exe tunnel login

# Prohlížeč se otevře → přihlaš se do Cloudflare
# Povolíš účet → vygeneruje se certifikát
```

### 7.3 Vytvoření tunelu

```bash
cloudflared.exe tunnel create zoom-pro-tunnel

# Output bude vypadat takto:
# Tunnel credentials have been saved to C:\Users\SF\.cloudflared\<uuid>.json

# Poznamenej si UUID!
```

### 7.4 Konfigurační soubor

Vytvoř soubor: `C:\Users\SF\.cloudflared\config.yml`

```yaml
tunnel: zoom-pro-tunnel
credentials-file: C:\Users\SF\.cloudflared\<TVUJ_UUID>.json

logfile: C:\Users\SF\.cloudflared\tunnel.log
loglevel: info

ingress:
  # Frontend
  - hostname: app.tvoje-domena.cz
    service: http://localhost:5173
    originRequest:
      connectTimeout: 30s

  # Backend API
  - hostname: api.tvoje-domena.cz
    service: http://localhost:5000
    originRequest:
      connectTimeout: 30s
      headers:
        X-Forwarded-Proto: https

  # Health check
  - hostname: health.tvoje-domena.cz
    service: http://localhost:5000/health
    originRequest:
      connectTimeout: 10s

  # Fallback
  - service: http_status:404
```

**Nahraď `tvoje-domena.cz` svou doménou!**

### 7.5 DNS v Cloudflare Dashboard

Jdi do **Cloudflare Dashboard** → DNS:

1. **Přidej CNAME record:**
   - Type: `CNAME`
   - Name: `app`
   - Content: `zoom-pro-tunnel.cfargotunnel.com`
   - Proxy: ☑️ Proxied (oranžový oblak)

2. **Přidej CNAME record:**
   - Type: `CNAME`
   - Name: `api`
   - Content: `zoom-pro-tunnel.cfargotunnel.com`
   - Proxy: ☑️ Proxied

3. **Přidej CNAME record:**
   - Type: `CNAME`
   - Name: `health`
   - Content: `zoom-pro-tunnel.cfargotunnel.com`
   - Proxy: ☑️ Proxied

Počkej cca **1-2 minut**, až se DNS propaguje.

---

## 🔗 KROK 8: Spuštění Cloudflare Tunnel

```bash
# Terminal 4 (nový)
cloudflared.exe tunnel run zoom-pro-tunnel

# Měl bys vidět:
# 2026-10-04T15:30:00Z INF Connected to LHR
# 2026-10-04T15:30:01Z INF Registered tunnel connection
```

**Tunnel teď běží!** ✅

---

## ✅ KROK 9: Testování

### V prohlížeči

```
https://app.tvoje-domena.cz
```

Měl bys vidět Zoom Pro login.

### Health Check

```
https://health.tvoje-domena.cz
```

Měl bys vidět: `{"ok":true}`

### API test (PowerShell)

```powershell
curl -X POST https://api.tvoje-domena.cz/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"owner@platform.local","password":"PlatformOwner2026!"}'
```

Měl bys dostat JWT token.

### Přihlášení do aplikace

```
Email: owner@platform.local
Heslo: PlatformOwner2026!
```

---

## 📊 KROK 10: Monitoring aHealth Checks

### 10.1 Cloudflare Health Checks

V **Cloudflare Dashboard** → HTTP Health Checks:

1. Vytvoř health check na `https://health.tvoje-domena.cz`
2. Check interval: 60 sekund
3. Timeout: 10 sekund

### 10.2 Logy Cloudflared

```bash
# V terminále kde běží tunnel:
tail -f C:\Users\SF\.cloudflared\tunnel.log
```

---

## 🔄 KROK 11: Automatické spuštění (Systemd / Task Scheduler)

### Na Windows (Task Scheduler)

```powershell
# PowerShell jako Admin

# 1. Vytvoř Task Scheduler job
$action = New-ScheduledTaskAction -Execute "C:\Users\SF\cloudflared.exe" `
  -Argument "tunnel run zoom-pro-tunnel" `
  -WorkingDirectory "C:\Users\SF"

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal -UserID "SYSTEM" `
  -RunLevel Highest

Register-ScheduledTask -TaskName "CloudflareTunnel-ZoomPro" `
  -Action $action -Trigger $trigger -Principal $principal

# 2. Testuj
Start-ScheduledTask -TaskName "CloudflareTunnel-ZoomPro"
```

---

## 🎯 Shrnutí

| Krok | Příkaz | Port |
|------|--------|------|
| 1 | PostgreSQL installer | 5432 |
| 2 | `git clone` | - |
| 3 | `notepad .env` | - |
| 4 | `npm install` | - |
| 5 | `npm run db:setup:full` | 5432 |
| 6 | `npm run dev:backend` | 5000 |
| 6 | `npm run dev:frontend` | 5173 |
| 7 | `cloudflared.exe tunnel login` | - |
| 7 | `cloudflared.exe tunnel create` | - |
| 8 | `cloudflared.exe tunnel run` | - |
| ✅ | `https://app.tvoje-domena.cz` | 443 |

---

## 🆘 Troubleshooting

### "Cannot find module 'express'"

```bash
# Zkus znovu
npm install
npm install -w apps/backend
```

### "Database connection refused"

```bash
# Zkontroluj PostgreSQL
# Windows Services → PostgreSQL
# Nebo restartuj:
net stop "postgresql-x64-15"
net start "postgresql-x64-15"
```

### "Tunnel connection failed"

```bash
# Zkontroluj config.yml:
notepad C:\Users\SF\.cloudflared\config.yml

# Restartuj tunnel:
# Ctrl+C v Powershellu, pak znovu:
cloudflared.exe tunnel run zoom-pro-tunnel
```

### "CORS errors v aplikaci"

Zkontroluj `apps/backend/.env`:
```env
CORS_ORIGIN=https://app.tvoje-domena.cz,https://api.tvoje-domena.cz
```

---

## 📞 Hotline Checklist

- ✅ PostgreSQL běží na `5432`
- ✅ Backend běží na `5000`
- ✅ Frontend běží na `5173`
- ✅ Cloudflared běží
- ✅ DNS CNAME rekordy jsou nastaveny
- ✅ `https://health.tvoje-domena.cz` vrátí `{"ok":true}`
- ✅ Přihlášení `owner@platform.local` funguje

---

**Hotovo! 🎉**

Tvoje aplikace je teď online přes Cloudflare Tunnel!
