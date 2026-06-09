# Sky2nite - ANTARES Viewer

A React + TypeScript web application that uses the ANTARES data broker to show astronomical objects visible tonight with a consumer-grade telescope from any given location. Data comes directly from the Vera C. Rubin Observatory.

---

## Why Sky2nite exists

The Vera C. Rubin Observatory's Legacy Survey of Space and Time (LSST) scans the entire southern sky every few nights, generating around **10 million alerts per night** — every time a star, galaxy, or transient source changes brightness. ANTARES ingests this data and adds machine-learning classifications, cross-matches, and tags to each alert.

The result is extraordinary science — and an essentially unusable dataset for an amateur astronomer who just wants to know what to point their telescope at tonight.

Sky2nite is a hose on that fire hydrant. It queries ANTARES, filters the stream down to objects that are actually above your horizon, bright enough for a consumer telescope, and visible during reasonable hours — turning millions of nightly alerts into a table you can act on.

### ANTARES API limitations

Working with the ANTARES API involves a few rough edges worth knowing about:

- **No native visibility filtering.** ANTARES has no concept of "observer location" or "above the horizon tonight." Every visibility calculation in Sky2nite — rise/set times, altitude, azimuth, night-time windows — is computed locally after fetching data from ANTARES.
- **Magnitude is approximate.** ANTARES reports the most recent measured magnitude for a locus, which may be from a single passband (often *g* or *r*) at an arbitrary point in the object's history. It is not a guaranteed current brightness.
- **Cursor-based pagination only.** The API does not expose a true result count for filtered queries — only an estimate of total loci, a page of results, and a cursor for the next page. The cursor is not a simple `pageSize × (page − 1)` offset: it is the exact ANTARES record index after the last item that survived all filters (magnitude, tags, visibility). Because each page scans an unpredictable number of raw records before filling up with matching objects, the cursor for page N is unknowable without having completed pages 1 through N−1. Sequential forward navigation (1 → 2 → 3) and backward navigation to already-visited pages both work fine. What is impossible is *skipping ahead* to an unvisited page — e.g. jumping from page 1 directly to page 5 — because pages 2–4 have not been fetched and their cursors do not yet exist.
- **Rate limits and latency.** The ANTARES API can be slow under load and imposes rate limits. Sky2nite caches responses to reduce hammering the upstream service (configured via `CACHE_TTL_SECONDS`).
- **No guaranteed availability.** ANTARES is a research service, not a consumer product. It can go offline for maintenance or experience data gaps between observing runs.

### The tagging system

ANTARES tags loci with machine-learning classifier outputs and cross-match results (for example `RRLyrae`, `SupernovaCandidate`, `AGN`). These are useful but have notable limitations:

- **Tags are not mutually exclusive.** A single locus can carry dozens of tags from different classifiers, many of which may be speculative or low-confidence. Filtering by a tag does *not* guarantee that classification is correct.
- **Tag vocabulary is unstable.** New classifiers are added over time and old tag names occasionally change. The tag list Sky2nite shows is fetched live from ANTARES, so what you see reflects the current state of their pipeline.
- **Many loci are untagged.** A large fraction of ANTARES loci carry no classification tags at all — they are simply "something changed." Requiring a tag in the search filter will silently exclude the majority of alerts.
- **Classifier scores are hidden.** ANTARES exposes only the tag name, not the underlying probability score. A `SupernovaCandidate` tag could reflect 95% confidence or 51% confidence — Sky2nite cannot distinguish between them.

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
| `PORT` | Port the server listens on (default `3001`) |
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

The app is available at **http://localhost:3001**.

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

Requires Node.js ≥ 20.19. PostgreSQL can be installed locally or provided via Docker — the setup script handles both.

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
- Create the PostgreSQL database — if `psql` is found it creates the database automatically; if not but Docker is available it starts a `sky2nite-db` container on port 5432; otherwise it prints manual instructions
- Install dependencies and build both client and server
- Copy the client bundle into `server/public`
- Install and start a systemd service (Linux only) so the app restarts on boot

**3. Start the application**

```bash
cd server && NODE_ENV=production node dist/index.js
```

The app is available at **http://localhost:3001**.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account in PostgreSQL. After setup, users authenticate with the login form before accessing object search endpoints.

---

## Setup — Windows (host)

Requires Node.js ≥ 20.19. PostgreSQL can be installed locally or provided via Docker — the setup script handles both.

**1. Configure environment**

```powershell
Copy-Item server\.env.example server\.env
# Edit server\.env — set DATABASE_URL, VITE_GOOGLE_MAPS_API_KEY, etc.
```

**2. Run the setup script**

Open PowerShell and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

The script will:
- Verify your Node.js version
- Create the PostgreSQL database — if `psql` is found it creates the database automatically; if not but Docker is available it starts a `sky2nite-db` container on port 5432; otherwise it prints manual instructions
- Install dependencies and build both client and server
- Copy the client bundle into `server\public`
- Register a Windows Scheduled Task (`sky2nite`) that starts the app at system boot

> **Elevated permissions required for the scheduled task.** Registering a scheduled task with `/RL HIGHEST` requires administrator rights. Right-click PowerShell and choose **Run as administrator** before running `.\setup.ps1` if you want auto-start on boot. If you run without elevation the task registration is skipped and a warning is shown — the rest of the setup completes normally.

You can manage the scheduled task later with:

```powershell
schtasks /Run    /TN sky2nite       # start
schtasks /End    /TN sky2nite       # stop
schtasks /Query  /TN sky2nite       # status
schtasks /Delete /TN sky2nite /F    # remove
```

**3. Start the application**

```powershell
cd server; $env:NODE_ENV = 'production'; node dist/index.js
```

The app is available at **http://localhost:3001**.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account in PostgreSQL. After setup, users authenticate with the login form before accessing object search endpoints.

---

## Development

To run the client and server separately with hot reload:

**1. Start a local PostgreSQL instance**

The server needs a running PostgreSQL database. The quickest way is Docker:

```bash
docker run -d \
  --name sky2nite-dev-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sky2nite \
  -p 5432:5432 \
  postgres:17
```

Or use an existing local Postgres installation — just create a `sky2nite` database and a user with access to it.

**2. Configure environment**

```bash
cp server/.env.example server/.env
```

The example file ships with `DATABASE_URL=postgresql://postgres:password@localhost:5432/sky2nite`, which matches the Docker command above. Update it if your Postgres credentials differ. At minimum also set `JWT_SECRET` to any non-empty string for local dev.

If you want Google Maps address autocomplete, create `client/.env` with:

```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**3. Install dependencies**

```bash
cd server && npm install && cd ../client && npm install
```

**4. Start the server and client**

```bash
# Terminal 1 — Express API server (http://localhost:3001)
cd server && npm run dev

# Terminal 2 — Vite dev server (http://localhost:5173)
cd client && npm run dev
```

The Vite dev server proxies `/api` requests to the Express server automatically. Open **http://localhost:5173** in your browser.

On first launch, Sky2nite shows a **first-time setup** form to create the initial user account. Subsequent visits go straight to the login form.

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
