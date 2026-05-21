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
docker compose up --build
```

The app is available at **http://localhost:3000**.

To run in the background:

```bash
docker compose up --build -d
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

---

## Data attribution

Data provided by [ANTARES](https://antares.noirlab.edu) and the [Vera C. Rubin Observatory](https://rubinobservatory.org).
