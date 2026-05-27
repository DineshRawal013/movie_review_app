# Test Cases — Authentication Module (TC-AUTH)

**Module:** AuthModule, UsersModule
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036, FR-037, FR-060, FR-061, FR-062, FR-063

---

## TC-AUTH-001 — Google OAuth Sign-In Button Initiates OAuth Flow

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-001 |
| **Title** | Google OAuth sign-in button initiates Google OAuth 2.0 authorization flow |
| **Requirement ID** | FR-030 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Application is running (Docker Compose).
- User is unauthenticated (Guest).
- User is on the Sign-In page (/login) or any page with the header "Sign in with Google" button.

**Test Steps:**
1. Navigate to `/login`.
2. Verify "Sign in with Google" button is present and visible.
3. Click "Sign in with Google" button.
4. Verify browser redirects to Google OAuth authorization URL (contains `accounts.google.com/o/oauth2/`).
5. Verify the redirect URL includes expected OAuth parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope`.

**Expected Result:**
- "Sign in with Google" button is visible and keyboard-focusable.
- Clicking the button initiates a redirect to Google OAuth 2.0 authorization endpoint.
- OAuth parameters in the URL are correct and match configured client credentials.
- No JavaScript errors in browser console.

---

## TC-AUTH-002 — Successful OAuth Callback Creates/Retrieves User and Issues Tokens

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-002 |
| **Title** | Successful Google OAuth callback creates new user or retrieves existing user; issues JWT and refresh token |
| **Requirement ID** | FR-031 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Application is running.
- Mock OAuth server configured to return a valid Google profile (`sub`, `email`, `name`, `picture`).
- No user with the test Google ID exists in the database (first-login scenario).

**Test Steps (new user — Integration):**
1. Simulate OAuth callback: GET `/api/auth/google/callback?code=mock-auth-code&state=valid-state`.
2. Verify HTTP response is 302 redirect to the frontend home page.
3. Verify `Set-Cookie` headers contain `access_token` (HttpOnly, Secure, SameSite=Strict, Max-Age=900).
4. Verify `Set-Cookie` headers contain `refresh_token` (HttpOnly, Secure, SameSite=Strict, Max-Age=604800).
5. Verify `Set-Cookie` headers contain `csrf_token` (NOT HttpOnly, Secure, SameSite=Strict).
6. Query database: verify a new `users` row exists with correct `google_id`, `email`, `display_name`, `avatar_url`.
7. Query database: verify a `refresh_tokens` row exists for the new user with valid `expires_at`.

**Test Steps (returning user — Integration):**
1. User record pre-exists in database.
2. Simulate OAuth callback with same Google profile.
3. Verify no duplicate user row created (still one row for the Google ID).
4. Verify new tokens are issued (new `refresh_tokens` row).

**Expected Result:**
- New user: account created with correct Google profile data; tokens issued in httpOnly cookies.
- Returning user: existing account retrieved; tokens refreshed; no duplicate account.
- Database state is consistent.

---

## TC-AUTH-003 — JWT Access Token (15m) and Refresh Token (7d) in httpOnly Cookies

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-003 |
| **Title** | Sessions maintained via JWT (15m) and refresh token (7d) stored in httpOnly cookies |
| **Requirement ID** | FR-032, NFR-020 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + Security |
| **Status** | PLANNED |

**Preconditions:**
- User successfully authenticated (TC-AUTH-002 precondition met).
- Tokens issued in cookies.

**Test Steps:**
1. After authentication, inspect Set-Cookie response headers.
2. Verify `access_token` cookie: HttpOnly=true, Secure=true, SameSite=Strict, Max-Age=900 (15 min).
3. Verify `refresh_token` cookie: HttpOnly=true, Secure=true, SameSite=Strict, Max-Age=604800 (7 days).
4. Verify `csrf_token` cookie: HttpOnly=false (readable by JS for X-CSRF-Token header), Secure=true, SameSite=Strict.
5. Attempt to read `access_token` cookie value from browser JavaScript (`document.cookie`); verify it is NOT present (httpOnly).
6. Verify JWT payload (decode without verification): contains `sub` (userId), `email`, `isAdmin`, `iat`, `exp` (exp = iat + 900).
7. Decode JWT header: verify algorithm is HS256.

**Expected Result:**
- `access_token` and `refresh_token` are NOT accessible via `document.cookie` in browser JavaScript.
- Cookie attributes (HttpOnly, Secure, SameSite) are correctly set as specified.
- JWT payload contains expected claims; expiry is 15 minutes from issuance.
- No token values appear in response body or URL.

---

## TC-AUTH-004 — Sign Out Invalidates Session and Clears Tokens

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-004 |
| **Title** | "Sign out" action invalidates session and clears all auth cookies |
| **Requirement ID** | FR-033 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- User is authenticated; valid `access_token`, `refresh_token`, `csrf_token` cookies exist.
- `refresh_tokens` row exists in database.

**Test Steps:**
1. Send POST `/api/auth/logout` with valid cookies and correct `X-CSRF-Token` header.
2. Verify HTTP 200 response.
3. Verify `Set-Cookie` response headers clear all three cookies (`access_token`, `refresh_token`, `csrf_token` set to empty string with Max-Age=0 or expired).
4. Query database: verify `refresh_tokens` row for the token is deleted (or `revoked_at` set).
5. Attempt to use the old `access_token` to call a protected endpoint (e.g., GET `/api/users/me`).
6. Verify HTTP 401 response.
7. Attempt to use the old `refresh_token` to call POST `/api/auth/refresh`.
8. Verify HTTP 401 response (token revoked).

**Expected Result:**
- All cookies cleared after logout.
- Database refresh token record deleted/revoked.
- Old tokens are rejected (401) after logout.
- User is in Guest state (no authenticated session).

---

## TC-AUTH-005 — Unauthenticated Requests to Write Endpoints Return HTTP 401

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-005 |
| **Title** | All write endpoints return HTTP 401 for unauthenticated requests |
| **Requirement ID** | FR-034 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Application running.
- No auth cookies set in request.

**Test Steps:**
For each of the following endpoints, send request WITHOUT any auth cookies:
1. POST `/api/movies/{id}/reviews` — create review.
2. PUT `/api/movies/{id}/reviews/{reviewId}` — edit review.
3. DELETE `/api/movies/{id}/reviews/{reviewId}` — delete review.
4. POST `/api/movies/{id}/rating` — submit rating.
5. DELETE `/api/movies/{id}/rating` — delete rating.
6. DELETE `/api/users/me` — delete account.
7. GET `/api/admin/reviews` — admin moderation queue.
8. DELETE `/api/admin/reviews/{reviewId}` — admin delete review.
9. POST `/api/admin/movies` — admin add movie.
10. PATCH `/api/admin/users/{userId}/role` — admin update user role.

**Expected Result:**
- Every endpoint listed returns HTTP 401 Unauthorized.
- Response body matches ErrorResponse schema: `{ statusCode: 401, message: "Unauthorized" }`.
- No state change occurs in the database for any request.

---

## TC-AUTH-006 — Silent Access Token Refresh Before Expiry

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-006 |
| **Title** | Access token silently refreshed using refresh token; new token pair issued |
| **Requirement ID** | FR-035 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User is authenticated with a valid refresh token (not expired).
- Access token is expired (issue a JWT with past `exp` for testing).

**Test Steps:**
1. Send POST `/api/auth/refresh` with valid `refresh_token` cookie and correct CSRF token.
2. Verify HTTP 200 response.
3. Verify `Set-Cookie` response headers issue new `access_token` cookie (new expiry = now + 900s).
4. Verify new `refresh_token` cookie is issued (token rotation).
5. Verify old `refresh_token` hash is deleted from `refresh_tokens` table (rotation).
6. Verify new `refresh_tokens` row exists in database with new hash and 7-day expiry.
7. Use new `access_token` to call GET `/api/users/me`; verify HTTP 200.

**Expected Result:**
- Refresh endpoint returns 200 with new token pair in cookies.
- Old refresh token is invalidated (rotation).
- New access token is valid and accepted by protected endpoints.
- No re-login required by user (seamless experience).

---

## TC-AUTH-007 — Expired Refresh Token Redirects to Sign-In

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-007 |
| **Title** | Expired or revoked refresh token redirects user to sign-in page with appropriate message |
| **Requirement ID** | FR-036 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- User has an expired refresh token (set `expires_at` to past timestamp in test DB).
- OR user has a revoked refresh token (`revoked_at` set).

**Test Steps (expired token):**
1. Send POST `/api/auth/refresh` with an expired `refresh_token` cookie.
2. Verify HTTP 401 response with message indicating session expired.
3. Verify cookies are cleared in response.

**Test Steps (revoked token):**
1. Send POST `/api/auth/refresh` with a revoked `refresh_token` cookie.
2. Verify HTTP 401 response.
3. Verify cookies are cleared.

**Test Steps (E2E — session expiry flow):**
1. User is authenticated; force access token to expire (manipulate test clock or use short-lived test token).
2. Frontend silently calls refresh endpoint; receives 401.
3. Verify frontend redirects user to `/login?error=session_expired` (or equivalent).
4. Verify sign-in page displays an appropriate "Your session has expired, please sign in again" message.

**Expected Result:**
- Expired/revoked refresh token returns 401.
- Cookies cleared after failed refresh.
- User is redirected to sign-in page with informative message.
- No infinite refresh loop occurs.

---

## TC-AUTH-008 — Display Name and Avatar Stored from Google Profile on First Login

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-008 |
| **Title** | User display name and avatar URL stored from Google profile on first OAuth login |
| **Requirement ID** | FR-037 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Mock OAuth server returns a Google profile with: `sub="google-123"`, `email="test@example.com"`, `name="Test User"`, `picture="https://example.com/avatar.jpg"`.
- No user with this Google ID exists in database.

**Test Steps:**
1. Simulate OAuth callback with mock profile.
2. Query database: `SELECT display_name, avatar_url FROM users WHERE google_id = 'google-123'`.
3. Verify `display_name = "Test User"`.
4. Verify `avatar_url = "https://example.com/avatar.jpg"`.
5. Send GET `/api/users/me` with issued token; verify response includes `displayName` and `avatarUrl` matching Google profile.

**Expected Result:**
- `display_name` and `avatar_url` in database match Google profile data exactly.
- GET /users/me response includes correct display name and avatar URL.
- Email is stored but NOT returned in public-facing UserPublic schema.

---

## TC-AUTH-009 — User Profile Page Accessible at /profile and /users/{userId}

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-009 |
| **Title** | User profile page accessible at /profile (own) and /users/{userId} (public) |
| **Requirement ID** | FR-060 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" exists in database with known userId.
- At least one review submitted by Alice.

**Test Steps:**
1. Send GET `/api/users/{aliceUserId}` without authentication.
2. Verify HTTP 200 response with UserPublic schema fields.
3. Send GET `/api/users/me` with Alice's authentication.
4. Verify HTTP 200 response with UserMe schema (includes email, isAdmin).
5. Send GET `/api/users/me` without authentication.
6. Verify HTTP 401.
7. E2E: navigate to `/users/{aliceUserId}` as guest; verify page loads with correct data.
8. E2E: navigate to `/profile` as Alice; verify redirect to own profile page.

**Expected Result:**
- Public profile endpoint returns correct data for any authenticated or unauthenticated request.
- `/users/me` requires authentication (401 without auth).
- Profile page renders correctly in browser.

---

## TC-AUTH-010 — Profile Page Displays Name, Avatar, Member-Since, Reviews List

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-010 |
| **Title** | Profile page displays display name, avatar, member-since date, and list of reviews with movie links |
| **Requirement ID** | FR-061 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) + Integration |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" exists with `display_name="Alice Test"`, `avatar_url` set, `created_at` known.
- Alice has 3 reviews for different movies.

**Test Steps:**
1. Send GET `/api/users/{aliceUserId}` (Integration).
2. Verify response contains: `displayName`, `avatarUrl`, `createdAt`, `reviews` array.
3. Verify `reviews` array contains Alice's 3 reviews, each with a `movieId` field.
4. E2E: navigate to `/users/{aliceUserId}`.
5. Verify page displays Alice's display name.
6. Verify page displays Alice's avatar image with non-empty alt text.
7. Verify "Member since" date displayed and matches `created_at`.
8. Verify 3 review cards displayed, each with a link to the respective movie detail page.

**Expected Result:**
- Profile page displays all required fields per FR-061.
- Review list is accurate and links are functional.
- Avatar image has descriptive alt text (e.g., "Alice Test's profile picture").

---

## TC-AUTH-011 — "Delete My Account" Permanently Deletes All User Data (GDPR)

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-011 |
| **Title** | Authenticated user can delete own account; all associated data permanently removed |
| **Requirement ID** | FR-062, NFR-061 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" (userId known) has: 2 reviews, 3 ratings, 1 active refresh token, 1 review flag.
- Alice is authenticated with a valid access token.

**Test Steps:**
1. Record current state: note Alice's userId, review IDs, rating IDs, refresh_token hash.
2. Send DELETE `/api/users/me` with Alice's authentication and correct CSRF token.
3. Verify HTTP 200 response.
4. Verify response clears all cookies (`access_token`, `refresh_token`, `csrf_token`).
5. Query `users`: verify `deleted_at` is set for Alice's row (soft delete).
6. Query `reviews`: verify Alice's review rows are hard-deleted (zero rows with Alice's userId).
7. Query `ratings`: verify Alice's rating rows are hard-deleted (zero rows with Alice's userId).
8. Query `refresh_tokens`: verify all rows for Alice's userId are deleted.
9. Query `review_flags`: verify Alice's flag rows are deleted.
10. Attempt GET `/api/auth/google/callback` with Alice's Google ID (simulating re-login).
11. Verify new account creation is allowed (deleted_at does NOT prevent re-registration).
12. Attempt GET `/api/users/me` with Alice's old access token; verify HTTP 401.

**Expected Result:**
- All associated data hard-deleted.
- User row soft-deleted (deleted_at set).
- All tokens invalidated immediately.
- GDPR erasure complete.

---

## TC-AUTH-012 — "Export My Data" Returns JSON of All Personal Data

| Field | Value |
|-------|-------|
| **ID** | TC-AUTH-012 |
| **Title** | Authenticated user can export all personal data as a JSON file |
| **Requirement ID** | FR-063, NFR-062 |
| **Priority** | P2 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" exists with 2 reviews and 3 ratings.
- Alice is authenticated.

**Test Steps:**
1. Send GET `/api/users/me/export` with Alice's authentication.
2. Verify HTTP 200 response.
3. Verify `Content-Type: application/json` or `application/octet-stream` with JSON body.
4. Verify response JSON contains: `profile` object (displayName, email, avatarUrl, createdAt).
5. Verify response JSON contains: `reviews` array with Alice's 2 reviews.
6. Verify response JSON contains: `ratings` array with Alice's 3 ratings.
7. Verify no other users' data appears in the export.
8. Send GET `/api/users/me/export` without authentication; verify HTTP 401.

**Expected Result:**
- Export returns valid JSON containing all and only Alice's personal data.
- No other users' data included.
- Unauthenticated export attempt returns 401.

---

*Produced by qa-engineer — 2026-05-23*
