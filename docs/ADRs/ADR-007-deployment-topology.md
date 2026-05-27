# ADR-007 — Deployment Topology (Docker Compose Service Layout)

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The application must be deployed on a self-hosted home server (CON-001). The constraints are:
- Single host machine running a modern Linux OS (Ubuntu 22.04 LTS or equivalent, per ASM-003).
- Minimum 2 vCPUs, 4 GB RAM, 20 GB storage (ASM-004).
- Docker Engine and Docker Compose installed (ASM-003).
- No cloud services, no Kubernetes, no managed database or cache services.
- All persistent data must survive container restarts (NFR-042).
- Daily database backup required (NFR-043).
- All services must be health-checked for reliability (NFR-040).
- Secrets must not be in source control (NFR-026).
- HTTPS on ports 80/443; no direct external access to internal services.

The architectural question is the specific service layout, port assignments, network segmentation, volume strategy, and environment variable injection method.

---

## Decision

**Six-service Docker Compose stack with network segmentation, named volumes, and `.env` file injection.**

Services: `nginx`, `frontend`, `backend`, `db`, `redis`, `backup`.

---

## Full Docker Compose Specification

```yaml
# /docker-compose.yml (canonical reference — implementation in Phase 6)

version: "3.9"

services:

  # ─── Reverse Proxy ────────────────────────────────────────────────
  nginx:
    image: nginx:1.25-alpine
    container_name: movieapp_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
    networks:
      - proxy_net
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # ─── Frontend (Next.js) ───────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner
    container_name: movieapp_frontend
    expose:
      - "3000"
    env_file:
      - .env.frontend
    networks:
      - proxy_net
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # ─── Backend API (NestJS) ─────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runner
    container_name: movieapp_backend
    expose:
      - "4000"
    env_file:
      - .env.backend
    networks:
      - proxy_net
      - data_net
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    command: >
      sh -c "npx prisma migrate deploy && node dist/main.js"

  # ─── Database (PostgreSQL 16) ─────────────────────────────────────
  db:
    image: postgres:16-alpine
    container_name: movieapp_db
    expose:
      - "5432"
    env_file:
      - .env.db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - data_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Cache (Redis 7) ──────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: movieapp_redis
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    networks:
      - data_net
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ─── Backup (pg_dump cron) ────────────────────────────────────────
  backup:
    image: postgres:16-alpine
    container_name: movieapp_backup
    env_file:
      - .env.db
    volumes:
      - ./backups:/backups
    networks:
      - data_net
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    # Runs pg_dump daily at 02:00 server time; retains last 7 dumps
    entrypoint: >
      sh -c "
        while true; do
          TIMESTAMP=$$(date +%Y%m%d_%H%M%S);
          PGPASSWORD=$$POSTGRES_PASSWORD pg_dump -h db -U $$POSTGRES_USER $$POSTGRES_DB
            > /backups/movieapp_$${TIMESTAMP}.sql;
          find /backups -name '*.sql' -mtime +7 -delete;
          sleep 86400;
        done
      "

# ─── Volumes ─────────────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# ─── Networks ────────────────────────────────────────────────────────
networks:
  proxy_net:
    driver: bridge
  data_net:
    driver: bridge
```

---

## Environment File Strategy

Three `.env` files, never committed to source control (all in `.gitignore`). Template `.env.*.example` files are committed with placeholder values.

**`.env.backend`**
```
DATABASE_URL=postgresql://movieapp:CHANGE_ME@db:5432/moviereview
REDIS_URL=redis://redis:6379
GOOGLE_CLIENT_ID=CHANGE_ME
GOOGLE_CLIENT_SECRET=CHANGE_ME
GOOGLE_CALLBACK_URL=https://YOUR_HOST/api/auth/google/callback
JWT_ACCESS_SECRET=CHANGE_ME_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_ME_MIN_32_CHARS
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
TMDB_API_KEY=CHANGE_ME
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
NODE_ENV=production
PORT=4000
```

**`.env.frontend`**
```
NEXT_PUBLIC_API_BASE_URL=/api
NODE_ENV=production
PORT=3000
```

**`.env.db`**
```
POSTGRES_DB=moviereview
POSTGRES_USER=movieapp
POSTGRES_PASSWORD=CHANGE_ME_MIN_32_CHARS
```

---

## Nginx Routing Configuration

```nginx
# /nginx/conf.d/default.conf (summary)

upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate     /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # Security headers (see HLD Section 7.4)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;

    # Route /api/* to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint (Nginx itself)
    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    # Route everything else to frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Startup Order and Dependencies

```
db (PostgreSQL) ──────┐
                      ├── backend (NestJS) ──── frontend (Next.js) ──── nginx
