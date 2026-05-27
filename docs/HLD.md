# High-Level Design — Movie Review Application

**Document ID:** HLD-1.0
**Owner:** solution-architect
**Status:** DRAFT — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Produced by:** solution-architect (Phase 3 — Architecture)
**Reviewed by:** tech-lead

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Non-Functional Requirement Mapping](#5-non-functional-requirement-mapping)
6. [Deployment Topology](#6-deployment-topology)
7. [Security Architecture](#7-security-architecture)
8. [Scalability and Performance Strategy](#8-scalability-and-performance-strategy)

---

## 1. System Overview

The Movie Review Application is a three-tier web application:

- **Presentation tier:** A React (Next.js) single-page + server-side-rendered frontend served from a Node.js container.
- **Application tier:** A RESTful backend API (NestJS on Node.js) handling business logic, authentication middleware, and TMDB integration.
- **Data tier:** A PostgreSQL database storing users, reviews, ratings, cached TMDB metadata, and the audit log. A Redis instance provides short-TTL caching for TMDB API responses and JWT refresh-token revocation tracking.

All tiers run as Docker Compose services on a single home server host. External dependencies are Google OAuth 2.0 (authentication) and the TMDB REST API (movie metadata). There is no cloud dependency; a reverse proxy (Nginx) handles TLS termination and routes incoming HTTP/HTTPS traffic to the frontend and backend services.

### Design Principles

1. **Separation of concerns** — frontend, backend, and data stores are fully isolated; they communicate only over documented interfaces.
2. **Stateless API** — the backend holds no in-process session state; all session context is carried in httpOnly JWT cookies, enabling future horizontal scaling.
3. **Cache-first for TMDB** — all TMDB data passes through a caching layer before reaching the database query path, protecting the free-tier rate limit and supporting graceful degradation.
4. **Minimal attack surface** — no credentials in source control, all secrets via environment variables, HTTPS termination at Nginx, standard HTTP security headers applied.
5. **GDPR by design** — personal data fields are minimal and enumerated; delete-cascade rules enforce complete erasure on account deletion.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          HOME SERVER HOST                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Docker Compose Network                      │  │
│  │                                                                │  │
│  │  ┌──────────────┐   HTTPS/80,443    ┌─────────────────────┐   │  │
│  │  │              │ ◄──────────────── │                     │   │  │
│  │  │    Nginx     │                   │   External Client   │   │  │
│  │  │  (Reverse    │ ─────────────────►│   (Browser)         │   │  │
│  │  │   Proxy /    │                   │                     │   │  │
│  │  │  TLS Term.)  │                   └─────────────────────┘   │  │
│  │  └──────┬───────┘                                             │  │
│  │         │  /api/*  ──────────────────────────────────────┐    │  │
│  │         │  /*  ──────────────────────────┐               │    │  │
│  │         │                                │               │    │  │
│  │  ┌──────▼──────────────┐    ┌────────────▼─────────────┐ │    │  │
│  │  │                     │    │                          │ │    │  │
│  │  │   Frontend Service  │    │  Backend API Service     │ │    │  │
│  │  │   (Next.js / Node)  │    │  (NestJS / Node.js)      │ │    │  │
│  │  │   Port: 3000        │    │  Port: 4000              │ │    │  │
│  │  │                     │    │                          │ │    │  │
│  │  │  - SSR pages        │    │  - Auth middleware       │ │    │  │
│  │  │  - Static assets    │    │  - REST controllers      │ │    │  │
│  │  │  - API client       │    │  - Business logic svc    │ │    │  │
│  │  │                     │    │  - TMDB integration      │ │    │  │
│  │  └─────────────────────┘    │  - Rate limiter          │ │    │  │
│  │                             │  - CSRF guard            │ │    │  │
│  │                             └──────────────┬───────────┘ │    │  │
│  │                                            │             │    │  │
│  │                    ┌───────────────────────┴──────────┐  │    │  │
│  │                    │                                  │  │    │  │
│  │          ┌─────────▼───────────┐    ┌────────────────▼┐ │    │  │
│  │          │                     │    │                 │ │    │  │
│  │          │  PostgreSQL          │    │   Redis Cache   │ │    │  │
│  │          │  (Port: 5432)        │    │   (Port: 6379)  │ │    │  │
│  │          │                     │    │                 │ │    │  │
│  │          │  - users            │    │  - TMDB resp.   │ │    │  │
│  │          │  - movies (cached)  │    │  - RT revoc.    │ │    │  │
│  │          │  - reviews          │    │    list         │ │    │  │
│  │          │  - ratings          │    │                 │ │    │  │
│  │          │  - audit_log        │    └─────────────────┘ │    │  │
│  │          │  - refresh_tokens   │                        │    │  │
│  │          └─────────────────────┘                        │    │  │
│  │                                                         │    │  │
│  └─────────────────────────────────────────────────────────┘    │  │
│                                                                  │  │
└──────────────────────────────────────────────────────────────────┘  │

External Dependencies:
  ┌─────────────────────┐      ┌─────────────────────┐
  │  Google OAuth 2.0   │      │    TMDB REST API     │
  │  accounts.google.com│      │    api.themoviedb.org│
  └─────────────────────┘      └─────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Nginx — Reverse Proxy / TLS Termination

**Role:** Single entry point for all external traffic.

**Responsibilities:**
- TLS termination (self-signed cert for LAN; Let's Encrypt optional for public domain).
- Route `/api/*` requests to the backend service (port 4000).
- Route all other requests to the frontend service (port 3000).
- Apply HTTP security headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.
- Block direct external access to internal ports (5432, 6379, 4000, 3000).

**Technology:** Official `nginx:alpine` Docker image.

---

### 3.2 Frontend Service — Next.js Application

**Role:** Renders the user interface; handles client-side interactivity.

**Responsibilities:**
- Server-side rendering (SSR) for public-facing pages (browse, movie detail) to meet the 2-second load time NFR-001 and improve SEO.
- Client-side hydration for interactive components (search bar, review form, star widget).
- Communicates with the backend exclusively via `/api/*` REST calls (same-origin, cookies forwarded automatically).
- No direct TMDB or database access from the frontend.
- Implements WCAG 2.1 AA: semantic HTML, ARIA labels, keyboard navigation, focus management.

**Technology:** Next.js 14 (App Router), React 18, TypeScript. See ADR-001.

**Key modules:**
- `app/` — Next.js App Router pages and layouts.
- `components/` — Reusable UI components (MovieCard, StarRating, ReviewForm, etc.).
- `lib/api-client.ts` — Typed fetch wrapper for backend API calls.
- `hooks/` — Custom React hooks for auth state, reviews, ratings.
- `styles/` — Tailwind CSS configuration and global styles.

---

### 3.3 Backend API Service — NestJS Application

**Role:** Core application server; enforces all business rules.

**Responsibilities:**
- Implements all REST API endpoints (see `/docs/api-spec.yaml` produced in Phase 4).
- Authentication middleware: validates JWT access tokens on protected routes; redirects OAuth callbacks from Google.
- Refresh token rotation: issues new access + refresh token pairs on valid refresh requests; invalidates old tokens in Redis.
- TMDB Integration Module: fetches, transforms, and caches movie data.
- Rate limiting: per-IP on auth endpoints; per-user on review submissions.
- CSRF protection: double-submit cookie pattern on all state-changing endpoints.
- Admin guard: role-based access control layer checking the `isAdmin` claim in JWT.
- Audit log writer: records all admin actions to `audit_log` table.

**Technology:** NestJS 10, TypeScript, Passport.js (Google OAuth strategy + JWT strategy). See ADR-002.

**Key modules:**
- `auth/` — Google OAuth controller, JWT strategy, refresh token service, Guards.
- `movies/` — TMDB proxy controller, local cache service, movie CRUD for admin.
- `reviews/` — Review CRUD controller, business logic service, moderation.
- `ratings/` — Rating CRUD controller, aggregate recalculation service.
- `users/` — User profile controller, account deletion (GDPR), data export.
- `admin/` — Admin panel endpoints, audit log, user role management.
- `common/` — Interceptors, filters, rate-limiter guard, CSRF guard, logging.

---

### 3.4 PostgreSQL — Primary Data Store

**Role:** Single source of truth for all persistent application data.

**Responsibilities:**
- Stores all user accounts, reviews, ratings, cached TMDB movie metadata, refresh tokens (hashed), and the audit log.
- Enforces referential integrity via foreign keys and cascade deletes (GDPR compliance).
- Parameterized queries enforced by the ORM (Prisma); no raw SQL string concatenation.

**Technology:** PostgreSQL 16 (official Docker image). See ADR-003 (ORM selection).

**Key tables (high-level; detail in ERD Phase 4):**
- `users` — id, google_id, email, display_name, avatar_url, is_admin, created_at, deleted_at.
- `movies` — id, tmdb_id, title, poster_url, backdrop_url, overview, release_date, runtime, genres, director, cast, cached_at.
- `reviews` — id, user_id, movie_id, body, is_hidden, created_at, updated_at, deleted_at.
- `ratings` — id, user_id, movie_id, value (1–5), created_at, updated_at.
- `refresh_tokens` — id, user_id, token_hash, expires_at, revoked_at.
- `audit_log` — id, admin_user_id, action_type, target_review_id, created_at.
- `review_flags` — id, user_id, review_id, created_at.

---

### 3.5 Redis — Caching and Token Revocation

**Role:** Fast in-memory store for short-lived data that does not require persistence.

**Responsibilities:**
- Cache TMDB API responses (JSON blobs keyed by TMDB endpoint + parameters, TTL = 1 hour minimum per NFR-003).
- Maintain a revocation set for refresh tokens that have been explicitly signed out (sign-out before natural expiry). Checked on every refresh request.
- Optional: rate-limit counters (sliding window per IP / user).

**Technology:** Redis 7 (official Docker image). See ADR-004.

**Key namespaces:**
- `tmdb:{endpoint}:{params_hash}` → cached JSON response (TTL: 3600s).
- `rt_revoked:{token_hash}` → flag value `1` (TTL: matching token expiry).
- `rl:auth:{ip}` → request count (TTL: 60s sliding window).
- `rl:reviews:{user_id}` → request count (TTL: 3600s sliding window).

---

### 3.6 TMDB Integration Layer

**Role:** Isolates all external TMDB API interactions behind a clean internal interface.

**Responsibilities:**
- Cache-aside pattern: on every request, check Redis first; on cache miss, call TMDB API; write response to Redis; return data.
- Transform TMDB response shapes into the application's internal domain model (no TMDB schema leaks into downstream layers).
- Handle TMDB API failures (network error, rate limit 429, 5xx) with retry (max 2 retries, exponential backoff) and fallback to stale cached data if available.
- Respect TMDB rate limit: max 40 requests per 10 seconds; implement a token-bucket rate limiter for outbound TMDB calls.

**Technology:** NestJS HTTP module (wrapping `axios`), `@nestjs/cache-manager` with Redis adapter. See ADR-005.

---

### 3.7 Authentication Middleware

**Role:** Handles the Google OAuth 2.0 flow and JWT lifecycle.

**Responsibilities:**
- Initiate OAuth flow: redirect user to Google authorization endpoint with correct scopes (`openid`, `email`, `profile`).
- Handle OAuth callback: exchange code for tokens with Google, extract profile, upsert user record in PostgreSQL.
- Issue JWT access token (15-minute expiry, signed with RS256) and refresh token (7-day expiry, stored hashed in PostgreSQL `refresh_tokens` table, also issued as httpOnly cookie).
- Validate access tokens on each protected request (NestJS JwtAuthGuard).
- Rotate refresh tokens on use (refresh → revoke old → issue new).
- On sign-out: add refresh token hash to Redis revocation set; clear cookies.

**Technology:** Passport.js with `passport-google-oauth20` and `passport-jwt` strategies. See ADR-006.

---

## 4. Data Flow Diagrams

### 4.1 User Authentication Flow

```
Browser                  Nginx              Backend (NestJS)         Google OAuth         PostgreSQL            Redis
   │                       │                      │                       │                   │                   │
   │─── GET /auth/google ──►│── /api/auth/google ─►│                       │                   │                   │
   │                       │                      │── Redirect(302) ──────►│                   │                   │
   │◄──────────────────────── 302 to accounts.google.com ─────────────────│                   │                   │
   │                       │                      │                       │                   │                   │
   │─── [User consents] ───────────────────────── Google callback ────────►│                   │                   │
   │                       │                      │◄── GET /auth/google/callback?code=... ─────│                   │
   │                       │                      │                       │                   │                   │
   │                       │                      │── POST token exchange ►│                   │                   │
   │                       │                      │◄── {id_token, profile}─│                   │                   │
   │                       │                      │                       │                   │                   │
   │                       │                      │── UPSERT user ────────────────────────────►│                   │
   │                       │                      │◄── user record ───────────────────────────│                   │
   │                       │                      │                       │                   │                   │
   │                       │                      │── STORE refresh token hash ───────────────►│                   │
   │                       │                      │                       │                   │                   │
   │◄── Set-Cookie: access_token (httpOnly, 15min) ─────────────────────────────────────────── │                   │
   │◄── Set-Cookie: refresh_token (httpOnly, 7d) ──────────────────────────────────────────────│                   │
   │◄── 302 redirect to / ─────────────────────────────────────────────────────────────────────│                   │
```

### 4.2 Movie Search Flow

```
Browser                 Nginx             Backend (NestJS)         Redis             TMDB API         PostgreSQL
   │                      │                     │                    │                   │                  │
   │── GET /api/movies ──►│────────────────────►│                    │                   │                  │
   │   ?search=batman     │                     │── GET tmdb:{hash} ►│                   │                  │
   │                      │                     │                    │                   │                  │
   │                      │                     │  [Cache HIT]       │                   │                  │
   │                      │                     │◄── cached JSON ────│                   │                  │
   │◄─ 200 {movies:[...]} ◄─────────────────────│                    │                   │                  │
   │                      │                     │                    │                   │                  │
   │                      │                     │  [Cache MISS]      │                   │                  │
   │                      │                     │── GET /search/movie?query=batman ─────►│                  │
   │                      │                     │◄── {results:[...]} ────────────────────│                  │
   │                      │                     │── SET tmdb:{hash} TTL=3600s ──────────►│                  │
   │                      │                     │── UPSERT movies ──────────────────────────────────────────►│
   │◄─ 200 {movies:[...]} ◄─────────────────────│                    │                   │                  │
```

### 4.3 Review Submission Flow

```
Browser               Nginx          Backend (NestJS)       JwtAuthGuard        PostgreSQL
   │                    │                  │                     │                   │
   │─ POST /api/reviews►│─────────────────►│                     │                   │
   │  Cookie: access_tok│                  │── validate JWT ─────►│                   │
   │  body: {movieId,   │                  │◄── {userId, isAdmin}─│                   │
   │  body, rating}     │                  │                     │                   │
   │                    │                  │── CSRF check ──────────────────────────────────
   │                    │                  │── validate body (500 char, not blank)         │
   │                    │                  │── INSERT review ────────────────────────────► │
   │                    │                  │── UPSERT rating ────────────────────────────► │
   │                    │                  │── UPDATE aggregate ─────────────────────────► │
   │◄─ 201 {review} ───◄────────────────── │                     │                   │
```

### 4.4 Token Refresh Flow

```
Browser              Nginx           Backend (NestJS)         Redis            PostgreSQL
   │                   │                   │                    │                   │
   │─ POST /auth/refresh►─────────────────►│                    │                   │
   │  Cookie: refresh_token                │── hash token       │                   │
   │                   │                   │── GET rt_revoked:h ►│                   │
   │                   │                   │                    │                   │
   │                   │                   │  [If revoked: 401]  │                   │
   │                   │                   │── SELECT WHERE hash ────────────────── ►│
   │                   │                   │◄── token record ──────────────────────  │
   │                   │                   │  [If expired: 401]  │                   │
   │                   │                   │── INSERT new refresh token hash ───────►│
   │                   │                   │── SET rt_revoked: old hash ──────────── ►│
   │◄─ Set-Cookie: new access + refresh ◄──│                    │                   │
```

---

## 5. Non-Functional Requirement Mapping

Every P0/P1 NFR from SRS Section 4 is mapped to an architectural decision below.

### 5.1 Performance

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-001 (P0) | Page load < 2s under LAN | Next.js SSR pre-renders critical pages; static assets served from Nginx; Redis caches TMDB responses to eliminate round-trip latency. |
| NFR-002 (P1) | CRUD API responses < 500ms | Prisma ORM with indexed queries; PostgreSQL indices on `movie_id`, `user_id` in reviews/ratings tables. Direct DB access, no ORM N+1 queries (explicit eager loading). |
| NFR-003 (P1) | TMDB responses cached >= 1 hour | Redis cache-aside with TTL=3600s. Cache-hit path is sub-millisecond vs. 200-400ms TMDB round-trip. |
| NFR-004 (P2) | 100 concurrent users w/o >20% degradation | Stateless NestJS API enables connection-pool tuning; PostgreSQL connection pool (pg-pool, max 20 connections). Redis absorbs read spikes for TMDB data. |

### 5.2 Scalability

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-010 (P1) | Support 10K users, 100K reviews w/o schema change | Schema designed with no row limits; B-tree indices on high-cardinality columns; pagination on all list endpoints (cursor-based or offset). |
| NFR-011 (P2) | Stateless API layer | NestJS holds no in-process session state; all session context in JWT cookies; Redis is the only shared state store, accessible to any future API replica. |

### 5.3 Security

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-020 (P0) | Tokens in httpOnly cookies only | Tokens set via `Set-Cookie` with `HttpOnly; Secure; SameSite=Strict`. NestJS never returns raw tokens in response bodies. |
| NFR-021 (P0) | JWT validated on every protected request | NestJS `JwtAuthGuard` applied globally; route handlers opt-in to public access via `@Public()` decorator. |
| NFR-022 (P0) | Admin role verified on admin endpoints | NestJS `RolesGuard` checks `isAdmin` claim in JWT payload; returns HTTP 403 on violation. |
| NFR-023 (P0) | Parameterized queries only | Prisma ORM generates parameterized SQL; raw query escape hatch is disabled by convention. |
| NFR-024 (P1) | CSRF protection | Double-submit cookie pattern: backend issues a `csrf_token` cookie (non-httpOnly) on login; frontend reads it and sends as `X-CSRF-Token` header; backend validates match on state-changing requests. |
| NFR-025 (P1) | Rate limiting | `@nestjs/throttler` middleware: 10 req/min/IP on auth endpoints; 20 req/hr/user on review submission. Counters stored in Redis. |
| NFR-026 (P1) | No credentials in source control | All secrets (TMDB key, Google OAuth credentials, JWT secret, DB password) injected via `.env` at runtime; `.env` in `.gitignore`. |
| NFR-027 (P1) | HTTP security headers | Nginx config applies: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy` (strict-dynamic nonce), `Referrer-Policy: no-referrer`. |
| NFR-028 (P2) | OWASP Top 10 baseline | Addressed by: parameterized queries (SQLi), CSP (XSS), CSRF guard, rate limiting (brute force), HTTPS + HSTS (transport). Formal automated scan in Phase 7. |

### 5.4 Accessibility

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-030 (P0) | WCAG 2.1 AA on all public pages | Next.js renders semantic HTML; design system (Phase 4) defines WCAG-compliant component patterns; axe-core integrated into CI. |
| NFR-031 (P0) | Keyboard navigation + ARIA labels | React components use `<button>`, `<input>`, `<nav>` semantics; star rating widget uses `role="radiogroup"` pattern; focus trap on modals. |
| NFR-032 (P0) | Alt text on all non-decorative images | `next/image` `alt` prop is required via TypeScript type; movie posters and avatars always include descriptive alt. |
| NFR-033 (P1) | Colour contrast 4.5:1 / 3:1 | Design system (Phase 4) specifies token-based colour palette tested against WCAG contrast ratios. Tailwind CSS with custom tokens. |
| NFR-034 (P1) | Visible focus indicators | CSS `focus-visible` outline applied globally; never `outline: none` without replacement. |

### 5.5 Availability and Reliability

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-040 (P1) | 99% uptime target | Docker Compose `restart: unless-stopped` policy on all services; Nginx health checks; PostgreSQL data on named volume survives container restarts. |
| NFR-041 (P1) | Graceful TMDB degradation | Cache-aside: if TMDB unreachable, Redis/PostgreSQL stale data is served; UI shows "data may be outdated" banner. Search returns empty with informative message if cache also cold. |
| NFR-042 (P1) | Survive container restarts | PostgreSQL data on named Docker volume `postgres_data`; Redis data optionally persisted via AOF (not strictly required; TMDB cache is re-warmable). |
| NFR-043 (P2) | Daily database backup | DevOps-managed `pg_dump` cron inside a `backup` service (Docker Compose); dumps to a bind-mounted host directory. See ADR-007 for backup service detail. |

### 5.6 Maintainability

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-050 (P1) | Unit test coverage >= 80% (backend) | NestJS module structure facilitates unit testing of services in isolation; Jest configured with coverage thresholds; enforced in GitHub Actions CI. |
| NFR-051 (P1) | Zero ESLint errors pre-CI | ESLint + Prettier configured in monorepo root; GitHub Actions lint job runs before test job. |
| NFR-052 (P1) | All config in .env | NestJS `ConfigModule` (Joi schema validation); Next.js `NEXT_PUBLIC_*` env vars. `.env.example` committed to source. |
| NFR-053 (P2) | Structured JSON logs | NestJS custom logger using `pino`; log format: `{requestId, timestamp, level, message, ...context}`. |

### 5.7 Compliance (GDPR-aware)

| NFR | Requirement | Architectural Response |
|-----|-------------|----------------------|
| NFR-060 (P1) | Minimum personal data | `users` table stores only: `google_id`, `email`, `display_name`, `avatar_url`. Email is not displayed in the UI. |
| NFR-061 (P1) | Right to erasure | `DELETE /api/users/me` triggers: soft-delete of user record, cascade hard-delete of all reviews/ratings, revocation of all tokens. Runs in a single DB transaction. |
| NFR-062 (P2) | Data export | `GET /api/users/me/export` returns JSON containing user profile + all reviews + all ratings. |
| NFR-063 (P1) | Privacy notice | Static `/privacy` page linked from footer; hosted in Next.js. |

---

## 6. Deployment Topology

### 6.1 Docker Compose Service Layout

```yaml
# Summary — see /docs/ADRs/ADR-007 for full specification

services:
  nginx:           # Reverse proxy + TLS termination
  frontend:        # Next.js application
  backend:         # NestJS REST API
  db:              # PostgreSQL 16
  redis:           # Redis 7
  backup:          # pg_dump cron (daily)
```

### 6.2 Service Specifications

| Service | Image | Exposed Port (host) | Internal Port | Networks | Volumes |
|---------|-------|-------------------|---------------|----------|---------|
| nginx | nginx:alpine | 80, 443 | 80, 443 | `proxy`, `frontend` | `./nginx/nginx.conf:/etc/nginx/nginx.conf:ro`, `./certs:/etc/nginx/certs:ro` |
| frontend | custom build | — (internal only) | 3000 | `frontend` | — |
| backend | custom build | — (internal only) | 4000 | `frontend`, `backend` | — |
| db | postgres:16-alpine | — (internal only) | 5432 | `backend` | `postgres_data:/var/lib/postgresql/data` |
| redis | redis:7-alpine | — (internal only) | 6379 | `backend` | `redis_data:/data` |
| backup | custom (pg_dump) | — | — | `backend` | `./backups:/backups` (host bind mount) |

### 6.3 Networks

| Network | Purpose | Members |
|---------|---------|---------|
| `proxy` | Nginx ↔ internet + Nginx ↔ frontend | nginx, frontend |
| `frontend` | Frontend ↔ backend | frontend, backend, nginx |
| `backend` | Backend ↔ data stores | backend, db, redis, backup |

No service is accessible directly from outside the host except via Nginx on ports 80/443.

### 6.4 Environment Variables (per service)

**backend:**
```
DATABASE_URL=postgresql://user:password@db:5432/moviereview
REDIS_URL=redis://redis:6379
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://<host>/api/auth/google/callback
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
TMDB_API_KEY=...
TMDB_BASE_URL=https://api.themoviedb.org/3
NODE_ENV=production
```

**frontend:**
```
NEXT_PUBLIC_API_BASE_URL=/api
NODE_ENV=production
```

**db:**
```
POSTGRES_DB=moviereview
POSTGRES_USER=movieapp
POSTGRES_PASSWORD=...
```

### 6.5 Data Persistence

- `postgres_data` volume: all application data. Must be backed up.
- `redis_data` volume: optional; Redis data is reconstructible from PostgreSQL + TMDB. Persistence via AOF is recommended but not required.
- `./backups` bind mount: daily `pg_dump` output; resides on the host filesystem for easy retrieval.

### 6.6 Health Checks

Each service defines a Docker health check:
- `nginx`: `curl -f http://localhost/health`
- `frontend`: `curl -f http://localhost:3000/api/health`
- `backend`: `curl -f http://localhost:4000/health`
- `db`: `pg_isready -U movieapp`
- `redis`: `redis-cli ping`

Services declare `depends_on: condition: service_healthy` dependencies to enforce startup order:
`nginx` → `frontend` → `backend` → `db`, `redis`

---

## 7. Security Architecture

### 7.1 Google OAuth + JWT Token Flow

```
1. User clicks "Sign in with Google"
   → Browser redirects to Google authorization endpoint
   → Scopes: openid, email, profile

2. User consents
   → Google redirects to /api/auth/google/callback?code=...&state=...
   → Backend exchanges code for Google tokens using PKCE
   → Backend extracts user profile from id_token (sub, email, name, picture)

3. Backend issues application tokens
   → JWT access token: signed RS256, payload {sub: userId, email, isAdmin, iat, exp}
     Expiry: 15 minutes
   → Refresh token: cryptographically random 256-bit value
     Hash (SHA-256) stored in PostgreSQL refresh_tokens table
     Expiry: 7 days
   → Both set as httpOnly, Secure, SameSite=Strict cookies

4. Subsequent requests
   → Access token cookie attached automatically by browser
   → JwtAuthGuard extracts and validates token on every protected route
   → No server-side session lookup required (stateless)

5. Silent refresh
   → Frontend detects 401 response → POST /api/auth/refresh
   → Backend validates refresh cookie:
     a. Hash token
     b. Check Redis revocation set
     c. Check PostgreSQL for matching, non-expired record
     d. Issue new token pair, revoke old refresh token
   → Retry original request with new access token

6. Sign-out
   → DELETE /api/auth/session
   → Backend: add refresh token hash to Redis revocation set (TTL = remaining lifetime)
   → Backend: delete record from PostgreSQL refresh_tokens
   → Backend: clear both cookies (Set-Cookie with Max-Age=0)
```

### 7.2 CSRF Protection

**Mechanism:** Double-submit cookie pattern.

```
On login:
  Backend sets:
    - access_token cookie (httpOnly, Secure, SameSite=Strict)
    - refresh_token cookie (httpOnly, Secure, SameSite=Strict)
    - csrf_token cookie (Secure, SameSite=Strict — NOT httpOnly, so JS can read it)

On state-changing requests (POST/PUT/PATCH/DELETE):
  Frontend reads document.cookie for csrf_token
  Frontend sends X-CSRF-Token: <value> header

Backend CsrfGuard:
  Reads X-CSRF-Token header
  Reads csrf_token cookie
  Validates they match
  Returns 403 if mismatch
```

SameSite=Strict on auth cookies provides defense-in-depth; the CSRF double-submit provides explicit validation.

### 7.3 Rate Limiting

| Endpoint Group | Limit | Window | Identifier | Backend |
|---------------|-------|--------|-----------|---------|
| `POST /api/auth/google` | 10 req | 60s | IP address | Redis sliding window |
| `POST /api/auth/refresh` | 10 req | 60s | IP address | Redis sliding window |
| `POST /api/reviews` | 20 req | 3600s | user_id (JWT) | Redis sliding window |
| `PUT/PATCH /api/reviews/:id` | 20 req | 3600s | user_id (JWT) | Redis sliding window |
| All other endpoints | 200 req | 60s | IP address | Redis sliding window |

NestJS `ThrottlerGuard` applied globally; per-route overrides via `@Throttle()` decorator.

### 7.4 HTTP Security Headers (Nginx)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' https://image.tmdb.org https://lh3.googleusercontent.com data:; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none';" always;
```

### 7.5 Authorization Layers

```
Request → Nginx (TLS, headers) → NestJS
           → CsrfGuard (POST/PUT/PATCH/DELETE)
           → ThrottlerGuard (rate limit)
           → JwtAuthGuard (validate access token) — all non-@Public routes
           → RolesGuard (isAdmin check) — /api/admin/* routes
           → Controller handler
```

### 7.6 Secrets Management

- All secrets injected via `.env` files at Docker Compose startup.
- `.env` is in `.gitignore`; `.env.example` is committed with placeholder values.
- JWT access token uses RSA key pair (RS256); private key in backend env, no public key needed client-side (server-side verification only). Alternatively HS256 with a strong random secret is acceptable for single-server deployment.
- PostgreSQL password: minimum 32-character random string generated at first setup.
- TMDB API key: Product Owner supplies at build/deploy time.

---

## 8. Scalability and Performance Strategy

### 8.1 Database Performance

- **Indices (planned in ERD, Phase 4):**
  - `reviews(movie_id)` — for fetching reviews per movie detail page.
  - `reviews(user_id)` — for user profile page.
  - `ratings(movie_id)` — for aggregate recalculation.
  - `ratings(user_id, movie_id)` — unique index enforcing one rating per user per movie.
  - `movies(tmdb_id)` — unique index for cache upsert lookup.
  - `refresh_tokens(token_hash)` — for token validation lookup.

- **Aggregate rating:** Stored as a computed column `avg_rating` and `rating_count` on the `movies` table, updated via a PostgreSQL trigger on INSERT/UPDATE/DELETE on `ratings`. This avoids full-table aggregate scans on every movie detail page load.

- **Pagination:** All list endpoints (browse, search, reviews) use keyset (cursor-based) pagination to avoid expensive OFFSET scans at large page numbers.

### 8.2 Caching Strategy

**Layer 1 — Redis (hot cache):**
- TMDB API responses: 1-hour TTL. Covers repeated searches, trending/popular movie lists, and movie detail metadata.
- Rate limit counters: short-lived sliding window counters.

**Layer 2 — PostgreSQL (warm cache):**
- Once a TMDB movie is fetched and cached locally, subsequent requests that need full movie detail (reviews + metadata combined) are served entirely from PostgreSQL — no Redis or TMDB round-trip required.
- `cached_at` timestamp on `movies` table allows the backend to detect stale entries (configurable threshold, e.g., 24 hours) and trigger background refresh.

**Cache invalidation:**
- TMDB data: TTL-based expiry (Redis 1h, PostgreSQL stale threshold 24h).
- Review/rating aggregates: updated synchronously on write operations (trigger-based in PostgreSQL).

### 8.3 Stateless API Design

The NestJS backend stores no application state in process memory. All shared state (sessions, cache, rate limits, revoked tokens) resides in Redis. This means:
- Container restarts do not lose session data.
- A second backend container instance could be added to Docker Compose without code changes (future scaling path).

### 8.4 Connection Pool

PostgreSQL connection pool via Prisma's built-in connection pool:
- Default pool size: 10 connections.
- Maximum: configurable via `DATABASE_URL?connection_limit=20`.
- Sufficient for home-server scale (~100 concurrent users per NFR-004).

### 8.5 Home Server Constraints

The architecture is deliberately scoped to single-host Docker Compose:
- No external load balancer, no Kubernetes, no cloud CDN — unnecessary complexity for the target user base.
- The Nginx reverse proxy provides a clear upgrade path: a second backend replica can be added to Docker Compose and Nginx upstreamed with a trivial config change.
- Redis persistence (AOF) is optional — TMDB data is re-warmable from the external API; the only irreplaceable data is in PostgreSQL.

---

*Produced by solution-architect — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
