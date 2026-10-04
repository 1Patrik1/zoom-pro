Set-Location C:\zoom-pro\app-refactor-pack

if (-not (Test-Path .env)) {
    Copy-Item .\deploy\windows\zoom-pro.app.env.example .\.env
    Write-Host 'Soubor .env byl vytvořen z deploy\windows\zoom-pro.app.env.example. Uprav hesla a JWT_SECRET, pak skript spusť znovu.' -ForegroundColor Yellow
    exit 1
}

docker compose -f docker-compose.prod.yml up -d --build
Write-Host 'Aplikace by mela bezet na http://localhost:8080' -ForegroundColor Green
