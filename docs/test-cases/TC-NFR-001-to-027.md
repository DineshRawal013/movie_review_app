# Test Cases — Non-Functional Requirements (TC-NFR)

**Module:** All modules (cross-cutting)
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** NFR-001 through NFR-063

---

## TC-NFR-001 — Page Load Time < 2 Seconds at 100 Concurrent Users

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-001 |
| **Title** | Home, search results, and movie detail pages load in < 2 seconds under 100 concurrent users |
| **Requirement ID** | NFR-001 |
| **Priority** | P0 |
| **Test Type** | Performance (k6) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose test environment running with representative seeded data (50 movies, 500 reviews).
- TMDB responses cached in Redis (eliminate external API latency from measurement).
- k6 v0.50+ installed.

**Test Steps:**
1. Run k6 scenario — Browse page load: 100 VUs, 10-minute sustained load, GET `/api/movies`.
2. Collect p50, p90, p95, p99 response time metrics.
3. Run k6 scenario — Detail page load: 100 VUs, 10-minute sustained load, GET `/api/movies/{id}`.
4. Collect p50, p90, p95, p99.
5. Run k6 scenario — Search: 100 VUs, GET `/api/movies?q=action`.
6. Collect p50, p90, p95, p99.
7. Record error rate for all scenarios.

**Expected Result:**
- p95 response time < 2000ms for all three endpoints.
- Error rate < 1%.
- No container restarts or OOM kills during test run.

---

## TC-NFR-002 — API CRUD Response Time p95 < 500ms Under Load

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-002 |
| **Title** | API CRUD operations (review create/update/delete, rating submit) p95 latency < 500ms |
| **Requirement ID** | NFR-002 |
| **Priority** | P1 |
| **Test Type** | Performance (k6) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose test environment; database seeded; 50 pre-authenticated test user JWTs available.

**Test Steps:**
1. Run k6 scenario — Review Create: 50 VUs, each VU POSTs a review to a unique movie; 5-minute duration.
2. Collect p95 latency for POST `/api/movies/{id}/reviews`.
3. Run k6 scenario — Rating Upsert: 50 VUs, each VU POSTs a rating; 5-minute duration.
4. Collect p95 latency for POST `/api/movies/{id}/rating`.
5. Run k6 scenario — Review Delete: 50 VUs, each VU DELETEs own review.
6. Collect p95 latency.

**Expected Result:**
- p95 API response time < 500ms for all CRUD operations under 50 VU load.
- Error rate < 1%.

---

## TC-NFR-003 — TMDB API Calls Cached for Minimum 1 Hour

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-003 |
| **Title** | TMDB API calls cached in Redis for minimum 1 hour; second identical request uses cache |
| **Requirement ID** | NFR-003 |
| **Priority** | P1 |
| **Test Type** | Integration (Jest + Redis inspection) |
| **Status** | PLANNED |

**Preconditions:**
- Redis running; TMDB mock server configured with request counter.
- Cache is clear before test.

**Test Steps:**
1. Send GET `/api/movies?sort=popular` — first request; TMDB mock should be called once.
2. Verify Redis key `tmdb:popular:1` exists; inspect TTL (should be ~3600 seconds).
3. Send GET `/api/movies?sort=popular` again immediately — second request.
4. Verify TMDB mock was NOT called again (request counter still = 1).
5. Inspect Redis: verify key still exists with TTL > 3500 seconds.
6. Manually expire the key (`EXPIRE key 0`); send third request.
7. Verify TMDB mock is called again (request counter = 2).
8. Verify Redis key re-populated with TTL = 3600 seconds.

**Expected Result:**
- TMDB API called only on cache miss.
- Cache TTL is 3600 seconds (1 hour).
- Cache-aside pattern verified via mock call counter.

---

