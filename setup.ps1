#Requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ─── Helpers ─────────────────────────────────────────────────────────────────
function Write-Info { param([string]$Msg) Write-Host "[sky2nite] $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "[sky2nite] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "[sky2nite] $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "[sky2nite] $Msg" -ForegroundColor Red; exit 1 }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ─── Check Node.js ────────────────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js is not installed. Install Node.js >= 20.19 from https://nodejs.org"
}

$nodeVersion = (node --version).TrimStart('v')
$parts       = $nodeVersion -split '\.'
$nodeMajor   = [int]$parts[0]
$nodeMinor   = [int]$parts[1]

if ($nodeMajor -lt 20 -or ($nodeMajor -eq 20 -and $nodeMinor -lt 19)) {
    Write-Fail "Node.js >= 20.19 is required (found v$nodeVersion). Upgrade from https://nodejs.org"
}
Write-Ok "Node.js v$nodeVersion ✓"

# ─── Environment files ────────────────────────────────────────────────────────
if (-not (Test-Path 'server\.env')) {
    Copy-Item 'server\.env.example' 'server\.env'
    Write-Warn "Created server\.env from .env.example — review and adjust as needed."
}

if (-not (Test-Path 'client\.env') -and (Test-Path 'client\.env.example')) {
    Copy-Item 'client\.env.example' 'client\.env'
    Write-Warn "Created client\.env from .env.example — add your Google Maps API key if needed."
}

# ─── PostgreSQL database ──────────────────────────────────────────────────────
Write-Info "Setting up PostgreSQL database..."
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $dbUrl = (Get-Content 'server\.env' -ErrorAction SilentlyContinue) |
        Where-Object { $_ -match '^DATABASE_URL=' } |
        ForEach-Object { ($_ -split '=', 2)[1] } |
        Select-Object -First 1

    if (-not $dbUrl) {
        Write-Warn "DATABASE_URL not set in server\.env — skipping automatic database creation."
        Write-Warn "Set DATABASE_URL and create the database manually: createdb sky2nite"
    } else {
        # Test whether the target database is already reachable
        $null = psql $dbUrl -c '\q' 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Database already reachable ✓"
        } else {
            # Swap the database segment to 'postgres' to create sky2nite
            $pgAdminUrl = $dbUrl -replace '/[^/]+$', '/postgres'
            $null = psql $pgAdminUrl -c 'CREATE DATABASE sky2nite;' 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Database 'sky2nite' created ✓"
            } else {
                Write-Warn "Could not auto-create the database. Create it manually then re-run this script:"
                Write-Warn "  createdb sky2nite"
            }
        }
    }
} else {
    Write-Warn "psql not found — skipping automatic database setup."
    Write-Warn "Install PostgreSQL, then create the database: createdb sky2nite"
    Write-Warn "Update DATABASE_URL in server\.env before starting the server."
}

# ─── Google Maps API key ─────────────────────────────────────────────────────
$gmk = (Get-Content 'server\.env' -ErrorAction SilentlyContinue) |
    Where-Object { $_ -match '^VITE_GOOGLE_MAPS_API_KEY=' } |
    ForEach-Object { ($_ -split '=', 2)[1] } |
    Select-Object -First 1
if (-not $gmk -or $gmk -eq 'your_api_key_here') {
    Write-Host ''
    Write-Host 'Google Maps API key' -ForegroundColor White -NoNewline
    Write-Host ' (optional — enables address lookup)'
    Write-Host '  Get one free at https://console.cloud.google.com/'
    $gmkInput = Read-Host '  Enter key or press Enter to skip'
    if ($gmkInput) {
        $envContent = Get-Content 'server\.env' -Raw
        if ($envContent -match 'VITE_GOOGLE_MAPS_API_KEY=') {
            $envContent = $envContent -replace 'VITE_GOOGLE_MAPS_API_KEY=.*', "VITE_GOOGLE_MAPS_API_KEY=$gmkInput"
        } else {
            $envContent = $envContent.TrimEnd() + "`nVITE_GOOGLE_MAPS_API_KEY=$gmkInput`n"
        }
        Set-Content 'server\.env' $envContent -NoNewline
        $gmk = $gmkInput
        Write-Ok "Google Maps API key saved to server\.env ✓"
    } else {
        Write-Warn 'Skipped — address autocomplete will be unavailable.'
    }
} else {
    Write-Ok "Google Maps API key loaded from server\.env ✓"
}
Write-Host ''

# Export so Vite bakes it into the client bundle
if ($gmk -and $gmk -ne 'your_api_key_here') { $env:VITE_GOOGLE_MAPS_API_KEY = $gmk }

# ─── Client ───────────────────────────────────────────────────────────────────
Write-Info "Installing client dependencies..."
npm ci --prefix client
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to install client dependencies." }

Write-Info "Building client..."
npm run build --prefix client
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to build client." }

# ─── Server ───────────────────────────────────────────────────────────────────
Write-Info "Installing server dependencies..."
npm ci --prefix server
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to install server dependencies." }

Write-Info "Building server..."
npm run build --prefix server
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to build server." }

# ─── Bundle ───────────────────────────────────────────────────────────────────
Write-Info "Copying client build into server/public..."
if (Test-Path 'server\public') { Remove-Item -Recurse -Force 'server\public' }
Copy-Item -Recurse 'client\dist' 'server\public'

# ─── Scheduled Task (auto-start on boot) ─────────────────────────────────────
$nodePath  = (Get-Command node).Source
$appDir    = Join-Path $ScriptDir 'server'
$envFile   = Join-Path $ScriptDir 'server\.env'
$taskName  = 'sky2nite'

# Build a small launcher script next to setup.ps1 so the task has a stable path
$launcherPath = Join-Path $ScriptDir 'sky2nite-start.ps1'
@"
# Auto-generated by setup.ps1 — do not edit manually
`$envFile = '$($envFile -replace "'","''")'
if (Test-Path `$envFile) {
    Get-Content `$envFile | Where-Object { `$_ -match '^[^#].*=.*' } | ForEach-Object {
        `$k, `$v = `$_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable(`$k.Trim(), `$v.Trim(), 'Process')
    }
}
`$env:NODE_ENV = 'production'
Set-Location '$($appDir -replace "'","''")'
& '$($nodePath -replace "'","''")'  dist/index.js
"@ | Set-Content $launcherPath -Encoding UTF8

Write-Info "Registering Windows Scheduled Task '$taskName'..."

# Remove existing task so we can recreate it cleanly
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

$action  = "powershell.exe -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcherPath`""
$result  = schtasks /Create /TN $taskName /TR $action /SC ONSTART /RU "$env:USERNAME" /RL HIGHEST /F 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Could not register scheduled task (may need elevation). Start manually:"
    Write-Warn "  cd server; `$env:NODE_ENV = 'production'; node dist/index.js"
} else {
    Write-Ok "Scheduled task '$taskName' registered (runs at system startup) ✓"

    # Start it now
    schtasks /Run /TN $taskName | Out-Null
    Start-Sleep -Seconds 2
    Write-Ok "sky2nite started ✓"

    Write-Host ""
    Write-Host "  Manage the service:" -ForegroundColor White
    Write-Host "    schtasks /Run   /TN sky2nite   # start"
    Write-Host "    schtasks /End   /TN sky2nite   # stop"
    Write-Host "    schtasks /Query /TN sky2nite   # status"
    Write-Host "    schtasks /Delete /TN sky2nite /F   # remove"
}

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Ok "Setup complete! The app will be available at http://localhost:3000"
