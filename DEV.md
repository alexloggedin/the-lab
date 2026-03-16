# Local Development Guide
---

## Modes

### 1. Frontend Only (mock data, no Docker needed)
Use this when building UI components and you don't need real Nextcloud data.

```bash
npm run dev
```

Open `http://localhost:5173`. The app loads from `index.html` with a simulated
`window.OC` context. All API calls return fixture data from `src/dev/fixtures.js`.

Add a test file to public/mock-audio/test.wav for playback.

---

### 2. Full Stack (real backend, hot reload)
Use this when working on PHP or testing against real Nextcloud data. Vite proxies
all requests to the Docker container while still serving your React source with
hot module replacement.

**Prerequisites — do this once:**

```bash
# Start Docker
docker compose -f docker-dev/docker-compose.dev.yml up -d

# Sync PHP files to the container
./sync.sh --php-only

# Copy the Vite dev flag into the container
# This tells the PHP controller to load from Vite instead of the built bundle
docker cp .vite-dev \
  $(docker compose -f docker-dev/docker-compose.dev.yml ps -q nextcloud):/var/www/html/custom_apps/thelab/.vite-dev
```

**Then start the dev server:**

```bash
npm run dev:docker
```

Open `http://localhost:5173/index.php/apps/thelab/`. The page is served by
Nextcloud (real `window.OC` context, real CSRF tokens), but your React source
is hot-reloaded by Vite. API calls go to the real PHP backend.

**During development:**

| Change type | Action needed |
|---|---|
| React / CSS | Just save — browser updates instantly |
| PHP (`lib/`, `appinfo/`, `templates/`) | `./sync.sh --php-only` |

---

## How It Works

### The `.vite-dev` flag
A file at the root of the project. When copied into the container, `PageController.php`
detects it and injects Vite dev server script tags into the page instead of loading
the built `thelab.js` bundle. It is git-ignored and must never be committed.

```
.vite-dev present in container  →  loads from localhost:5173 (Vite dev)
.vite-dev absent from container →  loads thelab.js (built bundle)
```

### The Vite proxy
`vite.config.js` forwards all requests that aren't Vite internals to Docker on
`localhost:8080`. This means your React app talks to the real PHP backend
transparently — no CORS issues, real auth cookies, real CSRF tokens.

```
Browser → localhost:5173/@vite/client        →  Vite (HMR)
Browser → localhost:5173/src/main.jsx        →  Vite (your source)
Browser → localhost:5173/apps/thelab/api/*   →  Docker :8080 (PHP)
Browser → localhost:5173/index.php/*         →  Docker :8080 (Nextcloud)
```

### Mock data
`src/dev/useMockData.js` controls whether API calls use fixture data or hit the
real backend:

```
npm run dev         →  VITE_USE_MOCK unset  →  mock ON
npm run dev:docker  →  VITE_USE_MOCK=false  →  mock OFF. (local docker backend)
npm run build       →  DEV=false            →  mock OFF (always)
```

Fixtures live in `src/dev/fixtures.js`. Add or edit them to test different UI states.

---

## Makefile Shortcuts

```bash
make dev-enable-vite   # copy .vite-dev into container
make dev-disable-vite  # remove .vite-dev from container
make deploy-prod       # build, sync, and disable vite dev mode
```