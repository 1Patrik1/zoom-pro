# Windows 10 + Cloudflare Tunnel + zoom-pro.app

## 1. App start

```powershell
cd C:\zoom-pro\app-refactor-pack
Copy-Item .\deploy\windows\zoom-pro.app.env.example .\.env
notepad .env
powershell -ExecutionPolicy Bypass -File .\deploy\windows\start-prod-zoom-pro.app.ps1
```

## 2. Cloudflared login + tunnel

```powershell
cd C:\Cloudflared\bin
.\cloudflared.exe tunnel login
.\cloudflared.exe tunnel create zoom-pro-app
.\cloudflared.exe tunnel route dns zoom-pro-app zoom-pro.app
.\cloudflared.exe tunnel route dns zoom-pro-app www.zoom-pro.app
```

## 3. Fill config

Edit:

```text
C:\zoom-pro\app-refactor-pack\deploy\windows\cloudflared-config.zoom-pro.app.yml
```

Replace:
- `TUNNEL_UUID_SEM`
- `TVE_WINDOWS_JMENO`

## 4. Test tunnel

```powershell
cd C:\Cloudflared\bin
.\cloudflared.exe --config "C:\zoom-pro\app-refactor-pack\deploy\windows\cloudflared-config.zoom-pro.app.yml" tunnel run zoom-pro-app
```

Open:

```text
https://zoom-pro.app
```

## 5. Install as service

Run PowerShell as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File C:\zoom-pro\app-refactor-pack\deploy\windows\install-cloudflared-service-zoom-pro.app.ps1
```
