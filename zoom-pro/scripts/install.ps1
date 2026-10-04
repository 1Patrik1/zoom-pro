# Zoom Pro — Windows PowerShell instalátor v1.2.0
# Použití:  powershell -ExecutionPolicy Bypass -File scripts\install.ps1

$ErrorActionPreference = 'Stop'
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Zoom Pro · Windows instalátor v1.2.0" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# 1) Node check
try {
  $nodeVer = node --version
} catch {
  Write-Host "❌ Node.js chybí. Nainstaluj z https://nodejs.org" -ForegroundColor Red; exit 1
}
$major = [int]($nodeVer -replace 'v(\d+)\..*','$1')
if ($major -lt 20) { Write-Host "❌ Potřebuji Node ≥ 20 (máš $nodeVer)" -ForegroundColor Red; exit 1 }
Write-Host "✅ Node.js $nodeVer"

# 2) .env
function Rand-Secret {
  $b = [byte[]]::new(32); [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  [Convert]::ToBase64String($b).TrimEnd('=').Replace('+','-').Replace('/','_')
}
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  (Get-Content .env) -replace 'change-me-please', (Rand-Secret) | Set-Content .env
  Write-Host "✅ Vytvořen .env"
}
if (-not (Test-Path apps\backend\.env)) {
  Copy-Item apps\backend\.env.example apps\backend\.env
  (Get-Content apps\backend\.env) -replace 'dev-super-secret', (Rand-Secret) | Set-Content apps\backend\.env
  Write-Host "✅ Vytvořen apps\backend\.env"
}
if (-not (Test-Path apps\frontend\.env)) {
  Copy-Item apps\frontend\.env.example apps\frontend\.env
  Write-Host "✅ Vytvořen apps\frontend\.env"
}
if ((Test-Path apps\mobile\.env.example) -and -not (Test-Path apps\mobile\.env)) {
  Copy-Item apps\mobile\.env.example apps\mobile\.env
  Write-Host "✅ Vytvořen apps\mobile\.env"
}

# 3) GEMINI_API_KEY
$gemini = Read-Host "Zadej GEMINI_API_KEY (Enter = přeskočit)"
if ($gemini) { Add-Content apps\backend\.env "GEMINI_API_KEY=$gemini"; Write-Host "✅ Uložen GEMINI_API_KEY" }

# 4) npm install
Write-Host ""
Write-Host "▶ npm install (root workspace)…" -ForegroundColor Yellow
npm install --no-audit --no-fund

if (Test-Path apps\mobile\package.json) {
  Write-Host "▶ npm install (mobile)…" -ForegroundColor Yellow
  Push-Location apps\mobile
  npm install --no-audit --no-fund
  Pop-Location
}

# 5) DB check + migrace
$DbUrl = (Get-Content apps\backend\.env | Where-Object { $_ -like 'DATABASE_URL=*' }) -replace '^DATABASE_URL=',''
Write-Host ""
Write-Host "▶ DB migrace…" -ForegroundColor Yellow
$env:DATABASE_URL = $DbUrl
node scripts\db-migrate-all.mjs
node scripts\db-run-sql.mjs 005_seed_platform_superadmin.sql 006_seed_demo_profiles_and_records.sql

# 6) Distribuce seed
$seed = Read-Host "Chceš seed katalogu & dodavatelů? [y/N]"
if ($seed -eq 'y' -or $seed -eq 'Y') { node scripts\seed-distribution.mjs }

# 7) Doctor
node scripts\doctor.mjs

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ HOTOVO! Spusť: npm run dev" -ForegroundColor Green
Write-Host "Web:        http://localhost:5173" -ForegroundColor Green
Write-Host "Login:      owner@platform.local · PlatformOwner2026!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
