param(
  [switch]$NoBrowser,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ToolsDir = Join-Path $Root '.tools'
$DownloadsDir = Join-Path $ToolsDir 'downloads'
$DataDir = Join-Path $Root '.data'
$LogsDir = Join-Path $Root '.logs'

$NodeVersion = '24.15.0'
$NodeFolder = "node-v$NodeVersion-win-x64"
$NodeZipUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeFolder.zip"
$PgVersion = '17.9-3'
$PgZipUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64-binaries.zip"

$BackendPort = 4000
$FrontendPort = 3000
$DatabaseName = 'tiwlo'
$DatabaseUser = 'postgres'
$DatabasePassword = 'postgres'

New-Item -ItemType Directory -Force $ToolsDir, $DownloadsDir, $DataDir, $LogsDir | Out-Null

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
  Add-Content -Path (Join-Path $LogsDir 'setup.log') -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Find-Exe($Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $null
}

function Add-ToPath($Dir) {
  if ($env:PATH -notlike "*$Dir*") {
    $env:PATH = "$Dir;$env:PATH"
  }
}

function Download-File($Url, $OutputPath) {
  if (Test-Path $OutputPath) { return }
  Write-Step "Downloading $Url"
  Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
}

function Expand-Archive-IfMissing($ZipPath, $Destination, $Marker) {
  if (Test-Path $Marker) { return }
  New-Item -ItemType Directory -Force $Destination | Out-Null
  Write-Step "Extracting $(Split-Path $ZipPath -Leaf)"
  Expand-Archive -Path $ZipPath -DestinationPath $Destination -Force
}

function Ensure-Node {
  $globalNode = Find-Exe 'node.exe'
  $globalNpm = Find-Exe 'npm.cmd'
  if ($globalNode -and $globalNpm) {
    $globalVersion = (& $globalNode --version 2>$null)
    if ($globalVersion -eq "v$NodeVersion") {
      return @{ Node = $globalNode; Npm = $globalNpm }
    }
  }

  $nodeZip = Join-Path $DownloadsDir "$NodeFolder.zip"
  $nodeRoot = Join-Path $ToolsDir 'node'
  $nodeBin = Join-Path $nodeRoot $NodeFolder
  Download-File $NodeZipUrl $nodeZip
  Expand-Archive-IfMissing $nodeZip $nodeRoot (Join-Path $nodeBin 'node.exe')
  Add-ToPath $nodeBin

  return @{
    Node = (Join-Path $nodeBin 'node.exe')
    Npm = (Join-Path $nodeBin 'npm.cmd')
  }
}

function Ensure-PostgresTools {
  $globalPostgres = Find-Exe 'postgres.exe'
  $globalInitDb = Find-Exe 'initdb.exe'
  $globalPgCtl = Find-Exe 'pg_ctl.exe'
  $globalPsql = Find-Exe 'psql.exe'
  if ($globalPostgres -and $globalInitDb -and $globalPgCtl -and $globalPsql) {
    $bin = Split-Path $globalPostgres -Parent
    Add-ToPath $bin
    return $bin
  }

  $pgZip = Join-Path $DownloadsDir "postgresql-$PgVersion-windows-x64-binaries.zip"
  $pgRoot = Join-Path $ToolsDir 'postgresql'
  Download-File $PgZipUrl $pgZip
  Expand-Archive-IfMissing $pgZip $pgRoot (Join-Path $pgRoot 'pgsql\bin\postgres.exe')

  $postgresExe = Get-ChildItem -Path $pgRoot -Recurse -Filter 'postgres.exe' | Select-Object -First 1
  if (-not $postgresExe) {
    throw 'PostgreSQL binaries were downloaded, but postgres.exe was not found.'
  }

  $bin = $postgresExe.DirectoryName
  Add-ToPath $bin
  return $bin
}

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

function Wait-Http($Url, $Name) {
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Http $Url) { return $true }
    Start-Sleep -Seconds 1
  }
  Write-Warning "$Name did not respond yet. Check .logs folder."
  return $false
}

function Get-PostgresReady($PgBin, $Port) {
  $pgReady = Join-Path $PgBin 'pg_isready.exe'
  if (-not (Test-Path $pgReady)) { return $false }
  & $pgReady -h 127.0.0.1 -p $Port -U $DatabaseUser | Out-Null
  return $LASTEXITCODE -eq 0
}

