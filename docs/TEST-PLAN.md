# Master Test Plan — Movie Review Application

**Document ID:** TEST-PLAN-1.0
**Owner:** qa-engineer
**Status:** BASELINE — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Produced by:** qa-engineer (Phase 5 — RTM Baseline)
**Reviewed by:** tech-lead

---

## Table of Contents

1. [Test Objectives and Scope](#1-test-objectives-and-scope)
2. [Test Levels and Approaches](#2-test-levels-and-approaches)
3. [Test Environment](#3-test-environment)
4. [Entry and Exit Criteria](#4-entry-and-exit-criteria)
5. [Defect Severity Classification](#5-defect-severity-classification)
6. [Risk-Based Testing Priorities](#6-risk-based-testing-priorities)
7. [Coverage Targets](#7-coverage-targets)
8. [Performance Criteria](#8-performance-criteria)
9. [Test Schedule](#9-test-schedule)
10. [Roles and Responsibilities](#10-roles-and-responsibilities)
11. [Test Deliverables](#11-test-deliverables)

---

## 1. Test Objectives and Scope

### 1.1 Objectives

1. Verify that all P0 and P1 functional requirements defined in SRS.md are correctly implemented.
2. Confirm that non-functional requirements (performance, security, accessibility) meet defined acceptance thresholds.
3. Validate that the system behaves correctly at boundary conditions, error paths, and integration points.
4. Ensure no P0 or P1 defects remain open at release.
5. Provide the Product Owner with sufficient evidence to grant UAT sign-off and GO-LIVE approval.

### 1.2 In Scope

- All 62 functional requirements (FR-001–FR-085) spanning Movie Browsing, Search, Detail, Authentication, Ratings, Reviews, User Profile, and Admin functionality.
- All 32 non-functional requirements (NFR-001–NFR-063) spanning Performance, Security, Accessibility, Availability, Maintainability, and GDPR compliance.
- All 9 database tables and their constraint enforcement.
- All 31 API endpoints defined in api-spec.yaml.
- All 9 wireframe screens from design/wireframes.md.
- Review moderation state machine (Active, Hidden, Deleted transitions).
- TMDB integration: cache-aside logic, fallback behaviour, rate limit guard.
- Authentication flows: Google OAuth, JWT issuance, token refresh, logout, GDPR deletion.
- Admin operations: moderation queue, movie management, user role management, audit log.

### 1.3 Out of Scope

- Mobile native app testing (not in scope for v1.0).
- Load testing beyond 100 concurrent users (target audience v1.0 is ~10K users/year).
- Penetration testing beyond OWASP ZAP automated baseline scan.
- Third-party TMDB API reliability testing (tested via mocks only).
- Browser compatibility beyond: Chrome (latest), Firefox (latest), Safari (latest), Edge (latest).
- Performance testing on the production home server hardware (tested on Docker Compose dev environment; production hardware is acknowledged to have different characteristics).

---

## 2. Test Levels and Approaches

### 2.1 Unit Testing (Jest)

**Purpose:** Verify individual functions, service methods, DTOs, guards, and utilities in isolation.

**Tooling:** Jest 29+ with ts-jest; NestJS Testing module for service-level tests.

**Scope:**
- All NestJS service methods: AuthService, MoviesService, ReviewsService, RatingsService, UsersService, AdminService, TMDBService, CacheService.
- All DTO validation constraints (class-validator).
- Guard logic: JwtAuthGuard, RolesGuard, CsrfGuard.
- Utility functions: hash.util.ts, pagination.util.ts.
- Key algorithms: TMDB cache-aside, sole-admin guard, GDPR deletion, rating aggregation (service layer).

**Approach:**
- Mock all external dependencies (PrismaService, CacheService, TMDBService, HTTP calls) using Jest mocks.
- Test both happy paths and error paths for each method.
- Boundary value testing for review character limits, star rating range (1–5), pagination params.
- State transition testing for review moderation state machine.

**Location:** `backend/src/**/*.spec.ts` (co-located with source files).

**Coverage Target:** Statements ≥ 80%, Branches ≥ 80% for all `*.service.ts` and `*.guard.ts` files.

---

### 2.2 Integration Testing (Supertest)

**Purpose:** Verify that NestJS modules, controllers, services, and Prisma interact correctly as assembled units; test real HTTP request/response cycles against an in-memory or test database.

**Tooling:** Supertest, Jest, NestJS TestingModule, PostgreSQL test database (Docker Compose test profile), Prisma with test migrations.

**Scope:**
- All 31 API endpoints defined in api-spec.yaml.
- Authentication middleware chain (JWT validation, role guards, CSRF guard).
- Request validation (ValidationPipe — correct DTOs, boundary violations).
- HTTP error responses: 400, 401, 403, 404, 409, 422, 429, 502.
- TMDB fallback behaviour (mock TMDB unavailable; verify cached response served).
- Token refresh and revocation flows.
- Rate limiting (exceed thresholds; verify 429 with Retry-After header).
- CSRF protection (submit state-changing requests without CSRF token; verify 403).
- Database constraint enforcement (duplicate review, invalid rating value, sole-admin guard).
- GDPR account deletion: all associated data removed.

**Approach:**
- Spin up NestJS app connected to isolated test PostgreSQL DB (seeded with genres + minimal fixtures).
- Each test file uses `beforeAll` / `afterAll` to manage DB state via Prisma.
- Use `@faker-js/faker` for realistic test data generation.
- JWT tokens generated programmatically for test users (no actual Google OAuth calls).
- TMDB calls mocked with `nock` or Jest module mocks.

**Location:** `backend/test/**/*.e2e-spec.ts`.

---

### 2.3 End-to-End Testing (Playwright)

**Purpose:** Verify complete user journeys through the browser, from UI interaction to API response, as experienced by real users.

**Tooling:** Playwright 1.44+; `@axe-core/playwright` for accessibility.

**Scope:**
- Critical user flows:
  1. Guest: arrive on home page → browse movies → view detail page.
  2. Guest: search for a movie → apply genre filter → view result.
  3. New user: click "Sign in with Google" → OAuth callback → authenticated session established.
  4. Registered user: navigate to movie detail → submit star rating → rating reflected in aggregate.
  5. Registered user: submit text review → review appears in list → edit review → delete review.
  6. Admin: log in → navigate to moderation queue → hide a review → restore a review → delete a review.
  7. Admin: add a movie from TMDB → movie appears in browse → sync metadata.
  8. Registered user: navigate to own profile → view own reviews → delete account → redirected to home as guest.
  9. Accessibility: run axe-core on all 9 wireframe screens (/, /movies, /movies/[id], /login, /users/[userId], /profile, /admin/moderation, /admin/movies, /admin/users).

**Approach:**
- Run against Docker Compose test environment with seeded data.
- Google OAuth flow tested via mock OAuth server (no real Google credentials required in CI).
- Browser: Chromium (default), Firefox, WebKit (Safari-equivalent) — all via Playwright.
- Screenshots and videos captured on test failure for defect evidence.
- Visual regression: screenshot comparison for key UI states (optional in v1.0; flagged as enhancement).

**Location:** `e2e/tests/**/*.spec.ts`.

---

### 2.4 Performance Testing (k6)

**Purpose:** Verify NFR-001 (page load < 2s), NFR-002 (API p95 < 500ms), NFR-004 (100 concurrent users without > 20% degradation).

**Tooling:** k6 v0.50+ (open source).

**Scenarios:**

| Scenario | VUs | Duration | Target Endpoint(s) | Success Criteria |
|----------|-----|----------|--------------------|-----------------|
| Baseline — Browse | 1 VU | 5 min | GET /api/movies | p95 < 500ms |
| Baseline — Detail | 1 VU | 5 min | GET /api/movies/{id} | p95 < 500ms |
| Baseline — Search | 1 VU | 5 min | GET /api/movies?q=action | p95 < 500ms |
| Load — Browse | 100 VUs | 10 min | GET /api/movies | p95 < 2000ms; error rate < 1% |
| Load — Review Submit | 50 VUs | 5 min | POST /api/movies/{id}/reviews | p95 < 500ms; error rate < 1% |
| Volume — 10K Users / 100K Reviews | 10 VUs | 10 min (seeded DB) | GET /api/movies/{id}/reviews | p95 < 1000ms; no query timeouts |

**Approach:**
- Run against Docker Compose test environment (not production).
- DB seeded with representative data volume (10K user records, 100K review records) for volume scenario.
- Results output to k6 HTML report; p50, p90, p95, p99 reported per endpoint.

**Location:** `k6/scenarios/*.js`.

---

### 2.5 Security Testing (OWASP ZAP)

**Purpose:** Verify NFR-020–NFR-028. Identify common web application vulnerabilities before production deployment.

**Tooling:** OWASP ZAP 2.14+ (Docker image: `ghcr.io/zaproxy/zaproxy:stable`).

**Scope:**
- Passive scan: all pages visited during E2E test run; ZAP proxy mode.
- Active scan: targeted at `/api` base URL; full baseline scan.
- Specific checks:
  - Cookie flags (HttpOnly, Secure, SameSite) — NFR-020.
  - Security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) — NFR-027.
  - SQL injection probes (ORM should block; but verify) — NFR-023.
  - XSS probes in review body, search query — general OWASP Top 10.
  - CSRF bypass attempt — NFR-024.
  - JWT token exposure in responses/URLs — NFR-020.
  - Rate limit bypass probe — NFR-025.

**Approach:**
- ZAP runs in CI as a Docker container against the Docker Compose test environment.
- Baseline scan (`zap-baseline.py`) run first; report parsed for high/critical findings.
- Active scan (`zap-full-scan.py`) run in scheduled CI job (not every PR — too slow).
- Zero high or critical findings required for Phase 8 (Deploy) sign-off.

**Location:** `.github/workflows/security-scan.yml`; ZAP reports in `docs/test-reports/security/`.

---

### 2.6 Accessibility Testing (axe-core)

**Purpose:** Verify NFR-030–NFR-034 (WCAG 2.1 AA compliance).

**Tooling:** `@axe-core/playwright` integrated into Playwright E2E tests; manual keyboard navigation.

**Scope:**
- All 9 wireframe screens: Home, Browse/Search, Movie Detail, Sign-In, User Profile, Admin Moderation, Admin Movies, Admin Users, Privacy.
- Star rating widget keyboard interaction (FR-044).
- Review form: character counter, submit/cancel buttons.
- Modal dialogs: confirmation prompts for account deletion, movie removal.
- Focus management on route changes (SPA navigation).

**Approach:**
- `injectAxe()` + `checkA11y()` called on each page visit in dedicated accessibility spec.
- axe rules targeted: WCAG 2.1 AA (wcag2a, wcag2aa, wcag21a, wcag21aa).
- Violations classified by axe severity: critical, serious, moderate, minor.
- Exit criterion: zero critical or serious violations.
- Manual keyboard navigation walkthrough performed by qa-engineer for each critical user flow.

**Location:** `e2e/tests/accessibility.spec.ts`.

---

## 3. Test Environment

### 3.1 Environment Architecture

```
Docker Compose — Test Profile (docker-compose.test.yml)

┌─────────────────────────────────────────────────────────────┐
│  Services                                                    │
│                                                             │
│  backend:test     NestJS app — NODE_ENV=test               │
│  frontend:test    Next.js app — NEXT_PUBLIC_API_URL=/api   │
│  postgres:test    PostgreSQL 16 — isolated test DB         │
│  redis:test       Redis 7 — isolated test Redis instance   │
│  nginx:test       Nginx — proxies /api to backend          │
│                                                             │
│  Mock services:                                            │
│  mock-oauth       Local OAuth mock server (for E2E)        │
│  mock-tmdb        WireMock / nock HTTP mock (for E2E)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Database Seeding Strategy

| Seed Level | Content | Used By |
|------------|---------|---------|
| Baseline seed | 19 TMDB genre rows only (migration 004) | All test levels |
| Integration seed | 5 sample movies + 3 test users (1 admin, 2 regular) | Integration tests |
| Volume seed | 10,000 users + 100,000 reviews + 50,000 ratings | Performance tests |

**Seed execution:**
- Baseline: `npx prisma migrate deploy` runs migration 004 automatically.
- Integration: Jest `globalSetup` script calls `prisma.$executeRaw` to insert fixtures.
- Volume: dedicated seed script `scripts/seed-volume.ts` using Prisma `createMany`.

**Isolation strategy:**
- Each integration test file wraps tests in a database transaction that is rolled back after each test (using Prisma `$transaction` with manual rollback).
- E2E tests use a clean DB snapshot restored before each test run (`pg_dump` / `pg_restore`).

### 3.3 Test Data Management

- All PII in test data uses fake data (`@faker-js/faker`); no real user data.
- Google OAuth mock returns a synthetic Google profile (fixed `sub` claim per test user).
- TMDB mock returns static fixtures matching the api-spec.yaml MovieDetail schema.
- JWT tokens for integration tests are signed with a known test secret (`TEST_JWT_SECRET`).

### 3.4 CI/CD Integration

| Test Level | When Runs | Pipeline Step | Failure Action |
|------------|-----------|---------------|----------------|
| Unit (Jest) | Every PR + every push to main | `npm run test:unit` | Block merge |
| Integration (Supertest) | Every PR + every push to main | `npm run test:integration` | Block merge |
| E2E (Playwright) | Every push to main + release branches | `npm run test:e2e` | Block release |
| Performance (k6) | Manually triggered + pre-release | `npm run test:perf` | Block release if SLA missed |
| Security (OWASP ZAP) | Weekly scheduled + pre-release | `.github/workflows/security-scan.yml` | Block release if high/critical |
| Accessibility (axe-core) | Every push to main (via E2E job) | Embedded in Playwright run | Block release if critical/serious |

---

## 4. Entry and Exit Criteria

### 4.1 Unit Testing

**Entry criteria:**
- Feature branch merged to main with passing lint (ESLint zero errors).
- At least one service method implementation complete.

**Exit criteria:**
- All unit test files execute without failures.
- Jest coverage report: statements ≥ 80%, branches ≥ 80% for `*.service.ts` files.
- Zero skipped tests without documented reason.

---

### 4.2 Integration Testing

**Entry criteria:**
- All unit tests pass.
- API endpoints implemented and handling basic happy-path requests.
- Test database migrations applied successfully.

**Exit criteria:**
- All integration tests pass (zero failures).
- All 31 API endpoints covered by at least one integration test (happy path + one error path).
- Rate limiting, CSRF, and auth guard tests all pass.
- No new P0/P1 defects introduced (per defect severity classification in Section 5).

---

### 4.3 End-to-End Testing

**Entry criteria:**
- Integration tests pass.
- Frontend and backend build successfully (`npm run build` exits 0 for both).
- Docker Compose test environment starts cleanly (all containers healthy).
- All critical user flows from wireframes are implemented.

**Exit criteria:**
- All E2E tests pass in Chromium, Firefox, and WebKit.
- Zero critical or serious axe-core violations on all 9 wireframe screens.
- Screenshots evidence captured for all critical user flow completions.
- Test run video archived for UAT review.

---

### 4.4 Performance Testing

**Entry criteria:**
- E2E tests pass.
- Docker Compose test environment running with realistic seed data.
- k6 scenarios written and parameterized.

**Exit criteria:**
- Browse page: p95 response time < 2000ms at 100 concurrent users.
- API CRUD operations: p95 latency < 500ms under load scenario (50 VUs).
- Error rate < 1% across all load scenarios.
- No container OOM events during load test runs.
- Volume test: all queries return within SLA (p95 < 1000ms) against 100K review dataset.

---

### 4.5 Security Testing

**Entry criteria:**
- E2E tests pass.
- OWASP ZAP Docker image available.
- Test environment accessible on localhost.

**Exit criteria:**
- Zero HIGH or CRITICAL findings in OWASP ZAP baseline scan.
- Zero MEDIUM findings related to auth token exposure or SQL injection.
- All required security headers present (CSP, X-Frame-Options, X-Content-Type-Options).
- Cookie security flags verified (HttpOnly, Secure, SameSite=Strict).

---

### 4.6 User Acceptance Testing (UAT)

**Entry criteria:**
- All previous test levels (unit, integration, E2E, performance, security) pass their exit criteria.
- Release build deployed to a staging/pre-prod environment (or production-equivalent Docker Compose).
- UAT test scenarios documented and shared with Product Owner.
- No open P0 defects; no open P1 defects without approved deferral.

**Exit criteria:**
- Product Owner completes all UAT acceptance scenarios documented in RTM.md acceptance criteria.
- UAT pass rate ≥ 95% (≤ 5% of test cases may have minor, P3-level issues).
- Zero P0 or P1 defects open.
- Product Owner signs UAT sign-off form.
- qa-engineer issues formal GO recommendation.

---

## 5. Defect Severity Classification

| Severity | Code | Definition | Examples | Resolution SLA |
|----------|------|------------|---------|----------------|
| P0 — Blocker | P0 | System crash, data loss, security breach, auth bypass, complete feature unavailable. Blocks all testing. | Cannot log in; rating data not saved; admin panel accessible without auth; SQL injection possible | Fix immediately; release blocked |
| P1 — Critical | P1 | Major feature broken; incorrect business logic; data integrity issue; accessibility critical violation | Review 500-char limit not enforced; aggregate rating wrong; WCAG critical violation | Fix before release; no deferral without explicit PO approval |
| P2 — Major | P2 | Feature partially broken; incorrect display; error message missing; moderate performance degradation | Pagination off by one; incorrect sort order; missing error message on form validation | Fix before release; may be deferred to hotfix with PO approval |
| P3 — Minor | P3 | Cosmetic issues; minor UX inconsistencies; incorrect copy; low-severity accessibility issue | Typo in UI label; hover state colour slightly off; WCAG moderate violation; formatting issue | Log and prioritize for next version |

**Defect lifecycle:**
1. OPEN: qa-engineer raises defect in `/docs/defects/DEF-NNN.md`.
2. ASSIGNED: tech-lead assigns to responsible engineer.
3. IN-FIX: Engineer resolves.
4. FIXED: Engineer marks fixed; PR merged.
5. RETEST: qa-engineer retests in test environment.
6. CLOSED: qa-engineer confirms fix. RTM status updated.
7. DEFERRED (P2/P3 only): PO approval required; tracked for next version.

---

## 6. Risk-Based Testing Priorities

The following areas carry the highest risk and receive prioritized testing attention (first-pass focus in Phase 7):

### Priority 1 — Authentication Flow

**Risk:** Security vulnerability in OAuth flow or JWT handling could allow unauthorized access.
**Risk level:** Critical (P0 impact).
**Test focus:**
- Google OAuth callback creates correct user session.
- JWT stored only in httpOnly cookie (not accessible via JS).
- Expired/revoked tokens correctly rejected (401).
- Admin role guard blocks non-admin users from /admin/* (403).
- Token refresh rotation works correctly; old token invalidated.
- CSRF protection on all state-changing endpoints.

### Priority 2 — Review Submission and Moderation

**Risk:** Review data integrity failure (duplicate reviews, bypassed character limits) or incorrect moderation state transitions could corrupt public content.
**Risk level:** High (P0/P1 impact).
**Test focus:**
- One review per user per movie enforced (409 on duplicate).
- 500-char limit enforced both client-side and server-side.
- Blank/whitespace reviews rejected.
- State machine transitions: active → hidden → restored; active → deleted (terminal).
- Admin delete correctly removes review from public view.
- Deleted review does not reappear on page refresh.

### Priority 3 — Admin Moderation and Audit Trail

**Risk:** Admin actions without audit log entries create compliance gaps; incorrect moderation could affect public content integrity.
**Risk level:** High (P0 impact).
**Test focus:**
- Every admin action (delete, hide, restore) creates an audit log entry.
- Audit log entries are immutable (no UPDATE or DELETE on audit_log table).
- Sole-admin guard prevents accidental lockout.
- Admin cannot demote themselves when sole admin.

### Priority 4 — TMDB Integration and Cache Fallback

**Risk:** TMDB API unavailability without proper fallback could cause the entire browse/discovery feature to fail.
**Risk level:** Medium (P1 impact; mitigated by cache-aside).
**Test focus:**
- Cache-aside: verify no TMDB call on second identical request within TTL.
- Stale cache fallback: when TMDB is down and primary cache expired, stale cache is served.
- TMDB rate limit guard: 429 from TMDB triggers retry with exponential backoff.
- Browse page still renders when TMDB is completely unavailable (serves cached data or informative error).

### Priority 5 — Performance Under Load

**Risk:** Slow queries or missing indexes could cause SLA breaches under moderate load.
**Risk level:** Medium (NFR-001, NFR-002 impact).
**Test focus:**
- Review list query performance on movie detail page (idx_reviews_movie_id_created_at).
- Movie search with trigram index (idx_movies_title_trgm).
- Rating aggregate read after upsert (trigger correctness + performance).
- Browse page with genre filter and pagination.

---

## 7. Coverage Targets

| Test Level | Metric | Target | Enforcement |
|------------|--------|--------|-------------|
| Unit (backend) | Statement coverage — service files | ≥ 80% | Jest --coverage; CI fails below threshold |
| Unit (backend) | Branch coverage — service files | ≥ 80% | Jest --coverage |
| Unit (frontend) | Statement coverage — components/hooks | ≥ 70% | Jest --coverage |
| Integration | API endpoint coverage | 100% of 31 endpoints (≥1 happy path + ≥1 error path) | Manual verification via RTM |
| E2E | Critical user flow coverage | 100% of 8 defined flows (Section 2.3) | Playwright report |
| Accessibility | Wireframe screen coverage | 100% of 9 screens | axe-core Playwright report |
| Requirements | P0 requirements with ≥1 test case | 100% (30/30) | RTM Coverage Summary |
| Requirements | P1 requirements with ≥1 test case | 100% (27/27) | RTM Coverage Summary |

---

## 8. Performance Criteria

These thresholds are the acceptance criteria for NFR-001, NFR-002, NFR-004. Tests that fail these thresholds are treated as P1 defects.

| Metric | Endpoint / Action | Threshold | Measurement Method |
|--------|------------------|-----------|-------------------|
| Page load time (p95) | Home page (/) | < 2000ms | k6 + Lighthouse |
| Page load time (p95) | Browse/Search (/movies) | < 2000ms | k6 + Lighthouse |
| Page load time (p95) | Movie Detail (/movies/{id}) | < 2000ms | k6 + Lighthouse |
| API response time (p95) | GET /api/movies | < 500ms | k6 |
| API response time (p95) | GET /api/movies/{id} | < 500ms | k6 |
| API response time (p95) | GET /api/movies/{id}/reviews | < 500ms | k6 |
| API response time (p95) | POST /api/movies/{id}/reviews | < 500ms | k6 |
| API response time (p95) | POST /api/movies/{id}/rating | < 500ms | k6 |
| Concurrent user load | All browse/read endpoints | p95 < 2000ms at 100 VUs | k6 ramp scenario |
| Error rate under load | All endpoints | < 1% | k6 |
| Volume degradation | GET /api/movies/{id}/reviews (100K reviews DB) | p95 < 1000ms | k6 + volume seed |
| Load degradation factor | p95 at 100VU vs p95 at 1VU | ≤ 120% (20% degradation max) | k6 comparison |

---

## 9. Test Schedule

Aligned to Phase 7 (Test). Phase 7 begins after Phase 6 (Build) internal gate is passed.

| Week | Activities | Owner | Exit Milestone |
|------|-----------|-------|----------------|
| Phase 6 (Build) — ongoing | Unit tests written alongside code; CI runs on every PR; integration tests drafted | backend-engineer, frontend-engineer, qa-engineer | Unit coverage ≥ 80% at build complete |
| Phase 7, Week 1 | System testing: integration test suite execution; defect triage; P0/P1 fixes | qa-engineer (lead), backend-engineer (fixes) | Zero P0 defects open |
| Phase 7, Week 1–2 | E2E test execution (all 8 user flows, 3 browsers); accessibility audit; defect cycle 1 | qa-engineer (lead), frontend-engineer (fixes) | Zero P0/P1 defects open from E2E |
| Phase 7, Week 2 | Performance testing (k6); security scan (OWASP ZAP); defect cycle 2 | qa-engineer (lead), devops-engineer (infra), backend-engineer (fixes) | All NFR thresholds met |
| Phase 7, Week 3 | Full regression run (all test levels); defect verification; test report compilation | qa-engineer | Regression pass ≥ 95% |
| Phase 7, Week 3 | UAT: Product Owner executes acceptance scenarios; final defect triage | Product Owner (executes), qa-engineer (support) | UAT sign-off |
| Phase 7 — End | qa-engineer issues GO recommendation; RTM updated to 100% VERIFIED | qa-engineer | GO recommendation issued |

---

## 10. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| qa-engineer | Owns all test plan, test cases, RTM updates, defect reports, test execution, GO recommendation. Coordinates defect triage meetings. |
| backend-engineer | Authors unit and integration tests for backend modules. Fixes backend defects. Supports qa-engineer during API debugging. |
| frontend-engineer | Authors unit tests for frontend components/hooks. Supports E2E test setup. Fixes frontend defects. |
| fullstack-engineer | Supports E2E test environment setup (Docker Compose test profile). Fixes integration-layer defects. |
| devops-engineer | Maintains CI/CD pipeline test stages. Provisions test environment. Supports performance test environment (k6 runner). |
| tech-lead | Reviews test plan and RTM at phase gate. Triages deferred defects. Presents UAT to Product Owner. |
| Product Owner | Performs UAT. Signs off UAT gate. Approves deferred defects. Issues GO-LIVE approval. |

---

## 11. Test Deliverables

| Deliverable | Location | Due |
|-------------|---------- |-----|
| RTM v1.0 (this document) | /docs/RTM.md | Phase 5 gate |
| Master Test Plan v1.0 (this document) | /docs/TEST-PLAN.md | Phase 5 gate |
| Test case files (TC-AUTH, TC-MOVIES, TC-REVIEWS, TC-RATINGS, TC-ADMIN, TC-NFR) | /docs/test-cases/ | Phase 5 gate |
| Unit test code (Jest) | backend/src/**/*.spec.ts | Phase 6 (Build) |
| Integration test code (Supertest) | backend/test/**/*.e2e-spec.ts | Phase 6 (Build) |
| E2E test code (Playwright) | e2e/tests/**/*.spec.ts | Phase 6 (Build) |
| Performance test scripts (k6) | k6/scenarios/*.js | Phase 6 (Build) |
| Defect reports | /docs/defects/DEF-NNN.md | Phase 7 (Test) — as found |
| System Test Report | /docs/test-reports/system-test-report.md | Phase 7 (Test) |
| Performance Test Report | /docs/test-reports/perf-test-report.md | Phase 7 (Test) |
| Security Scan Report | /docs/test-reports/security/zap-report.html | Phase 7 (Test) |
| Accessibility Audit Report | /docs/test-reports/accessibility-report.md | Phase 7 (Test) |
| UAT Sign-Off Record | /docs/test-reports/uat-signoff.md | Phase 7 gate |
| RTM v2.0 (all VERIFIED) | /docs/RTM.md | Phase 7 gate |

---

*Produced by qa-engineer — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
