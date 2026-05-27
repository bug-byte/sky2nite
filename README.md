# Sky2nite - ANTARES Viewer

A React + TypeScript web application that uses the ANTARES data broker to show astronomical objects visible tonight with a consumer-grade telescope from any given location. Data comes directly from the Vera C. Rubin Observatory.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Node.js | 20.19 | Required for host setup |
| Docker + Docker Compose | Docker 24 / Compose v2 | Required for Docker setup |
| PostgreSQL | 17 | Only needed for host setup without Docker |

---

## Configuration

All runtime and build configuration lives in **`server/.env`**. Copy the example file and fill in your values before running any setup method:

```bash
cp server/.env.example server/.env
```

Key variables:

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign auth tokens (required) |
| `AUTH_TOKEN_TTL` | Login token lifetime (default `7d`) |
| `ANTARES_API_BASE_URL` | ANTARES broker API base URL |
| `CACHE_TTL_SECONDS` | How long to cache ANTARES responses |
| `VITE_GOOGLE_MAPS_API_KEY` | *(Optional)* Google Maps API key for address autocomplete |

> **Google Maps API key** — if omitted, address autocomplete is disabled and users can still enter coordinates manually. The key is read from `server/.env` and baked into the client bundle at build time.

---

## Setup — Docker (recommended)

Docker handles the full stack (app + PostgreSQL) with no local Node.js or Postgres installation required.

**1. Configure environment**

```bash
cp server/.env.example server/.env
# Edit server/.env — set VITE_GOOGLE_MAPS_API_KEY and any other values
```

**2. Build and start**

```bash
docker compose --env-file server/.env up --build
```

The `--env-file server/.env` flag makes your `VITE_GOOGLE_MAPS_API_KEY` (and any other `VITE_*` vars) available to the build step so Vite can bake them into the client bundle.

The app is available at **http://localhost:3000**.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account in PostgreSQL. After setup, users authenticate with the login form before accessing object search endpoints.

To run in the background:

```bash
docker compose --env-file server/.env up --build -d
```

To stop:

```bash
docker compose down
```

To stop and delete the database volume:

```bash
docker compose down -v
```

---

## Setup — Linux / macOS (host)

Requires Node.js ≥ 20.19 and PostgreSQL installed locally.

**1. Configure environment**

```bash
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL, VITE_GOOGLE_MAPS_API_KEY, etc.
```

**2. Run the setup script**

```bash
chmod +x setup.sh
./setup.sh
```

The script will:
- Verify your Node.js version
- Create the PostgreSQL database (if `psql` is available)
- Install dependencies and build both client and server
- Copy the client bundle into `server/public`

**3. Start the application**

```bash
cd server && NODE_ENV=production node dist/index.js
```

The app is available at **http://localhost:3000**.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account in PostgreSQL. After setup, users authenticate with the login form before accessing object search endpoints.

---

## Setup — Windows (host)

Requires Node.js ≥ 20.19 and PostgreSQL installed locally.

**1. Configure environment**

```powershell
Copy-Item server\.env.example server\.env
# Edit server\.env — set DATABASE_URL, VITE_GOOGLE_MAPS_API_KEY, etc.
```

**2. Run the setup script**

Open PowerShell as your normal user (no elevation required) and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

The script will:
- Verify your Node.js version
- Create the PostgreSQL database (if `psql` is available)
- Install dependencies and build both client and server
- Copy the client bundle into `server\public`

**3. Start the application**

```powershell
cd server; $env:NODE_ENV = 'production'; node dist/index.js
```

The app is available at **http://localhost:3000**.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account in PostgreSQL. After setup, users authenticate with the login form before accessing object search endpoints.

---

## Development

To run the client and server separately with hot reload:

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client (add VITE_GOOGLE_MAPS_API_KEY to client/.env for Maps autocomplete)
cd client && npm run dev
```

The Vite dev server proxies API requests to the Express server automatically.

### Database initialization scripts

Server startup automatically runs SQL initialization scripts from [server/src/data/scripts](server/src/data/scripts) if they have not been executed before.

Script rules:
- Name scripts as `NNN.description.sql` (for example `002.add_feature.sql`)
- Scripts are executed in lexical order
- Applied scripts are tracked in `sys.executed_scripts`
- Already-applied scripts are skipped on subsequent startups

---

## Data attribution

Data provided by [ANTARES](https://antares.noirlab.edu) and the [Vera C. Rubin Observatory](https://rubinobservatory.org).
