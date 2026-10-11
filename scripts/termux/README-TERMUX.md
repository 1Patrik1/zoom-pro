# Zoom Pro — Termux (Android) & GitHub

## Rychlá instalace v Termuxu
```bash
pkg install -y git
git clone https://github.com/USER/zoom-pro.git
cd zoom-pro
bash scripts/termux/install.sh
```

Instalátor používá `scripts/db-migrate-all.mjs` a aplikuje všechny očíslované root SQL migrace (`001_*.sql` až aktuální `020_*.sql`). Přidání nové migrace nevyžaduje ručně udržovaný seznam v Termux skriptu.

## Spuštění
```bash
bash scripts/termux/run-backend.sh    # v jednom sessionu
bash scripts/termux/run-frontend.sh   # ve druhém (příkaz `session` v Termux menu)
```
Aplikace: http://localhost:5173

## GitHub sync z Termuxu
```bash
pkg install -y gh
gh auth login
bash scripts/termux/github-sync.sh git@github.com:USER/zoom-pro.git "moje změna"
```

## Poznámky
- PostgreSQL běží v Termuxu lokálně (initdb + pg_ctl).
- Mobilní FCM push v Termux lokálním vývoji vyžaduje stejné FCM údaje v `apps/backend/.env`; Android/iOS build navíc potřebuje nativní Firebase/APNs nastavení.
- Platební panel je zatím předkonfigurační; ostré platby nejsou zapojené.
- Když má telefon veřejnou IP nebo Cloudflare Tunnel, dá se to publikovat i navenek.
- Pro produkční nasazení použij `.github/workflows/deploy.yml` a nastav si v GitHub secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
