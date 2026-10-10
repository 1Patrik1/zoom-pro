#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")/../.."
pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/lib/postgresql/pg.log" start || true
cd apps/backend && node src/server.js
