$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$AppDir = Join-Path $env:LOCALAPPDATA 'Tiwlo'
$Cloudflared = Join-Path $AppDir 'cloudflared.exe'
$TokenPath = Join-Path $AppDir 'cloudflared-token.txt'
$LogsDir = Join-Path $Root '.logs'

New-Item -ItemType Directory -Force $LogsDir | Out-Null

if (-not (Test-Path $Cloudflared)) {
  throw "cloudflared.exe was not found at $Cloudflared"
}

if (-not (Test-Path $TokenPath)) {
  throw "Cloudflare tunnel token file was not found at $TokenPath"
}

$existing = Get-CimInstance Win32_Process -Filter "name='cloudflared.exe'" |
  Where-Object { $_.CommandLine -like "*--token-file*$TokenPath*" }

if ($existing) {
  return
}

Start-Process -FilePath $Cloudflared `
  -ArgumentList @('tunnel', '--no-autoupdate', 'run', '--token-file', $TokenPath) `
  -WorkingDirectory $AppDir `
  -RedirectStandardOutput (Join-Path $LogsDir 'cloudflared.named.out.log') `
  -RedirectStandardError (Join-Path $LogsDir 'cloudflared.named.err.log') `
  -WindowStyle Hidden | Out-Null
