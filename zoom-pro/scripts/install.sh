#!/usr/bin/env bash
# Zoom Pro — jednotný instalátor (Linux / macOS / WSL)
# Použití: bash scripts/install.sh
set -euo pipefail

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Zoom Pro · Jednotná instalace v1.2.0"
echo "══════════════════════════════════════════════════════════"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# 1) Preflight — Node ≥ 20
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js není nainstalován. Nainstaluj z https://nodejs.org (verze ≥ 20)."
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Máš Node $(node -v). Potřebuji ≥ 20."
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 2) .env — root, backend, frontend, mobile
random_secret() { node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"; }

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak "s/change-me-please/$(random_secret)/" .env && rm -f .env.bak
  echo "✅ Vytvořen .env (root)"
fi

if [ ! -f apps/backend/.env ]; then
  cp apps/backend/.env.example apps/backend/.env
  SECRET=$(random_secret)
  sed -i.bak "s|dev-super-secret|$SECRET|" apps/backend/.env && rm -f apps/backend/.env.bak
  echo "✅ Vytvořen apps/backend/.env"
fi

if [ ! -f apps/frontend/.env ]; then
  cp apps/frontend/.env.example apps/frontend/.env
  echo "✅ Vytvořen apps/frontend/.env"
fi

if [ ! -f apps/mobile/.env ] && [ -f apps/mobile/.env.example ]; then
  cp apps/mobile/.env.example apps/mobile/.env
  echo "✅ Vytvořen apps/mobile/.env"
fi

# 3) Volitelný GEMINI_API_KEY
read -r -p "Zadej GEMINI_API_KEY (Enter = přeskočit): " GKEY || true
if [ -n "${GKEY:-}" ]; then
  echo "GEMINI_API_KEY=$GKEY" >> apps/backend/.env
  echo "✅ Uložen GEMINI_API_KEY"
fi

# 4) npm install (root workspace)
echo ""
echo "▶ Instaluji NPM balíky (root workspace)…"
npm install --no-audit --no-fund

# 5) Mobile — samostatný adresář
if [ -f apps/mobile/package.json ]; then
  echo ""
  echo "▶ Instaluji NPM balíky pro mobile…"
  (cd apps/mobile && npm install --no-audit --no-fund) || echo "⚠ Mobile install měl chyby — dokončí se ručně později."
fi

# 6) Databáze — auto-detect Docker
echo ""
DB_URL=$(grep '^DATABASE_URL' apps/backend/.env | cut -d= -f2-)
echo "▶ Zkouším připojení k DB: $DB_URL"

if node -e "
const {Client}=require('pg');
const c=new Client({connectionString:process.argv[1]});
c.connect().then(()=>c.end()).then(()=>process.exit(0)).catch(()=>process.exit(1));
" "$DB_URL" 2>/dev/null; then
  echo "✅ Databáze dostupná"
else
  if command -v docker >/dev/null 2>&1; then
    echo "⚠ Databáze není dostupná. Spouštím Docker Postgres…"
    docker compose up -d postgres || docker-compose up -d postgres
    sleep 5
  else
    echo "⚠ Databáze není dostupná a Docker chybí. Nainstaluj PostgreSQL a spusť skript znovu."
    exit 1
  fi
fi

# 7) Migrace
echo ""
echo "▶ Aplikuji všech 14 migrací…"
DATABASE_URL="$DB_URL" node scripts/db-migrate-all.mjs

# 8) Seed platform + demo
echo ""
echo "▶ Seed platform superadmin + demo data…"
DATABASE_URL="$DB_URL" node scripts/db-run-sql.mjs 005_seed_platform_superadmin.sql 006_seed_demo_profiles_and_records.sql || true

# 9) Volitelně seed distribuce
read -r -p "Chceš naseedovat i vzorový katalog & dodavatele? [y/N]: " SEED_DIST || true
if [ "${SEED_DIST:-N}" = "y" ] || [ "${SEED_DIST:-N}" = "Y" ]; then
  DATABASE_URL="$DB_URL" node scripts/seed-distribution.mjs
fi

# 10) Doctor
echo ""
echo "▶ Diagnostika prostředí…"
DATABASE_URL="$DB_URL" node scripts/doctor.mjs || true

cat <<EOF

══════════════════════════════════════════════════════════
✅ HOTOVO! Zoom Pro je nainstalován.

Spuštění:
  npm run dev              (frontend + backend paralelně)
  # nebo v Termuxu:
  bash scripts/termux/run-backend.sh
  bash scripts/termux/run-frontend.sh

Web:            http://localhost:5173
Backend API:    http://localhost:5000/health

Přihlášení:
  owner@platform.local  ·  PlatformOwner2026!
  reditel@demo.local    ·  Demo2026!
  vedouci@demo.local    ·  Demo2026!
  monter@demo.local     ·  Demo2026!

Mobilní APK:
  cd apps/mobile && npm run android:apk
══════════════════════════════════════════════════════════
EOF
