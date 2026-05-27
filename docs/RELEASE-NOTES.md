# Release Notes — Movie Review Application

---

## v1.0.0 — 2026-05-26

**Release type:** Initial production release
**Deployment method:** Docker Compose (single-host, self-hosted)
**Deployment runbook:** `/docs/runbooks/runbook-deploy.md`

---

### Summary

v1.0.0 is the first production-ready release of the Movie Review Application. It delivers the core movie discovery, rating, review, and admin moderation capabilities described in SRS-1.0. The application is deployed as a four-container Docker Compose stack (PostgreSQL 16, Redis 7, NestJS API, Next.js 14 frontend).

---

### Features Shipped (P0 and P1)

#### Movie Discovery

- Browse movies sourced live from The Movie Database (TMDB) API, with server-side caching (1-hour TTL via Redis).
- Global search bar with real-time filtering by title.
- Filter movies by genre and release year range.
- Trending and Popular sections powered by TMDB popular endpoint.
- Paginated browse and search results.
- Graceful degradation when TMDB is unavailable — cached data is served; no 500 errors exposed to users.

#### Movie Detail Pages

- Each movie has a unique URL (`/movies/{id}`).
- Detail page displays: title, poster, backdrop, release date, genres, synopsis, aggregate rating (mean to 1dp, total vote count), and community reviews sorted newest-first.
- Each review card shows reviewer name, avatar, star rating, review text, and submission date.
- Runtime, director, and cast fields are stored in the database schema and returned by the API; frontend rendering is deferred (see Known Issues).

#### User Authentication

- Sign in with Google (OAuth 2.0) only.
- Sessions managed via JWT access token (15 minutes) and rotating refresh token (7 days), both stored in httpOnly cookies.
- Silent token refresh on expiry.
- Sign out invalidates the refresh token in the database and clears all cookies.
- User display name and avatar populated from Google profile on first login.

#### Star Ratings

- Registered users submit one star rating (1-5) per movie.
- Users may update or delete their rating at any time.
- Aggregate rating is recalculated automatically after every rating change.
- Star rating UI is keyboard-navigable and meets WCAG 2.1 AA contrast requirements.

#### Text Reviews

- Registered users submit one text review per movie (maximum 500 characters).
- Live character counter with client-side and server-side enforcement.
- Users may edit or delete their own review at any time.
- New and edited reviews appear immediately (React Query cache invalidation).
- Blank/whitespace-only reviews are rejected both client-side and server-side (HTTP 422).

#### User Profile

- Authenticated users can view and manage their own profile at `/profile`.
- Profile displays Google display name, avatar, and member-since date.
- GDPR account deletion: "Delete my account" permanently erases the user's data including all reviews, ratings, and refresh tokens.

#### Admin Panel

- Role-based access: admin role assigned per user; sole-admin guard prevents self-demotion.
- Moderation queue displays flagged reviews with flag counts.
- Admins can permanently delete any review or soft-hide/restore a review; all actions are written to an immutable audit log.
- Registered users can flag reviews for admin attention.
- Admins can add movies from TMDB, trigger metadata refresh, or remove a movie (cascade-deletes all associated reviews and ratings).
- Admins can promote or demote users; cannot demote themselves if sole admin.

#### Platform and Infrastructure

- Four-container Docker Compose stack with named volumes for data persistence.
- All database migrations managed by Prisma Migrate.
- GitHub Actions CI pipeline: lint, type check, unit tests (89.12% statement coverage), integration tests against a live Postgres+Redis service, and production Docker image build.
- Structured JSON application logs via nestjs-pino.
- Security headers via Helmet.
- CSRF protection on all state-changing endpoints.
- Rate limiting via NestJS Throttler.
- TMDB response caching via Redis.

---

### Known Issues and Deferred Items

The following defects were identified during Phase 7 static analysis and are tracked in `/docs/defects/`. All were acknowledged at Phase 8 go-live.

| ID | Severity | Description | Impact |
|----|----------|-------------|--------|
| DEF-001 | P1 | Cookie SameSite set to Lax instead of Strict | Minor security policy gap; httpOnly and Secure flags are correct |
| DEF-002 | P2 | Account deletion hard-deletes the user row instead of soft-deleting | GDPR erasure of associated data is correct; audit trail for the user row itself is lost |
| DEF-003 | P2 | Admin hide/restore endpoint uses POST instead of PATCH (OpenAPI spec mismatch) | API contract inconsistency; functionality is correct |
| DEF-004 | P2 | Public profile endpoint `GET /users/{userId}` not implemented | Other users' profiles are not viewable; own profile at `/profile` works |
| DEF-005 | P2 | CreateReviewDto field named `content` but OpenAPI spec uses `body` | Client integrators must use `content` not `body` when calling the review creation endpoint directly |
| DEF-006 | P2 | Runtime, director, and cast fields not rendered on the movie detail frontend page | Fields are stored in DB and returned by API; frontend display not wired up |
| DEF-007 | P3 | Trailer URL not extracted from TMDB, stored, or displayed | FR-027 (YouTube trailer link) not functional |
| DEF-008 | P3 | Release year not displayed on movie browse cards | FR-002 partially fulfilled; year visible on detail page |
| DEF-009 | P2 | Admin full moderation queue (`GET /admin/reviews`) endpoint not implemented | Admins can view flagged reviews; unflagged reviews not browsable in admin |

All P2 and P3 defects are targeted for v1.0.1. DEF-001 (P1) will be patched as a priority hotfix.

The following requirements were formally deferred to v2.0:

- FR-005: "Top Rated" separate sort
- FR-015: Sort by community rating, release year, title
- FR-028: Similar/related movies from TMDB
- FR-063: Export personal data as JSON
- NFR-025: Rate limiting verification (middleware present; exact limits require live test confirmation)
- Performance NFRs (NFR-001, NFR-002, NFR-004): require k6 load tests against a running instance
- WCAG colour contrast and axe-core scan (NFR-030, NFR-033): require live environment

---

### Upgrade and Migration Notes

This is the initial release. No upgrade steps from a prior version are required.

On first deploy, `prisma migrate deploy` (run automatically by the backend container entrypoint) creates all tables, indexes, and constraints.

The following environment variables are required and have no defaults — they must be present in `.env.prod` before starting the stack:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TMDB_API_KEY`

See `/docs/runbooks/runbook-deploy.md` Section 3.2 for the full variable reference.

---

### Component Versions

| Component | Version |
|-----------|---------|
| Node.js | 20 (Alpine) |
| NestJS | 10.3.x |
| Next.js | 14.2.3 |
| PostgreSQL | 16 (Alpine) |
| Redis | 7 (Alpine) |
| Prisma | 5.12.x |
| TypeScript | 5.4.5 |

---

*Produced by devops-engineer — 2026-05-26*
