#!/usr/bin/env bash
# Kompletní audit Zoom Pro — spustí všechny kontroly za sebou
# Použití: bash scripts/audit-all.sh
# Testy 4-6 potřebují běžící backend — skript ho automaticky spustí (a po testu zastaví),
# pokud už neběží. Své běžící instance nenechává spadnout.
set -u
cd "$(dirname "$0")/.."
FAIL=0
BACKEND_STARTED=0
BACKEND_PID=""

run() {
  echo ""
  echo "════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════"
  if ! eval "$2"; then FAIL=1; fi
}

# --- Zdravotní check backendu; když neběží, spusť vlastní instanci ---
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
if curl -sf --max-time 2 "$BACKEND_URL/health" > /dev/null 2>&1; then
  echo "Backend už běží na $BACKEND_URL — používám stávající instanci."
else
  echo "Backend neběží — spouštím dočasnou instanci (apps/backend)…"
  export DATABASE_URL="${DATABASE_URL:-$(grep -m1 '^DATABASE_URL=' apps/backend/.env 2>/dev/null | cut -d= -f2-)}"
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Nelze zjistit DATABASE_URL (apps/backend/.env chybí?) — testy 4-6 přeskočeny."
    FAIL=1
  else
    node apps/backend/src/server.js > /tmp/zoom-pro-audit-backend.log 2>&1 &
    BACKEND_PID=$!
    BACKEND_STARTED=1
    # čekej max ~15 s na health
    UP=0
    for i in $(seq 1 30); do
      if curl -sf --max-time 2 "$BACKEND_URL/health" > /dev/null 2>&1; then UP=1; break; fi
      sleep 0.5
    done
    if [ "$UP" -eq 1 ]; then
      echo "Backend připraven na $BACKEND_URL (pid $BACKEND_PID, log: /tmp/zoom-pro-audit-backend.log)."
    else
      echo "❌ Backend se nerozjel — viz /tmp/zoom-pro-audit-backend.log (typicky: DB neběží, špatné DATABASE_URL)."
      FAIL=1
    fi
  fi
fi

run "1/7 Syntaxe backendu" "find apps/backend/src -name '*.js' -print0 | xargs -0 -n1 node --check"
run "2/7 Build frontendu" "npm run build -w apps/frontend"
run "3/7 Bezpečnost" "node scripts/audit-security.mjs"
if [ "${BACKEND_PID:-}" != "" ] || curl -sf --max-time 2 "$BACKEND_URL/health" > /dev/null 2>&1; then
  run "4/7 Funkčnost API" "node scripts/audit-functionality.mjs"
  run "5/7 Test loginů" "node scripts/test-login.mjs"
  run "6/7 Stabilita (200 req)" "node scripts/audit-stability.mjs 200 20"
  run "7/7 Write cesty (POST/PUT)" "node scripts/audit-write-paths.mjs"
fi

# --- Úklid: zastav jen instanci, kterou jsme si sami spustili ---
if [ "$BACKEND_STARTED" -eq 1 ] && [ -n "$BACKEND_PID" ]; then
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
fi

echo ""
echo "════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then echo "  ✅ VŠECHNY AUDITY PROŠLY"; else echo "  ❌ NĚKTERÉ AUDITY SELHALY — viz výše"; fi
echo "════════════════════════════════════════"
exit $FAIL