## TC-NFR-004 — 100 Concurrent Users Without > 20% Degradation; 10K User / 100K Review Volume

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-004 |
| **Title** | Application supports 100 concurrent users without > 20% response time degradation; handles 10K users / 100K reviews volume |
| **Requirement ID** | NFR-004, NFR-010 |
| **Priority** | P2 |
| **Test Type** | Performance (k6) |
| **Status** | PLANNED |

**Preconditions:**
- Standard test environment for degradation test.
- Volume-seeded DB (10,000 users, 100,000 reviews) for volume test.

**Test Steps (Degradation test):**
1. Run baseline k6 scenario: 1 VU, GET `/api/movies/{id}/reviews`, 2-minute duration. Record p95 baseline.
2. Run load k6 scenario: 100 VUs, same endpoint, 10-minute duration. Record p95 under load.
3. Calculate degradation: (p95_load - p95_baseline) / p95_baseline * 100%.
4. Verify degradation ≤ 20%.

**Test Steps (Volume test):**
1. Seed database with 10,000 users and 100,000 reviews (distributed across 500 movies, ~200 reviews/movie).
2. Run k6 scenario: 10 VUs, GET `/api/movies/{id}/reviews?page=1&limit=20` for high-review movies; 10-minute duration.
3. Verify p95 < 1000ms; error rate < 1%.

**Expected Result:**
- Response time degradation at 100 VU ≤ 20% of 1 VU baseline.
- Volume test: all queries complete within 1000ms p95.
- No schema changes required; indexes handle volume correctly.

---

## TC-NFR-005 — Auth Tokens in httpOnly Cookies Only; Not Accessible via JavaScript

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-005 |
| **Title** | Auth tokens stored only in httpOnly cookies; not accessible via JavaScript or any client storage |
| **Requirement ID** | NFR-020 |
| **Priority** | P0 |
| **Test Type** | Security (Manual + OWASP ZAP) |
| **Status** | PLANNED |

**Preconditions:**
- User authenticated; tokens issued in cookies.

**Test Steps:**
1. After authentication, open browser DevTools → Application → Cookies.
2. Verify `access_token` cookie has `HttpOnly` flag set (visible in DevTools but value not accessible via JS).
3. Verify `refresh_token` cookie has `HttpOnly` flag set.
4. Open browser DevTools → Console; execute `document.cookie`.
5. Verify neither `access_token` nor `refresh_token` appears in `document.cookie` output.
6. Open DevTools → Application → Local Storage and Session Storage.
7. Verify no token values stored in localStorage or sessionStorage.
8. Run OWASP ZAP passive scan; verify no cookie misconfiguration alerts for these cookies.
9. Inspect Set-Cookie response headers: verify `HttpOnly; Secure; SameSite=Strict` present.
10. Verify `csrf_token` cookie does NOT have HttpOnly (it must be readable by JS for CSRF header).

**Expected Result:**
- `access_token` and `refresh_token` have HttpOnly, Secure, SameSite=Strict flags.
- Neither token accessible via `document.cookie` or any JS-accessible storage.
- `csrf_token` is NOT HttpOnly (correctly accessible for CSRF header injection).

---

## TC-NFR-006 — All Protected Endpoints Return HTTP 401 Without Valid JWT

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-006 |
| **Title** | All state-changing API endpoints return 401 on missing or expired JWT |
| **Requirement ID** | NFR-021 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Application running; no auth cookies set.

**Test Steps:**
1. For each protected endpoint (see full list in TC-AUTH-005):
   a. Send request with NO cookies → verify HTTP 401.
   b. Send request with expired JWT in access_token cookie → verify HTTP 401.
   c. Send request with malformed/tampered JWT → verify HTTP 401.
2. Verify error response matches ErrorResponse schema with `statusCode: 401`.
3. Verify no state change occurred in database for any rejected request.

**Expected Result:**
- 100% of protected endpoints return 401 for missing/invalid/expired JWT.
- No partial state changes on rejected requests.

---