function Quote-ProcessArg($Value) {
  return '"' + ($Value -replace '"', '\"') + '"'
}

function Invoke-PostgresCtl($PgCtl, $Arguments) {
  $pgCtlOutLog = Join-Path $LogsDir 'pg-ctl.out.log'
  $pgCtlErrLog = Join-Path $LogsDir 'pg-ctl.err.log'
  $argLine = ($Arguments | ForEach-Object { Quote-ProcessArg $_ }) -join ' '
  $process = Start-Process -FilePath $PgCtl `
    -ArgumentList $argLine `
    -RedirectStandardOutput $pgCtlOutLog `
    -RedirectStandardError $pgCtlErrLog `
    -WindowStyle Hidden `
    -PassThru

  if (-not $process.WaitForExit(45000)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "PostgreSQL control command timed out. Check $pgCtlOutLog and $pgCtlErrLog"
  }

  if ($process.ExitCode -ne 0) {
    throw "PostgreSQL control command failed. Check $pgCtlOutLog and $pgCtlErrLog"
  }
}

function Ensure-Database($PgBin) {
  $initDb = Join-Path $PgBin 'initdb.exe'
  $pgCtl = Join-Path $PgBin 'pg_ctl.exe'
  $psql = Join-Path $PgBin 'psql.exe'
  $createdb = Join-Path $PgBin 'createdb.exe'
  $pgData = Join-Path $DataDir 'postgres'
  $pgLog = Join-Path $LogsDir 'postgres.log'

  if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) {
    Write-Step 'Initializing local PostgreSQL data directory'
    New-Item -ItemType Directory -Force $pgData | Out-Null
    & $initDb -D $pgData -U $DatabaseUser -A trust -E UTF8 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initdb failed.' }
  }

  $pgPort = 5432
  if ((Test-TcpPort $pgPort) -and -not (Get-PostgresReady $PgBin $pgPort)) {
    $pgPort = 55432
  }

  if (-not (Get-PostgresReady $PgBin $pgPort)) {
    Write-Step "Starting PostgreSQL on port $pgPort"
    Invoke-PostgresCtl $pgCtl @('-D', $pgData, '-l', $pgLog, '-o', "-p $pgPort", '-w', '-t', '30', 'start')
  }

  for ($i = 0; $i -lt 30; $i++) {
    if (Get-PostgresReady $PgBin $pgPort) { break }
    Start-Sleep -Seconds 1
  }

  if (-not (Get-PostgresReady $PgBin $pgPort)) {
    throw "PostgreSQL is not ready on port $pgPort."
  }

  $env:PGPASSWORD = $DatabasePassword
  $queryResult = & $psql -h 127.0.0.1 -p $pgPort -U $DatabaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DatabaseName'"
  $exists = ''
  if ($null -ne $queryResult) {
    $exists = ($queryResult | Select-Object -First 1).ToString().Trim()
  }
  if ($exists -ne '1') {
    Write-Step "Creating PostgreSQL database '$DatabaseName'"
    & $createdb -h 127.0.0.1 -p $pgPort -U $DatabaseUser $DatabaseName
    if ($LASTEXITCODE -ne 0) { throw "Database '$DatabaseName' could not be created." }
  }

  return $pgPort
}

function Set-EnvValue($FilePath, $Key, $Value) {
  $line = "$Key=`"$Value`""
  if (Test-Path $FilePath) {
    $content = New-Object System.Collections.Generic.List[string]
    Get-Content -Path $FilePath | ForEach-Object { [void]$content.Add($_) }
    $escaped = [regex]::Escape($Key)
    $matched = $false
    for ($i = 0; $i -lt $content.Count; $i++) {
      if ($content[$i] -match "^\s*$escaped\s*=") {
        $matched = $true
        $content[$i] = $line
      }
    }
    if (-not $matched) { [void]$content.Add($line) }
    Set-Content -Path $FilePath -Value $content.ToArray() -Encoding UTF8
  } else {
    Set-Content -Path $FilePath -Value @($line) -Encoding UTF8
  }
}

