#!/usr/bin/env bash
# ==============================================================================
# OPRAVA LINTERU - CHYBĚJÍCÍ ZÁVISLOST @eslint/js
# ==============================================================================
set -e

echo "📦 [1/3] Instalace chybějícího balíčku @eslint/js..."
cd apps/frontend || exit
npm install @eslint/js --save-dev

echo "🔍 [2/3] Opakované spuštění ESLint nad výpočty VZT..."
npx eslint src/features/vzt/calculations.js --fix
echo "✅ Linter úspěšně prošel."

cd ../..

echo "💾 [3/3] Ukládám opravu závislostí do Gitu..."
git add apps/frontend/package*.json
git commit -m "fix(eslint): doplnění chybějící závislosti @eslint/js"
git status -s

echo "=============================================================================="
echo "✅ Chyba ERR_MODULE_NOT_FOUND odstraněna. Prostředí Fáze 14 je plně funkční."
