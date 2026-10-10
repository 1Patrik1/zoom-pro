$CloudflaredBin = 'C:\Cloudflared\bin'
$UserHome = $env:USERPROFILE
$UserCloudflared = Join-Path $UserHome '.cloudflared'
$SystemCloudflared = 'C:\Windows\System32\config\systemprofile\.cloudflared'
$TunnelId = 'TUNNEL_UUID_SEM'

New-Item -ItemType Directory -Force -Path $SystemCloudflared | Out-Null
Copy-Item "$UserCloudflared\cert.pem" "$SystemCloudflared\cert.pem" -Force
Copy-Item "$UserCloudflared\$TunnelId.json" "$SystemCloudflared\$TunnelId.json" -Force
Copy-Item "C:\zoom-pro\app-refactor-pack\deploy\windows\cloudflared-config.zoom-pro.app.yml" "$SystemCloudflared\config.yml" -Force

& "$CloudflaredBin\cloudflared.exe" service install

Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Cloudflared' -Name ImagePath -Value 'C:\Cloudflared\bin\cloudflared.exe --config=C:\Windows\System32\config\systemprofile\.cloudflared\config.yml tunnel run'

sc.exe stop cloudflared | Out-Null
sc.exe start cloudflared
sc.exe query cloudflared