function Ensure-EnvFiles($PgPort) {
  $databaseUrl = "postgresql://${DatabaseUser}:${DatabasePassword}@127.0.0.1:$PgPort/$DatabaseName`?schema=public"
  $rootEnv = Join-Path $Root '.env'
  $backendEnv = Join-Path $Root 'x\.env'

  Set-EnvValue $rootEnv 'VITE_GRAPHQL_URL' "http://localhost:$BackendPort/graphql"
  Set-EnvValue $rootEnv 'APP_URL' "http://localhost:$FrontendPort"
  Set-EnvValue $backendEnv 'DATABASE_URL' $databaseUrl
  Set-EnvValue $backendEnv 'JWT_SECRET' 'dev-local-change-before-production'
  Set-EnvValue $backendEnv 'PORT' $BackendPort
  Set-EnvValue $backendEnv 'FRONTEND_ORIGIN' "http://localhost:$FrontendPort"
  Set-EnvValue $backendEnv 'API_BASE_URL' "http://localhost:$BackendPort"
}

function Run-Npm($Npm, $Arguments, $WorkingDirectory) {
  Write-Step "npm $($Arguments -join ' ')"
  Push-Location $WorkingDirectory
  try {
    & $Npm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm command failed: npm $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Ensure-Dependencies($Npm) {
  Run-Npm $Npm @('install') $Root
  Run-Npm $Npm @('install') (Join-Path $Root 'x')
}

function Run-BackendDbSetup($Npm) {
  Run-Npm $Npm @('--prefix', 'x', 'run', 'db:generate') $Root
  Run-Npm $Npm @('--prefix', 'x', 'run', 'db:push') $Root
  if (-not $SkipSeed) {
    Run-Npm $Npm @('--prefix', 'x', 'run', 'db:seed') $Root
  }
}

function Start-ServerProcess($Name, $Npm, $Arguments, $WorkingDirectory, $Port, $HealthUrl = '') {
  if (Test-TcpPort $Port) {
    if ($HealthUrl -and (Test-Http $HealthUrl)) {
      Write-Host "$Name already looks healthy on port $Port" -ForegroundColor Yellow
      return
    }
    if (-not $HealthUrl) {
      Write-Host "$Name already looks active on port $Port" -ForegroundColor Yellow
      return
    }
    Write-Warning "$Name port $Port is occupied, but $HealthUrl did not respond. Stop that process or free the port, then rerun this script."
    return
  }

  $outLog = Join-Path $LogsDir "$Name.out.log"
  $errLog = Join-Path $LogsDir "$Name.err.log"
  Write-Step "Starting $Name on port $Port"
  Start-Process -FilePath $Npm `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden | Out-Null
}

Write-Step 'Preparing local Node.js'
$nodeTools = Ensure-Node
& $nodeTools.Node --version | Out-Host
& $nodeTools.Npm --version | Out-Host

Write-Step 'Preparing local PostgreSQL'
$pgBin = Ensure-PostgresTools
$pgPort = Ensure-Database $pgBin
Ensure-EnvFiles $pgPort

Write-Step 'Installing project dependencies if needed'
Ensure-Dependencies $nodeTools.Npm

$backendHealthUrl = "http://localhost:$BackendPort/health"
$backendAlreadyRunning = Test-Http $backendHealthUrl
if ($backendAlreadyRunning) {
  Write-Step 'Backend already running; skipping Prisma database setup'
} else {
  Write-Step 'Preparing Prisma database'
  Run-BackendDbSetup $nodeTools.Npm
}

Start-ServerProcess 'backend' $nodeTools.Npm @('--prefix', 'x', 'run', 'dev') $Root $BackendPort $backendHealthUrl
Wait-Http $backendHealthUrl 'Backend' | Out-Null

Write-Step 'Building production frontend'
Run-Npm $nodeTools.Npm @('run', 'build') $Root

Start-ServerProcess 'frontend' $nodeTools.Npm @('run', 'serve', '--', '--port', "$FrontendPort") $Root $FrontendPort "http://localhost:$FrontendPort"
Wait-Http "http://localhost:$FrontendPort" 'Frontend' | Out-Null

Write-Host ""
Write-Host 'Tiwlo is live.' -ForegroundColor Green
Write-Host "Frontend: http://localhost:$FrontendPort"
Write-Host "Backend:  http://localhost:$BackendPort/graphql"
Write-Host "Database: postgresql://${DatabaseUser}:${DatabasePassword}@127.0.0.1:$pgPort/$DatabaseName"
Write-Host "Logs:     $LogsDir"

if (-not $NoBrowser) {
  Start-Process "http://localhost:$FrontendPort"
}
