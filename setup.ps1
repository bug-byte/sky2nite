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

# ─── Client ───────────────────────────────────────────────────────────────────
Write-Info "Installing client dependencies..."
npm ci --prefix client
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to install client dependencies." }

# Export VITE vars from server/.env so Vite bakes them into the client bundle
$gmk = (Get-Content 'server\.env' -ErrorAction SilentlyContinue) |
    Where-Object { $_ -match '^VITE_GOOGLE_MAPS_API_KEY=' } |
    ForEach-Object { ($_ -split '=', 2)[1] } |
    Select-Object -First 1
if ($gmk -and $gmk -ne 'your_api_key_here') {
    $env:VITE_GOOGLE_MAPS_API_KEY = $gmk
    Write-Ok "Google Maps API key loaded from server\.env ✓"
} else {
    Write-Warn "VITE_GOOGLE_MAPS_API_KEY not set in server\.env — address autocomplete will be unavailable."
}

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

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Ok "Setup complete!"
Write-Host ""
Write-Host "  Start the application:" -ForegroundColor White
Write-Host "    cd server; `$env:NODE_ENV = 'production'; node dist/index.js"
Write-Host ""
Write-Host "  The app will be available at http://localhost:3000"
