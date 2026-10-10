#!/data/data/com.termux/files/usr/bin/bash
# Zoom Pro — instalace do Termuxu (Android)
# Spuštění: bash scripts/termux/install.sh
set -e

echo "=== Zoom Pro / Termux installer ==="

pkg update -y
pkg install -y nodejs-lts postgresql git openssh nano coreutils

# Init PG cluster (idempotentní)
if [ ! -d "$PREFIX/var/lib/postgresql" ] || [ -z "$(ls -A $PREFIX/var/lib/postgresql 2>/dev/null)" ]; then
  mkdir -p "$PREFIX/var/lib/postgresql"
  initdb "$PREFIX/var/lib/postgresql"
fi

# Start PG
pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/lib/postgresql/pg.log" start || true
sleep 2

# DB + role (idempotentní)
createuser -s zoom_user 2>/dev/null || true
createdb -O zoom_user zoom_pro 2>/dev/null || true
psql -d zoom_pro -c "ALTER USER zoom_user WITH PASSWORD 'zoom_pass';" || true

# NPM install
cd "$(dirname "$0")/../.."
npm install --no-audit --no-fund

# .env pro Termux
cat > apps/backend/.env <<EOF
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://zoom_user:zoom_pass@127.0.0.1:5432/zoom_pro
JWT_SECRET=$(head -c 32 /dev/urandom | base64)
CORS_ORIGIN=http://localhost:5173
APP_NAME=zoom-pro
GEMINI_API_KEY=
EOF

cat > apps/frontend/.env <<EOF
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Zoom Pro
EOF

# Migrace
for f in 001_initial_schema.sql 002_seed_permissions.sql 003_seed_platform_admin.sql \
         004_seed_module_settings.sql 005_seed_demo_data.sql 006_saas_platform_settings.sql \
         007_project_geo_and_gallery.sql 008_invoice_automation_and_permissions.sql \
         009_attendance_geo_guard_and_log_media.sql 010_collisions_and_qr_labels.sql \
         011_zoom_pro_licensing.sql 012_monter_invoices.sql \
         013_distribution_platform.sql; do
  if [ -f "$f" ]; then
    echo ">> apply $f"
    PGPASSWORD=zoom_pass psql -h 127.0.0.1 -U zoom_user -d zoom_pro -f "$f" || true
  fi
done

echo ""
echo "=== HOTOVO ==="
echo "Spusť backend:   bash scripts/termux/run-backend.sh"
echo "Spusť frontend:  bash scripts/termux/run-frontend.sh"
echo "Web přístup:     http://localhost:5173"