redis (Redis) ────────┘

backup depends_on: db (independent of backend/frontend startup)
```

The `backend` startup command runs `prisma migrate deploy` before launching the application, ensuring schema is current on every deploy.

---

## Network Segmentation Rationale

| Network | Members | Purpose |
|---------|---------|---------|
| `proxy_net` | nginx, frontend, backend | Nginx can proxy to frontend and backend; frontend can call backend API internally |
| `data_net` | backend, db, redis, backup | Backend accesses database and cache; backup accesses database; db and redis are isolated from public-facing services |

PostgreSQL and Redis are on `data_net` only — they cannot receive connections from the `proxy_net` or from external sources. This limits the blast radius if nginx or the frontend service were compromised.

---

## Port Exposure Summary

| Service | External Port | Internal Port | Accessible From |
|---------|-------------|--------------|-----------------|
| nginx | 80 (HTTP→redirect), 443 (HTTPS) | 80, 443 | Internet (host firewall allows 80, 443 only) |
| frontend | None (expose only) | 3000 | nginx (proxy_net) |
| backend | None (expose only) | 4000 | nginx (proxy_net), frontend (proxy_net) |
| db | None (expose only) | 5432 | backend (data_net), backup (data_net) |
| redis | None (expose only) | 6379 | backend (data_net) |
| backup | None | — | data_net (outbound to db only) |

The host firewall (iptables/ufw) must allow only ports 80 and 443 inbound. All internal Docker ports are not bound to the host interface.

---

## Backup Strategy

The `backup` service runs a daily `pg_dump` loop (sleep 86400s) and retains the last 7 daily dumps in `./backups/` on the host filesystem. This provides:
- Point-in-time recovery up to 7 days back.
- Backups on the host filesystem (outside Docker volumes), accessible directly from the host for manual retrieval or off-site copy.
- Automatic cleanup of dumps older than 7 days.

For off-site backup: the Product Owner can configure a cron job on the host to sync `./backups/` to an external location (USB drive, network share). This is documented in the deployment runbook (Phase 9).

---

## Consequences

**Positive:**
- All services are isolated behind Nginx; no internal service is directly accessible from outside the host.
- `depends_on: service_healthy` ensures services start in the correct order, preventing connection failures on fresh boot.
- `restart: unless-stopped` ensures all services recover automatically after a host reboot or crash.
- Network segmentation limits cross-service communication to only what is necessary.
- Secrets are injected via `.env` files; no credentials in source control.
- Backup service provides daily PostgreSQL dumps with automatic retention management.

**Negative:**
- Six containers add memory overhead (~600 MB total at idle: postgres ~200MB, redis ~50MB, node processes ~150MB each for frontend/backend, nginx ~10MB, backup minimal).
- Home server must have port 443 forwarded from the router if external internet access is desired (not required for LAN-only use).
- Self-signed certificate required for HTTPS; browser will show a security warning unless a proper certificate is obtained (Let's Encrypt via certbot is documented in the runbook as an optional step).
- Single-host deployment has no redundancy; if the host hardware fails, the service is unavailable. This is explicitly accepted per ASM-005.

**Neutral:**
- The `compose.yml` structure makes it straightforward to add a second backend instance behind nginx in the future (nginx upstream block supports multiple servers).

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| Kubernetes (k3s / single-node) | Production-grade orchestration; rolling deployments; resource limits | Extreme operational complexity for a home server; learning curve; overkill for a single-host deployment with ~10K users | Disproportionate complexity; CON-001 specifies Docker Compose |
| Docker Compose without Nginx (backend on host port 4000, frontend on 3000) | Simpler setup | No TLS termination; CORS complexity between ports; security headers must be duplicated in both services; no clean HTTP→HTTPS redirect | Security requirements (NFR-020, NFR-027) require TLS termination and centralized header injection; Nginx provides these cleanly |
| Traefik instead of Nginx | Auto Let's Encrypt; label-based routing | More complex configuration; Nginx is simpler and better understood; Traefik's dynamic config adds abstraction | Nginx is simpler, better documented, and sufficient for single-host routing |
| Database and Redis on the host (not containerized) | Slightly easier initial setup | Breaks the "everything in Compose" model; host-level dependency management; harder to reproduce; backup integration more complex | Consistency and reproducibility; Docker Compose manages the full stack |

---

*Produced by solution-architect — 2026-05-23*