## TC-NFR-007 — Admin Endpoints Return HTTP 403 for Non-Admin Authenticated Users

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-007 |
| **Title** | Admin-only endpoints return HTTP 403 for authenticated non-admin users |
| **Requirement ID** | NFR-022 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Non-admin user "Bob" authenticated with valid JWT.
- Admin endpoints available.

**Test Steps:**
For each admin endpoint:
1. GET `/api/admin/reviews` → verify 403.
2. DELETE `/api/admin/reviews/{id}` → verify 403.
3. PATCH `/api/admin/reviews/{id}` → verify 403.
4. POST `/api/admin/movies` → verify 403.
5. POST `/api/admin/movies/{id}/sync` → verify 403.
6. DELETE `/api/admin/movies/{id}` → verify 403.
7. PATCH `/api/admin/users/{id}/role` → verify 403.
8. GET `/api/admin/users` → verify 403.
9. GET `/api/admin/audit-log` → verify 403.

**Expected Result:**
- Every admin endpoint returns 403 for a valid but non-admin JWT.
- Not 404 (endpoint exists but access denied).
- Not 401 (user IS authenticated — role check fails, not auth check).

---

## TC-NFR-008 — All DB Queries Use Parameterized Statements (Prisma ORM)

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-008 |
| **Title** | All database queries use parameterized statements; no raw SQL string concatenation |
| **Requirement ID** | NFR-023 |
| **Priority** | P0 |
| **Test Type** | Code Review / Static Analysis |
| **Status** | PLANNED |

**Preconditions:**
- Backend codebase available.

**Test Steps:**
1. Grep codebase for `$queryRaw` and `$executeRaw` Prisma methods; review all occurrences.
2. Verify any `$queryRaw` usage uses tagged template literals (`Prisma.sql\`...\``) — NOT string concatenation.
3. Verify no string template literals like `prisma.$queryRaw(\`SELECT * FROM movies WHERE title = '${userInput}'\`)`.
4. Grep for string concatenation patterns in query construction: `+` operators adjacent to SQL keywords.
5. Run ESLint with any SQL injection rule if configured.
6. As manual security test: send SQL injection payloads in review body, search query, movie title fields.
   - Payload example: `'; DROP TABLE reviews; --`
   - Verify API returns expected validation error (422) or empty results, NOT a DB error.
   - Verify `reviews` table still intact after injection attempt.

**Expected Result:**
- Zero raw string concatenation in DB queries.
- SQL injection payloads handled gracefully (rejected by ValidationPipe or returned as empty search results).
- Database integrity maintained after injection attempts.

---

## TC-NFR-009 — CSRF Protection on All State-Changing Operations

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-009 |
| **Title** | CSRF protection prevents state changes without valid CSRF token |
| **Requirement ID** | NFR-024 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User authenticated with valid `access_token`, `refresh_token`, `csrf_token` cookies.

