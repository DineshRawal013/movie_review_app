# RUNBOOK: Deployment — Movie Review App

**Owner:** devops-engineer
**Last Updated:** 2026-05-26
**Version:** 1.0
**Applies to:** Local / single-host Docker Compose deployment (v1.0.0)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Layout](#2-repository-layout)
3. [First-Time Setup](#3-first-time-setup)
4. [Standard Deploy Procedure](#4-standard-deploy-procedure)
5. [Rollback Procedure](#5-rollback-procedure)
6. [Smoke Test Checklist](#6-smoke-test-checklist)
7. [Useful Docker Commands](#7-useful-docker-commands)
8. [Environment Variable Reference](#8-environment-variable-reference)

---

## 1. Prerequisites

Before running any deployment commands, confirm the following are installed and available on the target host:

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Docker Engine | 24.x | `docker --version` |
| Docker Compose | 2.x (plugin) | `docker compose version` |
| Git | any recent | `git --version` |

Also required (secrets must be in place before step 3):

- Google OAuth credentials (Client ID and Client Secret) from Google Cloud Console
- TMDB API key from https://www.themoviedb.org/settings/api
- Strong random strings for JWT_SECRET and JWT_REFRESH_SECRET (generate with `openssl rand -base64 48`)

---

## 2. Repository Layout

```
movie-review-app/
  backend/                  NestJS API
    Dockerfile              Multi-stage; target=production for deploy
    prisma/                 Schema + migrations
  frontend/                 Next.js 14 UI
    Dockerfile              Multi-stage; target=production for deploy
    next.config.js          output: 'standalone' required for Docker
  docker-compose.yml        Development (hot-reload, bind-mount source)
  docker-compose.prod.yml   Production (pre-built images, no bind mounts)
  docker-compose.test.yml   CI integration test stack
  .env.example              Template for all required variables
  .env.prod                 NEVER committed — operator-created secrets file
```

---

## 3. First-Time Setup

### 3.1 Clone the repository

```bash
git clone <repository-url> movie-review-app
cd movie-review-app
```

### 3.2 Create the production secrets file

Copy the example file and fill in every value:

```bash
cp .env.example .env.prod
```

Open `.env.prod` in a text editor and set:

```dotenv
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://<your-host-or-domain>:3001

# Database — these credentials become the PostgreSQL superuser password on first init
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=moviereview

DATABASE_URL=postgresql://postgres:<strong-random-password>@postgres:5432/moviereview

REDIS_URL=redis://redis:6379

# JWT — generate with: openssl rand -base64 48
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-refresh-secret>
JWT_ACCESS_EXPIRES_IN=900

# Google OAuth — from Google Cloud Console
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://<your-host-or-domain>:3000/api/auth/google/callback

# TMDB
TMDB_API_KEY=<your-tmdb-api-key>
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p

# Frontend
NEXT_PUBLIC_API_URL=http://<your-host-or-domain>:3000/api
NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
```

IMPORTANT: `.env.prod` must never be committed to source control. Confirm `.gitignore` includes `*.prod` or `.env.prod`.

### 3.3 Build the Docker images

```bash
docker compose -f docker-compose.prod.yml build --no-cache
```

This builds both `movie-review-backend:latest` and `movie-review-frontend:latest` using the production multi-stage Dockerfiles. Expect 3-5 minutes on first build.

### 3.4 Start the stack for the first time

```bash
docker compose -f docker-compose.prod.yml up -d
```

On first start, Docker Compose will:
1. Launch `postgres` and wait for its health check to pass
2. Launch `redis` and wait for its health check to pass
3. Launch `backend` — the entrypoint runs `prisma migrate deploy` to create all tables, then starts `node dist/main`
4. Launch `frontend` once the backend health check passes

### 3.5 Verify startup

Check that all four containers are healthy:

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output: all services show `healthy` status within 60 seconds. If any service shows `unhealthy` or `Exit`, inspect logs:

```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

Proceed to [Section 6 — Smoke Test Checklist](#6-smoke-test-checklist).

---

## 4. Standard Deploy Procedure

Use this procedure for every subsequent release after first-time setup.

### Step 1 — Pull the new code

```bash
git fetch origin
git checkout main
git pull origin main
```

For a tagged release (recommended for production):

```bash
git fetch --tags
git checkout v1.1.0    # replace with the target tag
```

### Step 2 — Review the changelog

Read `docs/RELEASE-NOTES.md` for the target version. Note any migration notes, new required environment variables, or breaking changes.

### Step 3 — Add any new environment variables

If the release notes list new variables, add them to `.env.prod` before proceeding.

### Step 4 — Rebuild images

```bash
docker compose -f docker-compose.prod.yml build
```

### Step 5 — Perform a rolling restart

Pull down old containers and bring up the new ones. Docker volumes persist data across this step.

```bash
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

The `backend` service runs `prisma migrate deploy` automatically on startup, applying any new migrations before the server accepts traffic.

### Step 6 — Run smoke tests

Execute every item in [Section 6 — Smoke Test Checklist](#6-smoke-test-checklist). If all checks pass, the deploy is complete.

### Step 7 — Tag the deployed commit (if not already tagged)

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 5. Rollback Procedure

Use this procedure if smoke tests fail or a regression is detected post-deploy.

### Immediate rollback — previous Docker image

If the previous images are still in the local Docker cache (they will be unless explicitly pruned):

```bash
# Find the previous image digest
docker images movie-review-backend
docker images movie-review-frontend

# Edit docker-compose.prod.yml to pin the image tag to the last known good version,
# or check out the previous git tag and rebuild:
git checkout v<previous-tag>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

### Database migration rollback

Prisma does not support automatic down-migrations. If a migration must be reverted:

1. Identify the migration to roll back: `docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status`
2. The DBA must write and apply a manual reverse migration SQL script against the database.
3. After the SQL is applied, check out the previous code version and rebuild.

Contact the database-architect before executing any manual SQL against the production database.

### Emergency — full stack teardown (data-destructive, last resort)

```bash
# Stops all containers and removes the named volumes (ALL DATA LOST)
docker compose -f docker-compose.prod.yml down -v
```

Only use `-v` if a complete fresh start is explicitly required. Confirm a database backup exists first.

---

## 6. Smoke Test Checklist

Run these tests immediately after every deploy. Each check should complete within 10 seconds.

Replace `localhost` with your host/domain if deploying to a remote server.

```
[ ] 1. Frontend serves HTTP 200 on GET /
        curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
        Expected: 200

[ ] 2. Backend health endpoint responds
        curl -s http://localhost:3000/api/health
        Expected: {"status":"ok"} or similar 200 JSON body

[ ] 3. GET /api/movies returns paginated list
        curl -s "http://localhost:3000/api/movies?page=1&limit=10"
        Expected: 200 JSON with { data: [...], total: N, page: 1 }

[ ] 4. Google OAuth redirect is active
        curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/google
        Expected: 302 (redirect to accounts.google.com)

[ ] 5. Movie detail returns runtime, director, and cast
        curl -s "http://localhost:3000/api/movies/550"
        Expected: 200 JSON with non-null runtime, director, and castJson fields
        (TMDB ID 550 = Fight Club; pre-populate if TMDB cache is empty)

[ ] 6. Admin panel accessible
        Open http://localhost:3001/admin in a browser
        Expected: Redirects to /login (unauthenticated) — HTTP 302 or client-side redirect

[ ] 7. Database migrations are current
        docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
        Expected: "All migrations have been applied"

[ ] 8. No ERROR-level log lines in the last 2 minutes
        docker compose -f docker-compose.prod.yml logs --since=2m backend | grep '"level":"error"'
        Expected: no output
```

All 8 checks must pass before the deploy is considered successful. If any check fails, initiate the [Rollback Procedure](#5-rollback-procedure).

---

## 7. Useful Docker Commands

```bash
# View live logs for all services
docker compose -f docker-compose.prod.yml logs -f

# View logs for a single service
docker compose -f docker-compose.prod.yml logs -f backend

# Open a shell in the running backend container
docker compose -f docker-compose.prod.yml exec backend sh

# Run Prisma migrate status manually
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# Check resource usage
docker stats

# Stop all services (keeps volumes)
docker compose -f docker-compose.prod.yml down

# Stop all services and remove volumes (destructive)
docker compose -f docker-compose.prod.yml down -v

# Remove unused images to free disk space
docker image prune -f
```

---

## 8. Environment Variable Reference

All variables consumed by the stack. See `.env.example` for default/placeholder values.

| Variable | Consumed By | Description |
|----------|-------------|-------------|
| `NODE_ENV` | backend | Must be `production` |
| `PORT` | backend | HTTP listen port (default 3000) |
| `FRONTEND_URL` | backend | Used for CORS and OAuth redirect origins |
| `POSTGRES_USER` | postgres, backend | DB superuser name |
| `POSTGRES_PASSWORD` | postgres, backend | DB superuser password |
| `POSTGRES_DB` | postgres, backend | Database name |
| `DATABASE_URL` | backend | Full Prisma connection string |
| `REDIS_URL` | backend | Redis connection string |
| `JWT_SECRET` | backend | Signs access tokens — must be 32+ chars |
| `JWT_REFRESH_SECRET` | backend | Signs refresh tokens — must be 32+ chars |
| `JWT_ACCESS_EXPIRES_IN` | backend | Access token TTL in seconds (default 900) |
| `GOOGLE_CLIENT_ID` | backend | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | backend | Google OAuth app client secret |
| `GOOGLE_CALLBACK_URL` | backend | Must match an authorized redirect URI in Google Cloud Console |
| `TMDB_API_KEY` | backend | TMDB v3 API key |
| `TMDB_BASE_URL` | backend | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_BASE_URL` | backend | `https://image.tmdb.org/t/p` |
| `NEXT_PUBLIC_API_URL` | frontend | Browser-visible backend URL |
| `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL` | frontend | Browser-visible TMDB image CDN URL |
