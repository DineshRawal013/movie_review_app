# ADR-006 — Authentication Middleware Design (Google OAuth + JWT Refresh Token Flow)

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The SRS mandates:
- Authentication via Google OAuth 2.0 only (CON-002, FR-030).
- Sessions maintained via JWT access tokens (short-lived) and refresh tokens (longer-lived), both stored as httpOnly cookies (FR-032, NFR-020).
- Access tokens: never exposed in JavaScript-accessible storage (NFR-020).
- Silent refresh before session expiry (FR-035).
- Sign-out invalidates session and clears tokens (FR-033).
- Admin role check enforced on admin endpoints (NFR-022).
- All protected write endpoints require valid JWT (NFR-021, FR-034).
- CSRF protection on all state-changing operations (NFR-024).

The architectural question is how to implement these requirements with NestJS (ADR-002) and the selected technology stack.

---

## Decision

**Passport.js integration (via @nestjs/passport) using two strategies:**
1. `passport-google-oauth20` — handles the Google OAuth 2.0 authorization code flow.
2. `passport-jwt` (cookie extraction) — handles JWT validation on protected routes.

**Token storage:** Both access token and refresh token issued as `httpOnly; Secure; SameSite=Strict` cookies. Refresh token value stored hashed (SHA-256) in PostgreSQL `refresh_tokens` table. Revoked tokens tracked in Redis revocation set.

**Signing algorithm:** HS256 with a strong random secret (minimum 256-bit entropy). RS256 is the alternative but adds key pair management complexity unnecessary for a single-server deployment.

---

## Full Authentication Flow Design

### Phase 1 — Initial OAuth Login

```
Step 1: GET /api/auth/google
  - NestJS GoogleStrategy initiates OAuth flow
  - Redirect to: https://accounts.google.com/o/oauth2/v2/auth
    ?client_id=...
    &redirect_uri=https://<host>/api/auth/google/callback
    &response_type=code
    &scope=openid email profile
    &state=<csrf_state_nonce>   ← stored in session or signed cookie temporarily

Step 2: Google redirects to GET /api/auth/google/callback?code=...&state=...
  - Passport GoogleStrategy:
    a. Validates state nonce (CSRF protection for OAuth flow)
    b. POSTs code to Google token endpoint → receives { id_token, access_token }
    c. Decodes id_token → { sub (google_id), email, name, picture }
    d. Calls validateUser(profile) → upserts user in PostgreSQL
       - If new user: INSERT users (google_id, email, display_name, avatar_url, is_admin=false)
       - If returning: UPDATE display_name, avatar_url (in case Google profile changed)
    e. Returns user record to NestJS controller

Step 3: Controller issues application tokens
  a. Generate JWT access token:
     - Algorithm: HS256
     - Payload: { sub: userId, email, isAdmin, iat, exp }
     - Expiry: 15 minutes
     - Signed with JWT_ACCESS_SECRET (env var)

  b. Generate refresh token:
     - Value: 256-bit cryptographically random bytes (crypto.randomBytes(32).toString('hex'))
     - Hash: SHA-256 of the value
     - Store hash + userId + expires_at (now + 7 days) in PostgreSQL refresh_tokens table
     - Expiry: 7 days

  c. Issue CSRF token:
     - Value: cryptographically random 64-bit hex string
     - Stored as a non-httpOnly cookie (JS-readable, for double-submit pattern)

  d. Set cookies on response:
     Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
     Set-Cookie: refresh_token=<raw_value>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=604800
     Set-Cookie: csrf_token=<value>; Secure; SameSite=Strict; Path=/; Max-Age=604800

  e. 302 redirect to / (home page)
```

### Phase 2 — Authenticated Request

```
Every request to a protected endpoint:
  1. NestJS JwtAuthGuard (globally applied via APP_GUARD)
     - Extracts access_token from cookie
     - Verifies signature + expiry using JWT_ACCESS_SECRET
     - Attaches decoded payload to request.user: { userId, email, isAdmin }
     - On failure: 401 Unauthorized

  2. CsrfGuard (applied to POST/PUT/PATCH/DELETE)
     - Reads X-CSRF-Token header
     - Reads csrf_token cookie value
     - Validates they match (string comparison)
     - On failure: 403 Forbidden

  3. RolesGuard (applied to /api/admin/* routes)
     - Checks request.user.isAdmin === true
     - On failure: 403 Forbidden
```

### Phase 3 — Silent Token Refresh

```
POST /api/auth/refresh
  (Path-scoped cookie: refresh_token only sent to this endpoint)

  1. Extract refresh_token cookie value
  2. Compute SHA-256 hash of value
  3. Check Redis rt_revoked:{hash} — if exists: 401 (revoked token)
  4. SELECT from refresh_tokens WHERE token_hash = hash AND revoked_at IS NULL AND expires_at > NOW()
     - If not found or expired: 401
  5. Verify userId is still active (user not deleted)
  6. Generate new access token + new refresh token pair
  7. INSERT new refresh token record in PostgreSQL
  8. Mark old refresh token as revoked: UPDATE refresh_tokens SET revoked_at = NOW()
  9. Add old token hash to Redis rt_revoked set (TTL = remaining lifetime of old token)
  10. Set new cookies (access_token, refresh_token, csrf_token)
  11. Return 200 OK

Frontend strategy:
  - Intercept 401 responses from any /api/* call
  - Attempt POST /api/auth/refresh once
  - On success: retry original request
  - On failure: redirect to /auth/login with message
```