**Test Steps:**
1. Send POST `/api/movies/{id}/reviews` WITH valid CSRF token in `X-CSRF-Token` header → verify HTTP 201.
2. Send POST `/api/movies/{id}/reviews` WITHOUT `X-CSRF-Token` header → verify HTTP 403.
3. Send POST `/api/movies/{id}/reviews` WITH wrong CSRF token value → verify HTTP 403.
4. Repeat for: PUT review, DELETE review, POST rating, DELETE rating, POST auth/logout, all /admin/* endpoints.
5. Verify GET endpoints (read-only) do NOT require CSRF token.

**Expected Result:**
- All POST/PUT/PATCH/DELETE endpoints require valid CSRF token.
- Missing or incorrect CSRF token returns 403.
- Read-only GET endpoints are not affected by CSRF check.

---

## TC-NFR-010 — Rate Limiting: Auth Endpoints Max 10 req/min/IP; Review Submission Max 20/hr/User

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-010 |
| **Title** | Rate limiting enforced: auth endpoints limited to 10 req/min/IP; reviews to 20/hr/user |
| **Requirement ID** | NFR-025 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Rate limiting middleware configured and active.
- Test environment allows manipulating Redis TTLs for rate limit windows.

**Test Steps (Auth rate limiting):**
1. Send 10 POST requests to `/api/auth/refresh` from the same IP within 60 seconds.
2. Verify requests 1–10 return appropriate responses (200 or 401).
3. Send 11th request; verify HTTP 429 Too Many Requests.
4. Verify response includes `Retry-After` header.
5. Wait for rate limit window to reset; verify next request succeeds.

**Test Steps (Review submission rate limiting):**
1. Authenticate as the same user; send 20 review-related POST requests within 1 hour.
2. Send 21st review POST; verify HTTP 429.
3. Verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers in all responses.

**Expected Result:**
- 11th auth request returns 429 with Retry-After header.
- 21st review submission returns 429.
- Rate limit headers present in all rate-limited endpoint responses.

---

## TC-NFR-011 — No Secrets Committed to Source Control

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-011 |
| **Title** | No secrets, API keys, or credentials committed to source control |
| **Requirement ID** | NFR-026, NFR-052 |
| **Priority** | P1 |
| **Test Type** | CI Static Analysis |
| **Status** | PLANNED |

**Preconditions:**
- Git repository with full commit history available.
- `trufflehog` or `git-secrets` installed in CI.

**Test Steps:**
1. Run `trufflehog git --only-verified .` against the repository.
2. Verify zero verified secrets found.
3. Check `.env.example` file: verify it contains only placeholder values (no real secrets).
4. Verify `.env` file is listed in `.gitignore` and NOT tracked by git.
5. Search codebase for hardcoded patterns: `GOOGLE_CLIENT_SECRET=`, `DATABASE_URL=postgres://`, `JWT_SECRET=`.
6. Verify all such patterns only appear in `.env.example` (placeholders) or documentation.
7. Verify CI pipeline includes secret scanning step that blocks merge on detection.

**Expected Result:**
- Zero secrets in source control.
- `.env` files gitignored.
- CI secret scanning passes with zero findings.

---

## TC-NFR-012 — HTTP Security Headers Applied

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-012 |
| **Title** | All required HTTP security headers present on all responses |
| **Requirement ID** | NFR-027 |
| **Priority** | P1 |
| **Test Type** | Integration + OWASP ZAP |
| **Status** | PLANNED |

**Preconditions:**
- Application running; Nginx configured as reverse proxy.

**Test Steps:**
1. Send GET `/` (home page); inspect response headers.
2. Verify `Content-Security-Policy` header present and non-empty.
3. Verify `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN` present.
4. Verify `X-Content-Type-Options: nosniff` present.
5. If TLS configured: verify `Strict-Transport-Security` header present with `max-age >= 31536000`.
6. Verify `X-XSS-Protection` header (if applicable; not required by WCAG but common).
7. Run OWASP ZAP passive scan; verify zero "missing security header" alerts at Medium or High severity.
8. Repeat header check for API endpoint: GET `/api/movies`.

**Expected Result:**
- All 4 required security headers present (CSP, X-Frame-Options, X-Content-Type-Options, HSTS where TLS).
- OWASP ZAP passive scan reports zero missing-header findings at Medium+ severity.

---

## TC-NFR-013 — OWASP Top 10 Baseline Security Review

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-013 |
| **Title** | Application passes OWASP Top 10 baseline automated security review |
| **Requirement ID** | NFR-028 |
| **Priority** | P2 |
| **Test Type** | Security (OWASP ZAP Active Scan) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose test environment running.
- OWASP ZAP Docker image available.
- Application URLs and API spec provided to ZAP.

**Test Steps:**
1. Run `docker run ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://app:3000 -r zap-report.html`.
2. Review HTML report for findings classified as HIGH or CRITICAL.
3. For each HIGH/CRITICAL finding: document in defect report; remediate before go-live.
4. Run `zap-api-scan.py` against `/api` using `api-spec.yaml` as context.
5. Verify zero HIGH/CRITICAL findings in API scan.
6. Run manual checks for OWASP Top 10 items not covered by automated scan:
   - A01 Broken Access Control: verify admin endpoints reject non-admin (TC-NFR-007).
   - A02 Cryptographic Failures: verify token storage (TC-NFR-005).
   - A03 Injection: SQL injection probes (TC-NFR-008).
   - A05 Security Misconfiguration: verify headers (TC-NFR-012).

**Expected Result:**
- Zero HIGH or CRITICAL findings in OWASP ZAP baseline and API scans.
- Zero MEDIUM findings related to auth/injection/access control.
- Full ZAP report archived in `/docs/test-reports/security/`.

---

## TC-NFR-014 — WCAG 2.1 Level AA Compliance on All Public-Facing Pages

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-014 |
| **Title** | All public-facing pages meet WCAG 2.1 Level AA compliance |
| **Requirement ID** | NFR-030 |
| **Priority** | P0 |
| **Test Type** | Accessibility (axe-core + Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Application running; all 9 wireframe screens implemented.
- `@axe-core/playwright` installed.

**Test Steps:**
For each of the 9 wireframe screens (/, /movies, /movies/{id}, /login, /users/{id}, /profile, /admin/moderation, /admin/movies, /admin/users):
1. Navigate to screen with Playwright.
2. Run `injectAxe()` + `checkA11y(null, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })`.
3. Collect violations by impact: critical, serious, moderate, minor.
4. Verify zero violations with impact = 'critical' or impact = 'serious'.

**Expected Result:**
- Zero critical or serious WCAG 2.1 AA violations on all 9 screens.
- Any moderate or minor violations documented for remediation in next sprint.
- axe-core report exported and archived.

---

## TC-NFR-015 — All Interactive Elements Keyboard-Navigable with ARIA Labels

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-015 |
| **Title** | All interactive elements are keyboard-navigable and have descriptive ARIA labels |
| **Requirement ID** | NFR-031 |
| **Priority** | P0 |
| **Test Type** | Accessibility (Manual + axe-core) |
| **Status** | PLANNED |

**Preconditions:**
- Application running; keyboard (no mouse) for manual test.

**Test Steps:**
1. Navigate to home page; Tab through all interactive elements.
2. Verify all buttons, links, form inputs, and star rating widgets are reachable via Tab.
3. Verify Tab order is logical (left-to-right, top-to-bottom).
4. Verify pressing Enter or Space on a focused button/link activates it.
5. Verify star rating widget: Tab to widget → arrow keys navigate between stars → Enter submits.
6. Inspect ARIA attributes: verify all interactive elements have `aria-label` or `aria-labelledby` with descriptive text.
7. Run axe-core; verify zero "interactive-element-not-focusable" violations.

**Expected Result:**
- All interactive elements reachable and operable via keyboard.
- ARIA labels present and descriptive on all interactive elements.
- Zero keyboard accessibility violations in axe-core.

---

## TC-NFR-016 — All Non-Decorative Images Have Meaningful Alt Text

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-016 |
| **Title** | All non-decorative images (movie posters, avatars) have meaningful alt text |
| **Requirement ID** | NFR-032 |
| **Priority** | P0 |
| **Test Type** | Accessibility (axe-core) |
| **Status** | PLANNED |

**Preconditions:**
- Movie detail page with poster and backdrop image loaded.
- User profile page with avatar loaded.

**Test Steps:**
1. Run axe-core on movie browse page; verify no "image-alt" violations.
2. Inspect movie card `img` elements: verify `alt` attribute is not empty and describes the movie (e.g., "Fight Club movie poster").
3. Run axe-core on movie detail page; verify no "image-alt" violations for poster, backdrop.
4. Run axe-core on user profile page; verify avatar `img` has `alt` = "[Display Name]'s profile picture" or equivalent.
5. For decorative images (if any): verify `alt=""` (empty string for decorative, not missing).

**Expected Result:**
- Zero missing or empty alt text violations on non-decorative images.
- Alt text is descriptive and meaningful.
- Decorative images (if any) have `alt=""`.

---

## TC-NFR-017 — Colour Contrast Ratio >= 4.5:1 (Normal Text), >= 3:1 (Large Text)

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-017 |
| **Title** | All text meets minimum colour contrast ratios per WCAG 2.1 AA |
| **Requirement ID** | NFR-033 |
| **Priority** | P1 |
| **Test Type** | Accessibility (axe-core) |
| **Status** | PLANNED |

**Preconditions:**
- All pages rendered with production colour scheme (design-system.md colours applied).

**Test Steps:**
1. Run axe-core on each of the 9 wireframe screens.
2. Inspect `color-contrast` rule violations.
3. Verify zero "color-contrast" violations at severity critical or serious.
4. For any moderate violations: measure contrast ratio manually using browser DevTools or Colour Contrast Analyser.
5. Verify normal text (< 18pt / < 14pt bold) has ≥ 4.5:1 contrast ratio.
6. Verify large text (≥ 18pt / ≥ 14pt bold) has ≥ 3:1 contrast ratio.
7. Check star rating icons (filled vs background) for contrast compliance.

**Expected Result:**
- Zero color-contrast violations at critical/serious severity.
- All text meets 4.5:1 (normal) or 3:1 (large) threshold.

---

## TC-NFR-018 — Focus Indicators Visible and Meet WCAG AA Contrast

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-018 |
| **Title** | Focus indicators visible on all interactive elements and meet WCAG AA contrast |
| **Requirement ID** | NFR-034 |
| **Priority** | P1 |
| **Test Type** | Accessibility (Manual + axe-core) |
| **Status** | PLANNED |

**Preconditions:**
- Application running; default browser focus styling not removed.

**Test Steps:**
1. Navigate to home page; Tab through all interactive elements.
2. Verify each focused element shows a visible focus indicator (outline ring, underline, or similar).
3. Verify focus indicator has at least 3:1 contrast ratio against adjacent background.
4. Verify no element has `outline: none` or `outline: 0` without replacement focus indicator.
5. Run axe-core; verify zero "focus-visible" violations.
6. Check modal dialogs and dropdown menus: verify focus trapped within modal when open.

**Expected Result:**
- All interactive elements show visible focus indicators on keyboard focus.
- Focus indicator contrast ≥ 3:1.
- No elements with `outline: none` without replacement.

---

## TC-NFR-019 — Application Availability: Container Health Checks Pass

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-019 |
| **Title** | Application containers are healthy and application is available after startup |
| **Requirement ID** | NFR-040 |
| **Priority** | P1 |
| **Test Type** | Integration (Docker health checks) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose production configuration.

**Test Steps:**
1. Run `docker compose up -d` (production configuration).
2. Run `docker compose ps`; verify all containers show status "healthy" within 60 seconds.
3. Send GET `http://localhost/` (via Nginx); verify HTTP 200.
4. Send GET `http://localhost/api/movies`; verify HTTP 200.
5. Stop and restart the backend container: `docker compose restart backend`.
6. Verify backend becomes healthy again within 30 seconds.
7. Verify GET `/api/movies` returns 200 after restart.
8. Verify no data loss after container restart (query previously inserted review; verify present).

**Expected Result:**
- All containers healthy within 60s of startup.
- Application accessible after restart.
- No data loss on container restart.

---

## TC-NFR-020 — Graceful TMDB Degradation: Browse/Read Available When TMDB Down

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-020 |
| **Title** | Application gracefully degrades when TMDB API unavailable; browse and read functions remain available |
| **Requirement ID** | NFR-041 |
| **Priority** | P1 |
| **Test Type** | Integration |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to always return HTTP 503.
- Stale cache entries pre-populated in Redis for browse and popular movies.

**Test Steps:**
1. Configure TMDB mock to return 503 for all endpoints.
2. Send GET `/api/movies`; verify HTTP 200 with stale cached data (not a 503).
3. Send GET `/api/movies/{id}` for a cached movie; verify HTTP 200.
4. Send GET `/api/movies/{id}/reviews`; verify HTTP 200 (reviews from DB, no TMDB dependency).
5. Verify no HTTP 500 responses from the API.
6. Clear Redis stale cache; send GET `/api/movies?sort=popular`; verify informative error response (not 500).
7. Log inspection: verify "TMDB API unavailable; serving stale" warning logged (where stale cache available).

**Expected Result:**
- With stale cache: 200 responses with cached data.
- Without cache: informative non-500 response.
- No unhandled exceptions.
- Browse and review reading remain functional.

---

## TC-NFR-021 — No Data Loss on Container Restart

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-021 |
| **Title** | All persistent data survives Docker container restart |
| **Requirement ID** | NFR-042 |
| **Priority** | P1 |
| **Test Type** | Integration (Docker) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose with named volume for PostgreSQL (`postgres_data`).

**Test Steps:**
1. Create test data: POST a review (reviewId recorded).
2. Run `docker compose restart postgres backend`; wait for both to be healthy.
3. Send GET `/api/movies/{movieId}/reviews`; verify previously created review is present.
4. Run `docker compose down` (without -v flag; preserves volumes).
5. Run `docker compose up -d`.
6. Verify review still retrievable after full compose down/up cycle.

**Expected Result:**
- Data persists across container restarts.
- Data persists across `docker compose down` and `up` cycles (with volumes preserved).
- No data loss in any restart scenario.

---

## TC-NFR-022 — Automated Daily PostgreSQL Backup

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-022 |
| **Title** | Automated daily PostgreSQL dump created and restorable |
| **Requirement ID** | NFR-043 |
| **Priority** | P2 |
| **Test Type** | Integration (bash + pg_restore) |
| **Status** | PLANNED |

**Preconditions:**
- Backup script exists (from devops-engineer runbook).
- Docker Compose running with PostgreSQL.

**Test Steps:**
1. Execute backup script manually: `./scripts/backup-db.sh`.
2. Verify dump file created in backup directory with timestamp in filename.
3. Verify dump file is non-empty (> 0 bytes).
4. Create a test DB container; restore dump: `pg_restore -d test_restore backup_file.dump`.
5. Verify restored DB contains all expected tables and data.
6. Verify automated cron job is configured (docker-compose service or host cron).

**Expected Result:**
- Backup script creates valid PostgreSQL dump.
- Dump is restorable to a new database.
- Automated scheduling configured.

---

## TC-NFR-023 — Unit Test Coverage >= 80% for Backend Business Logic

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-023 |
| **Title** | Jest unit test coverage >= 80% statements and branches for backend service files |
| **Requirement ID** | NFR-050 |
| **Priority** | P1 |
| **Test Type** | CI (Jest coverage) |
| **Status** | PLANNED |

**Preconditions:**
- Backend unit tests written (Phase 6 Build).
- Jest configured with coverage thresholds.

**Test Steps:**
1. Run `npm run test:unit -- --coverage` in backend directory.
2. Inspect coverage report: `coverage/lcov-report/index.html`.
3. Verify `Statements` coverage for `src/**/*.service.ts` files ≥ 80%.
4. Verify `Branches` coverage for `src/**/*.service.ts` files ≥ 80%.
5. Verify `src/**/*.guard.ts` files have ≥ 80% statement coverage.
6. Verify CI pipeline fails if thresholds not met (`jest --coverageThreshold` configured in jest.config.js).

**Expected Result:**
- Coverage report shows ≥ 80% statements and branches for service files.
- CI build fails automatically if coverage drops below threshold.

---

## TC-NFR-024 — Zero ESLint Errors Before Each CI Build

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-024 |
| **Title** | ESLint runs clean (zero errors) on every CI build |
| **Requirement ID** | NFR-051 |
| **Priority** | P1 |
| **Test Type** | CI (ESLint) |
| **Status** | PLANNED |

**Preconditions:**
- ESLint configured in both frontend and backend.

**Test Steps:**
1. Run `npm run lint` in backend directory; verify exit code 0 with zero errors.
2. Run `npm run lint` in frontend directory; verify exit code 0 with zero errors.
3. Verify CI step `eslint --max-warnings 0` fails the build on any ESLint warning.
4. Intentionally introduce an ESLint error (e.g., unused variable); verify CI fails on lint step.

**Expected Result:**
- Both frontend and backend lint clean.
- CI lint step blocks merge on any ESLint error or warning.

---

## TC-NFR-025 — Structured JSON Logs with Required Fields

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-025 |
| **Title** | Application logs are structured JSON with requestId, timestamp, log level, and message |
| **Requirement ID** | NFR-053 |
| **Priority** | P2 |
| **Test Type** | Integration |
| **Status** | PLANNED |

**Preconditions:**
- Application running with Pino logger configured.
- Log output captured (e.g., `docker compose logs backend`).

**Test Steps:**
1. Send GET `/api/movies` to generate a log entry.
2. Capture stdout from backend container.
3. Parse log output as JSON; verify valid JSON structure.
4. Verify each log entry contains: `level`, `time`, `requestId`, `message`.
5. Verify `requestId` in request log matches `requestId` in response log for the same request.
6. Send POST `/api/movies/{id}/reviews`; verify review creation log entry contains `reviewId`, `movieId`, `userId`.

**Expected Result:**
- All log output is valid JSON.
- Required fields (`level`, `time`, `requestId`, `message`) present in every log entry.
- `requestId` correlates across request lifecycle log entries.

---

## TC-NFR-026 — Minimum Personal Data Collected (GDPR)

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-026 |
| **Title** | Only minimum personal data collected; no extra PII beyond Google ID, name, email, avatar |
| **Requirement ID** | NFR-060 |
| **Priority** | P1 |
| **Test Type** | Code Review / Schema Inspection |
| **Status** | PLANNED |

**Preconditions:**
- ERD.md and Prisma schema available.
- Application running.

**Test Steps:**
1. Inspect `users` table schema (ERD.md Section 2.1): verify columns are ONLY: `id`, `google_id`, `email`, `display_name`, `avatar_url`, `is_admin`, `created_at`, `updated_at`, `deleted_at`.
2. Verify no additional PII columns (phone, address, date of birth, etc.) in schema.
3. After authentication, inspect Google OAuth callback handler: verify ONLY `sub`, `email`, `name`, `picture` fields extracted from Google profile.
4. Verify email is stored but NOT returned in public API responses (UserPublic schema excludes email).
5. Run GET `/api/users/{userId}` (public profile endpoint); verify response contains NO email field.

**Expected Result:**
- `users` table contains only the 9 specified columns.
- No extra PII stored.
- Email not exposed in public API.

---

## TC-NFR-027 — Privacy Notice Linked from Footer on All Pages

| Field | Value |
|-------|-------|
| **ID** | TC-NFR-027 |
| **Title** | Privacy notice link present in footer on all public-facing pages |
| **Requirement ID** | NFR-063 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Application running; all pages implemented.
- `/privacy` page exists with privacy notice content.

**Test Steps:**
1. Navigate to home page `/`; verify footer contains "Privacy Policy" link.
2. Click "Privacy Policy" link; verify navigation to `/privacy` page.
3. Verify `/privacy` page renders with readable content describing data collection and usage.
4. Navigate to `/movies`, `/movies/{id}`, `/login`, `/users/{id}` pages.
5. Verify footer with Privacy Policy link is present on each page.
6. Navigate to admin pages; verify footer present.

**Expected Result:**
- Privacy Policy link in footer on all pages.
- Link navigates to `/privacy` page with substantive content.
- TMDB attribution ("Powered by TMDB") also present in footer (TMDB API requirement).

---

*Produced by qa-engineer — 2026-05-23*
