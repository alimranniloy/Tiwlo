param(
  [switch]$SkipDatabase
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogsDir = Join-Path $Root '.logs'
$NodeDir = Join-Path $Root '.tools\node\node-v24.15.0-win-x64'
$NodeExe = Join-Path $NodeDir 'node.exe'
$NpmCmd = Join-Path $NodeDir 'npm.cmd'
$PgBin = Join-Path $Root '.tools\postgresql\pgsql\bin'
$PgData = Join-Path $Root '.data\postgres'

New-Item -ItemType Directory -Force $LogsDir | Out-Null

function Test-TcpPort($Port) {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $iar.AsyncWaitHandle.WaitOne(500, $false)
    if ($connected) { $client.EndConnect($iar) }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

function Test-Http($Url) {
  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Wait-Http($Url, $Seconds) {
  for ($i = 0; $i -lt $Seconds; $i++) {
    if (Test-Http $Url) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Start-LoggedProcess($Name, $FilePath, $Arguments, $WorkingDirectory) {
  $outLog = Join-Path $LogsDir "$Name.public.out.log"
  $errLog = Join-Path $LogsDir "$Name.public.err.log"
  Start-Process -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden | Out-Null
}

function Run-Npm($Arguments, $WorkingDirectory) {
  Push-Location $WorkingDirectory
  try {
    & $NpmCmd @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm command failed: npm $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

if (-not $SkipDatabase) {
  $pgReady = Join-Path $PgBin 'pg_isready.exe'
  $pgCtl = Join-Path $PgBin 'pg_ctl.exe'
  if ((Test-Path $pgReady) -and (Test-Path $pgCtl) -and (Test-Path $PgData)) {
    & $pgReady -h 127.0.0.1 -p 5432 -U postgres | Out-Null
    if ($LASTEXITCODE -ne 0) {
      $pgLog = Join-Path $LogsDir 'postgres.public.log'
      & $pgCtl -D $PgData -l $pgLog -o '-p 5432' -w start | Out-Null
    }
  }
}

if (-not (Test-Http 'http://127.0.0.1:4000/health')) {
  Start-LoggedProcess 'backend' $NpmCmd @('run', 'start') (Join-Path $Root 'x')
  Wait-Http 'http://127.0.0.1:4000/health' 45 | Out-Null
}

if (-not (Test-Http 'http://127.0.0.1:3001')) {
  $env:VITE_GRAPHQL_URL = '/graphql'
  $env:DISABLE_HMR = 'true'
  $env:BROWSER = 'none'
  $env:VITE_STOREFRONT_ROOT_DOMAIN = 'tiwlo.com'
  Run-Npm @('run', 'build') $Root
  Start-LoggedProcess 'frontend' $NpmCmd @('run', 'preview', '--', '--host', '127.0.0.1', '--port', '3001', '--strictPort') $Root
  Wait-Http 'http://127.0.0.1:3001' 45 | Out-Null
}

if (-not ((Test-TcpPort 3000) -and (Test-TcpPort 8787))) {
  Start-LoggedProcess 'proxy' $NodeExe @((Join-Path $PSScriptRoot 'tiwlo-public-proxy.cjs')) $Root
  Wait-Http 'http://127.0.0.1:3000' 20 | Out-Null
}