### Phase 4 — Sign-Out

```
DELETE /api/auth/session
  (Requires valid access token — JwtAuthGuard applies)

  1. Extract refresh_token cookie value
  2. Compute SHA-256 hash
  3. Find matching record in PostgreSQL refresh_tokens
  4. Mark as revoked in PostgreSQL: UPDATE SET revoked_at = NOW()
  5. Add to Redis rt_revoked set (TTL = remaining token lifetime)
  6. Clear cookies:
     Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
     Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=0
     Set-Cookie: csrf_token=; Secure; SameSite=Strict; Path=/; Max-Age=0
  7. Return 204 No Content
  8. Frontend redirects to home page as Guest
```

---

## Security Properties

| Requirement | Implementation |
|-------------|---------------|
| NFR-020: Tokens in httpOnly cookies only | access_token and refresh_token cookies set with HttpOnly flag; never returned in response body |
| NFR-020: SameSite=Strict | Prevents CSRF via cross-site requests; cookie only sent on same-site navigation |
| NFR-021: JWT validated on every protected request | JwtAuthGuard applied globally via APP_GUARD; @Public() decorator opts routes out |
| NFR-022: Admin role verified | RolesGuard applied to /api/admin/* via module-level guard registration |
| NFR-024: CSRF protection | Double-submit cookie: X-CSRF-Token header must match csrf_token cookie on state-changing requests |
| FR-032: Session maintenance | 15-min access token + 7-day refresh token; silent refresh on 401 |
| FR-033: Sign-out clears tokens | Cookies cleared + refresh token revoked in both PostgreSQL and Redis |
| FR-035: Silent refresh | Frontend axios/fetch interceptor retries original request after successful refresh |
| FR-036: Redirect on expiry | Frontend interceptor redirects to /auth/login if refresh also fails |

---

## Refresh Token Path Scoping

The `refresh_token` cookie uses `Path=/api/auth/refresh` — it is only sent to the token refresh endpoint, not to all API calls. This minimizes the token's exposure window and reduces the impact of any other endpoint vulnerability.

The `access_token` cookie uses `Path=/` — it is sent to all requests, enabling the JwtAuthGuard to function on all protected endpoints.

---

## Consequences

**Positive:**
- Zero raw tokens accessible from JavaScript (NFR-020 fully satisfied).
- Refresh token rotation (each use generates a new pair) limits replay attack window to the ~15-minute access token lifetime.
- Redis revocation set provides near-instant sign-out enforcement without database polling on every refresh.
- CSRF double-submit is simple, stateless, and does not require server-side session storage.
- Passport.js strategies are widely understood and have mature NestJS integration.

**Negative:**
- Refresh token path scoping (`Path=/api/auth/refresh`) means browsers only send the refresh cookie to that specific endpoint. Frontend code must explicitly call the refresh endpoint rather than relying on automatic cookie forwarding for other endpoints. This is by design but requires clear frontend implementation.
- HS256 means the same secret signs and verifies tokens. If the secret is compromised, all tokens are invalidated. Mitigated by using a strong (256-bit) random secret stored only in the backend environment.
- If Redis is unavailable during sign-out, the revocation set entry is not written. The refresh token still gets revoked in PostgreSQL (step 4 above), so the security impact is minimal — the PostgreSQL check provides the fallback.

**Neutral:**
- The `state` parameter in the OAuth flow uses a short-lived value stored in a signed cookie or in-memory for the duration of the OAuth handshake. Since the application is single-instance, in-memory is acceptable. If multiple backend instances are added later, this must move to Redis.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| JWT in localStorage | Simple frontend implementation | Violates NFR-020 (JS-accessible); XSS vulnerability exposes tokens | Non-starter; direct NFR violation |
| Server-side sessions (express-session + connect-pg-simple) | No token management complexity; revocation is trivial | Stateful server; violates NFR-011 (stateless API); requires session store lookup on every request; does not compose well with REST | NFR-011 violation; architectural mismatch with stateless REST API |
| RS256 (asymmetric JWT) | Private key never needs to leave backend; public key can be shared for verification | Key pair management complexity; no material security benefit for single-server deployment where verification only occurs on the backend | Unnecessary complexity for single-server home deployment |
| Session-only cookies (no JWT) | Simpler mental model | Not stateless; same concerns as server-side sessions above | Same rejection reasons as server-side sessions |
| Next-Auth / Auth.js (library) | Handles much of the OAuth plumbing automatically | Opinionated; couples frontend and backend auth to Next.js; makes the NestJS backend dependent on the frontend framework for auth logic; less control over token handling and cookie parameters | Auth logic belongs in the NestJS backend, not in the Next.js frontend; separation of concerns principle |

---

*Produced by solution-architect — 2026-05-23*
