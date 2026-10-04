#!/usr/bin/env bash
# ==============================================================================
# Zoom Pro — Automated Agent Setup & Restoration Script
# ==============================================================================
set -e

echo "🚀 [Zoom Pro Agent Setup] Zahajuji automatickou obnovu a konfiguraci..."

# 1. Kontrola Node.js prostředí
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Chyba: Vyžadována verze Node.js >= 20. Detekováno: $NODE_VERSION"
    exit 1
fi
echo "✅ Node.js verze v$(node -v) v pořádku."

# 2. Vytvoření kořenového package.json pokud chybí
if [ ! -f "package.json" ]; then
    echo "📦 Vytvářím kořenový package.json pro workspaces..."
    cat << 'EOF' > package.json
{
  "name": "zoom-pro-root",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "doctor": "node scripts/doctor.mjs",
    "db:migrate": "node scripts/db-migrate-all.mjs",
    "docker:prod:up": "docker compose -f docker-compose.prod.yml up -d --build",
    "docker:prod:down": "docker compose -f docker-compose.prod.yml down"
  }
}
EOF
fi

# 3. Vytvoření .env souboru pokud chybí
if [ ! -f ".env" ]; then
    echo "🔑 Vytvářím výchozí .env soubor..."
    cat << 'EOF' > .env
POSTGRES_USER=vzt_user
POSTGRES_PASSWORD=vzt_pass
POSTGRES_DB=vzt_system
DATABASE_URL="postgresql://vzt_user:vzt_pass@localhost:5432/vzt_system?schema=public"
JWT_SECRET="komplexni-kryptograficky-klic-pro-podpisy-zoom-pro-2026"
CORS_ORIGIN="http://localhost:5173,capacitor://localhost,https://localhost"
GEMINI_API_KEY="platny_api_klic_pro_vision_ai"
EOF
fi

# 4. Instalace monorepo závislostí
echo "📥 Instaluji závislosti v monorepu..."
npm install || bun install

# 5. Spuštění PostgreSQL v Dockeru
echo "🐘 Startuji PostgreSQL databázi v Dockeru..."
docker compose up -d postgres || true

# 6. Spuštění databázových migrací
echo "🗄️ Provádím 14 databázových migrací a seeding..."
if [ -f "scripts/db-migrate-all.mjs" ]; then
    node scripts/db-migrate-all.mjs
else
    echo "⚠️ Upozornění: Skript scripts/db-migrate-all.mjs nenalezen."
fi

# 7. Diagnostika a overení
echo "🩺 Spouštím celkovou diagnostiku repozitáře..."
if [ -f "scripts/doctor.mjs" ]; then
    node scripts/doctor.mjs
fi

echo "🎉 [Zoom Pro Agent Setup] Obnova a příprava prostředí dokončena!"
