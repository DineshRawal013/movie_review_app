# API Reference — Movie Review Application

**Document ID:** API-REF-1.0
**Owner:** technical-writer
**Status:** COMPLETE
**Version:** 1.0
**Date:** 2026-05-26
**Application Version:** v1.0.0
**Source:** Generated from `/docs/api-spec.yaml` (OpenAPI 3.1.0)
**Produced by:** technical-writer (Phase 9 — Handover)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Base URL and Versioning](#2-base-url-and-versioning)
3. [Authentication](#3-authentication)
4. [CSRF Protection](#4-csrf-protection)
5. [Rate Limiting](#5-rate-limiting)
6. [Pagination](#6-pagination)
7. [Error Responses](#7-error-responses)
8. [Data Schemas](#8-data-schemas)
9. [Endpoints](#9-endpoints)
   - 9.1 [Health](#91-health)
   - 9.2 [Authentication](#92-authentication)
   - 9.3 [Movies](#93-movies)
   - 9.4 [Reviews](#94-reviews)
   - 9.5 [Ratings](#95-ratings)
   - 9.6 [Users](#96-users)
   - 9.7 [Admin](#97-admin)
10. [HTTP Status Code Reference](#10-http-status-code-reference)

---

## 1. Overview

The Movie Review Application exposes a RESTful JSON API built on NestJS 10. All endpoints are served under the `/api` path prefix, proxied through Nginx.

Key characteristics:

- All request and response bodies are JSON with `Content-Type: application/json`.
- Authentication is cookie-based (httpOnly JWT). Tokens are never returned in response bodies.
- State-changing requests (POST, PUT, PATCH, DELETE) require a CSRF token header.
- List endpoints return a standard paginated envelope.
- All times are ISO 8601 UTC strings (e.g., `"2026-05-26T10:00:00Z"`).
- UUIDs use the standard `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` format.

---

## 2. Base URL and Versioning

```
Base URL: /api
```

The API is served at the same origin as the frontend, accessible at `/api/*`. There is no version prefix in v1.0.

When deployed with the standard Docker Compose stack, the URL is:

```
http://<host>/api        (HTTP — development)
https://<host>/api       (HTTPS — production with TLS)
```

---

## 3. Authentication

**Mechanism:** JWT access token delivered as an httpOnly cookie.

The application uses Google OAuth 2.0 for user authentication. After a successful OAuth flow, the backend sets three cookies:

| Cookie | Flags | Lifetime | Purpose |
|--------|-------|----------|---------|
| `access_token` | httpOnly, Secure, SameSite=Strict | 15 minutes | JWT access token — validated on every protected request |
| `refresh_token` | httpOnly, Secure, SameSite=Strict | 7 days | Rotating refresh token — used to renew the access token |
| `csrf_token` | Secure, SameSite=Strict (NOT httpOnly) | 7 days | CSRF token — readable by JavaScript for inclusion in request headers |

The browser attaches the `access_token` cookie automatically on all same-origin requests. You do not need to manage tokens manually when using the application through a browser.

**Automated clients / API consumers:** Because cookies are httpOnly, server-side automation must maintain the cookie jar across requests. The recommended approach is to use a cookie-aware HTTP client (e.g., `axios` with `withCredentials: true`, or `curl --cookie-jar`).

**401 handling:** When a protected endpoint returns HTTP 401, your client should POST to `/api/auth/refresh` to obtain a new access token (the refresh token cookie is sent automatically), then retry the original request. If `/api/auth/refresh` also returns 401, the session has expired — the user must sign in again.

---

## 4. CSRF Protection

All state-changing requests (POST, PUT, PATCH, DELETE) must include the `X-CSRF-Token` header.

The value is read from the `csrf_token` cookie, which is NOT httpOnly and is therefore readable by JavaScript:

```javascript
// Browser-side example
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/movies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ tmdbId: 550 }),
  credentials: 'include',
});
```

A mismatch or missing `X-CSRF-Token` returns HTTP 403.

---

## 5. Rate Limiting

Rate limit headers are returned on all responses:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Total request limit for the current window |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

When a limit is exceeded, the API returns HTTP 429 with a `Retry-After` header.

**Per-endpoint limits:**

| Endpoint(s) | Limit | Window | Identifier |
|-------------|-------|--------|-----------|
| `GET /api/auth/google`, `POST /api/auth/refresh` | 10 requests | 60 seconds | IP address |
| `POST /api/movies/{id}/reviews`, `PUT /api/reviews/{id}` | 20 requests | 1 hour | Authenticated user ID |
| `GET /api/users/me/export` | 1 request | 1 hour | Authenticated user ID |
| All other endpoints | 200 requests | 60 seconds | IP address |

---

## 6. Pagination

All list endpoints return a standard paginated envelope:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Query parameters** (accepted by all list endpoints):

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | >= 1 | Page number (1-based) |
| `limit` | integer | 20 | 1–100 | Items per page |

---

## 7. Error Responses

All errors use a consistent envelope:

```json
{
  "statusCode": 422,
  "message": ["body must not be empty", "body must be shorter than or equal to 500 characters"],
  "error": "Unprocessable Entity",
  "requestId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
}
```

The `message` field is either a single string or an array of validation error strings. The `requestId` field (UUID) is present on 4xx/5xx responses and correlates with server log entries for debugging.

---

## 8. Data Schemas

### UserPublic

Public-facing user profile. No PII beyond display name and avatar.

```json
{
  "id": "uuid",
  "displayName": "Dinesh Rawal",
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",
  "createdAt": "2026-05-23T10:00:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Internal user identifier |
| `displayName` | string | From Google profile |
| `avatarUrl` | URI string or null | Google profile photo URL |
| `createdAt` | ISO 8601 datetime | Account creation timestamp |

### UserMe

Extends `UserPublic` with private fields visible only to the authenticated user.

```json
{
  "id": "uuid",
  "displayName": "Dinesh Rawal",
  "avatarUrl": "https://lh3.googleusercontent.com/a/...",
  "createdAt": "2026-05-23T10:00:00Z",
  "email": "rawaldinesh13@dsu.ac.kr",
  "isAdmin": false
}
```

Additional fields:

| Field | Type | Notes |
|-------|------|-------|
| `email` | email string | Google email — not displayed publicly |
| `isAdmin` | boolean | Whether the user has admin privileges |

### MovieCard

Compact movie representation used in list and search views.

```json
{
  "id": "uuid",
  "tmdbId": 550,
  "title": "Fight Club",
  "posterUrl": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "releaseDate": "1999-10-15",
  "releaseYear": 1999,
  "avgRating": 4.3,
  "ratingCount": 247,
  "genres": [
    { "id": 18, "name": "Drama", "tmdbGenreId": 18 }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Internal movie identifier |
| `tmdbId` | integer | TMDB movie identifier |
| `title` | string | Movie title |
| `posterUrl` | URI string or null | Full URL to poster image (TMDB CDN) |
| `releaseDate` | date string or null | ISO 8601 date |
| `releaseYear` | integer or null | Convenience field extracted from `releaseDate` |
| `avgRating` | float 0–5 | Community average; 0 if no ratings |
| `ratingCount` | integer >= 0 | Total community ratings |
| `genres` | array of Genre | May be empty |

### MovieDetail

Full movie detail. Extends `MovieCard` with additional TMDB metadata.

```json
{
  "id": "uuid",
  "tmdbId": 550,
  "title": "Fight Club",
  "posterUrl": "https://image.tmdb.org/t/p/w500/...",
  "releaseDate": "1999-10-15",
  "releaseYear": 1999,
  "avgRating": 4.3,
  "ratingCount": 247,
  "genres": [ ... ],
  "backdropUrl": "https://image.tmdb.org/t/p/original/...",
  "overview": "An insomniac office worker and a devil-may-care soap maker...",
  "runtime": 139,
  "originalLanguage": "en",
  "trailerUrl": "https://www.youtube.com/watch?v=SUXWAEX2jlg",
  "director": "David Fincher",
  "cast": [
    {
      "name": "Brad Pitt",
      "character": "Tyler Durden",
      "profilePath": "/cckcYc2v0yh1tc9QjRelptcOBko.jpg"
    }
  ],
  "editorialNote": null,
  "cachedAt": "2026-05-26T08:00:00Z"
}
```

Additional fields beyond `MovieCard`:

| Field | Type | Notes |
|-------|------|-------|
| `backdropUrl` | URI string or null | Backdrop image URL |
| `overview` | string or null | Movie synopsis |
| `runtime` | integer or null | Duration in minutes |
| `originalLanguage` | string or null | ISO 639-1 code (e.g., "en") |
| `trailerUrl` | URI string or null | YouTube trailer link if available |
| `director` | string or null | Director's full name |
| `cast` | array of CastMember (max 10) | Top-billed cast |
| `editorialNote` | string or null | Admin-set editorial note |
| `cachedAt` | ISO 8601 datetime | When TMDB metadata was last refreshed |

### CastMember

```json
{
  "name": "Brad Pitt",
  "character": "Tyler Durden",
  "profilePath": "/cckcYc2v0yh1tc9QjRelptcOBko.jpg"
}
```

`profilePath` is a TMDB image path. To construct the full URL, prepend `https://image.tmdb.org/t/p/w185`. May be null.

### Review

```json
{
  "id": "uuid",
  "user": { "id": "uuid", "displayName": "Dinesh Rawal", "avatarUrl": "...", "createdAt": "..." },
  "movieId": "uuid",
  "body": "A brutal, poetic film that stays with you long after the credits roll.",
  "isHidden": false,
  "flagCount": 0,
  "isEdited": false,
  "createdAt": "2026-05-23T12:00:00Z",
  "updatedAt": "2026-05-23T12:00:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Internal review identifier |
| `user` | UserPublic | Author's public profile |
| `movieId` | UUID string | Internal movie identifier |
| `body` | string (max 500 chars) | Review text |
| `isHidden` | boolean | If true, review is admin-hidden; only visible to admins |
| `flagCount` | integer >= 0 | Number of flags from registered users |
| `isEdited` | boolean | True if `updatedAt` > `createdAt` |
| `createdAt` | ISO 8601 datetime | Original submission time |
| `updatedAt` | ISO 8601 datetime | Last edit time |

### Rating

```json
{
  "id": "uuid",
  "userId": "uuid",
  "movieId": "uuid",
  "value": 5,
  "createdAt": "2026-05-23T12:00:00Z",
  "updatedAt": "2026-05-23T12:00:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Internal rating identifier |
| `userId` | UUID string | User who submitted the rating |
| `movieId` | UUID string | Movie being rated |
| `value` | integer 1–5 | Star rating |
| `createdAt` | ISO 8601 datetime | When rating was first submitted |
| `updatedAt` | ISO 8601 datetime | When rating was last updated |

### AuditLogEntry

```json
{
  "id": "uuid",
  "adminUserId": "uuid",
  "actionType": "REVIEW_HIDDEN",
  "targetReviewId": "uuid",
  "targetMovieId": null,
  "targetUserId": null,
  "metadata": { "reason": "Violates community guidelines" },
  "createdAt": "2026-05-26T10:00:00Z"
}
```

`actionType` enum values: `REVIEW_DELETED`, `REVIEW_HIDDEN`, `REVIEW_RESTORED`, `MOVIE_ADDED`, `MOVIE_UPDATED`, `MOVIE_DELETED`, `MOVIE_SYNCED`, `USER_PROMOTED`, `USER_DEMOTED`.

---

## 9. Endpoints

### 9.1 Health

#### GET /api/health

Returns a status object confirming the API is running. Used by Docker health checks and Nginx upstream monitoring.

**Auth required:** No

**Response 200:**

```json
{
  "status": "ok",
  "timestamp": "2026-05-26T10:00:00Z"
}
```

---

### 9.2 Authentication

#### GET /api/auth/google

Initiates the Google OAuth 2.0 authorization flow. Redirects the browser to Google's authorization endpoint.

**Auth required:** No

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redirect` | string | No | URL to redirect to after successful login (validated against allowed origins) |

**Response:** HTTP 302 — Location header points to `https://accounts.google.com/o/oauth2/v2/auth?...`

**Rate limit:** 10 requests/minute/IP

---

#### GET /api/auth/google/callback

Google redirects here after user consent. The backend exchanges the authorization code, upserts the user in the database, issues JWT + refresh token cookies, and redirects to the frontend.

**Auth required:** No (this is the OAuth return endpoint)

**Query parameters (set by Google — do not set manually):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from Google |
| `state` | string | Yes | CSRF state token from the initiation request |
| `error` | string | No | Present if user denied consent |

**Response (success):** HTTP 302 — Location: `/`

Sets three cookies:

```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Set-Cookie: csrf_token=<value>; Secure; SameSite=Strict; Max-Age=604800
```

**Response (error — user denied or invalid state):** HTTP 302 — Location: `/login?error=oauth_failed`

---

#### POST /api/auth/refresh

Silently refreshes the JWT access token using the httpOnly refresh token cookie. On success, issues a new access token and a rotated refresh token.

**Auth required:** No (refresh token cookie used instead)

**Request body:** None

**Response 200:**

```json
{
  "message": "Token refreshed"
}
```

Sets updated `access_token` and `refresh_token` cookies.

**Response 401:** Refresh token missing, expired, or revoked — user must sign in again.

**Rate limit:** 10 requests/minute/IP

---

#### POST /api/auth/logout

Revokes the current refresh token and clears all auth cookies. Idempotent — returns 200 even if no valid session exists.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Request body:** None

**Response 200:**

```json
{
  "message": "Signed out successfully"
}
```

Sets all auth cookies to `Max-Age=0` (clears them from the browser).

---

### 9.3 Movies

#### GET /api/movies

Returns a paginated list of movies. Supports search, genre filter, year range filter, and sort.

**Auth required:** No

**Query parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string (max 200 chars) | No | — | Title search query |
| `genre` | integer | No | — | Filter by TMDB genre ID |
| `yearFrom` | integer (1888–2100) | No | — | Filter movies released from this year (inclusive) |
| `yearTo` | integer (1888–2100) | No | — | Filter movies released up to this year (inclusive) |
| `sort` | enum | No | `popularity` | Sort order: `popularity`, `rating`, `year_desc`, `year_asc`, `title_asc` |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page (max 100) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tmdbId": 550,
      "title": "Fight Club",
      "posterUrl": "https://image.tmdb.org/t/p/w500/...",
      "releaseDate": "1999-10-15",
      "releaseYear": 1999,
      "avgRating": 4.3,
      "ratingCount": 247,
      "genres": [{ "id": 18, "name": "Drama", "tmdbGenreId": 18 }]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 },
  "tmdbFallback": false
}
```

The `tmdbFallback` field is `true` when results came from a live TMDB API search rather than the local cache.

---

#### POST /api/movies

Fetches movie metadata from TMDB by `tmdbId` and adds it to the local catalogue.

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Request body:**

```json
{
  "tmdbId": 550
}
```

**Response 201:** `MovieDetail` object

**Response 400:** Invalid TMDB ID or TMDB returned no result

**Response 401:** Unauthenticated

**Response 403:** Authenticated but not an admin

**Response 409:** Movie already exists in the catalogue

---

#### GET /api/movies/{id}

Returns full movie detail for a single movie.

**Auth required:** No

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Internal movie identifier |

**Response 200:** `MovieDetail` object

**Response 404:** Movie not found in local catalogue

---

#### PUT /api/movies/{id}

Updates locally editable fields on a movie record (editorial note only). Does not update TMDB metadata — use the sync endpoint for that.

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Request body:**

```json
{
  "editorialNote": "A masterpiece of psychological thriller filmmaking."
}
```

**Response 200:** Updated `MovieDetail` object

**Response 401/403/404:** Standard auth/not found responses

---

#### DELETE /api/movies/{id}

Permanently removes a movie and all its associated reviews and ratings (cascade).

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Required header:**

```
X-Confirm-Delete: true
```

This safety header must be set to prevent accidental deletion.

**Response 204:** Movie deleted — no response body

**Response 400:** Missing `X-Confirm-Delete` header

**Response 401/403/404:** Standard responses

---

#### POST /api/movies/{id}/sync

Triggers a TMDB metadata refresh for a catalogued movie. Updates the local record with the latest data from TMDB.

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Request body:** None

**Response 200:** Updated `MovieDetail` object

**Response 502:** TMDB API is unavailable — stale local data retained

---

### 9.4 Reviews

#### GET /api/movies/{id}/reviews

Returns all publicly visible reviews for a movie, sorted newest-first. Admin users also see hidden reviews (`isHidden: true`).

**Auth required:** No (admins see hidden reviews if authenticated)

**Path parameters:** `id` — UUID of the movie

**Query parameters:** `page`, `limit` (standard pagination)

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "displayName": "Dinesh Rawal", "avatarUrl": "...", "createdAt": "..." },
      "movieId": "uuid",
      "body": "A brilliant film.",
      "isHidden": false,
      "flagCount": 0,
      "isEdited": false,
      "createdAt": "2026-05-26T10:00:00Z",
      "updatedAt": "2026-05-26T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

**Response 404:** Movie not found

---

#### POST /api/movies/{id}/reviews

Submits a new text review for a movie. One review per user per movie.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Request body:**

```json
{
  "body": "A brutal, poetic film that stays with you long after the credits roll."
}
```

`body` must be 1–500 characters and not blank/whitespace-only.

**Response 201:** Created `Review` object

**Response 401:** Unauthenticated

**Response 404:** Movie not found

**Response 409:** User has already submitted a review for this movie

**Response 422:** Validation error (body too long, blank, or missing)

**Response 429:** Rate limit exceeded (20 submissions/hour/user)

---

#### PUT /api/reviews/{id}

Updates the body of the authenticated user's own review. Only the review author may edit their review.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Internal review identifier |

**Request body:**

```json
{
  "body": "Updated review text."
}
```

**Response 200:** Updated `Review` object (with `isEdited: true` and updated `updatedAt`)

**Response 401:** Unauthenticated

**Response 403:** Authenticated but not the review author

**Response 404:** Review not found

**Response 422:** Validation error

---

#### DELETE /api/reviews/{id}

Permanently deletes a review. Review authors can delete their own; admins can delete any.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the review

**Response 204:** Review deleted — no response body

**Response 401:** Unauthenticated

**Response 403:** Requester is neither the author nor an admin

**Response 404:** Review not found

---

#### POST /api/reviews/{id}/moderate

Admin action: hide, restore, or permanently delete a review. All actions are recorded in the audit log.

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the review

**Request body:**

```json
{
  "action": "hide",
  "reason": "Violates community guidelines"
}
```

`action` enum: `hide`, `restore`, `delete`. `reason` is optional and stored in the audit log.

**Response 200** (for `hide` and `restore`):

```json
{
  "review": { ... },
  "auditLog": { ... }
}
```

**Response 204** (for `delete`): Review permanently deleted — no response body

**Response 401/403/404/422:** Standard responses

---

#### POST /api/reviews/{id}/flag

Flags a review as inappropriate. One flag per user per review. Flagged reviews appear in the admin moderation queue.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the review

**Request body:** None

**Response 201:**

```json
{
  "message": "Review flagged for moderation"
}
```

**Response 401:** Unauthenticated

**Response 404:** Review not found

**Response 409:** User has already flagged this review

---

#### DELETE /api/reviews/{id}/flag

Removes the authenticated user's own flag from a review.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the review

**Response 204:** Flag removed — no response body

**Response 401:** Unauthenticated

**Response 404:** Review or flag not found

---

### 9.5 Ratings

#### POST /api/movies/{id}/rating

Submits or updates the authenticated user's star rating for a movie. If the user has already rated this movie, the existing rating is replaced (upsert). Triggers recalculation of the movie's `avgRating` and `ratingCount`.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Request body:**

```json
{
  "value": 5
}
```

`value` must be an integer from 1 to 5 (inclusive).

**Response 200:**

```json
{
  "rating": {
    "id": "uuid",
    "userId": "uuid",
    "movieId": "uuid",
    "value": 5,
    "createdAt": "2026-05-26T10:00:00Z",
    "updatedAt": "2026-05-26T10:00:00Z"
  },
  "movieAvgRating": 4.3,
  "movieRatingCount": 248
}
```

`movieAvgRating` and `movieRatingCount` reflect the updated aggregate after this rating.

**Response 401:** Unauthenticated

**Response 404:** Movie not found

**Response 422:** Validation error (value out of range)

---

#### DELETE /api/movies/{id}/rating

Removes the authenticated user's rating for a movie. Triggers recalculation of the movie's aggregate rating.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Path parameters:** `id` — UUID of the movie

**Response 204:** Rating deleted — no response body

**Response 401:** Unauthenticated

**Response 404:** Movie not found, or user has not rated this movie

---

#### GET /api/movies/{id}/rating/me

Returns the authenticated user's current rating for a movie.

**Auth required:** Yes (cookieAuth)

**Path parameters:** `id` — UUID of the movie

**Response 200:** `Rating` object

**Response 401:** Unauthenticated

**Response 404:** User has not yet rated this movie

```json
{
  "statusCode": 404,
  "message": "No rating found for this movie"
}
```

---

### 9.6 Users

#### GET /api/users/me

Returns the authenticated user's own profile including email and admin status.

**Auth required:** Yes (cookieAuth)

**Response 200:** `UserMe` object

**Response 401:** Unauthenticated

---

#### DELETE /api/users/me

Permanently deletes the authenticated user's account and ALL associated data (reviews, ratings, refresh tokens, flags) in a single database transaction. Clears all auth cookies on success.

**Auth required:** Yes (cookieAuth)

**CSRF required:** Yes

**Required header:**

```
X-Confirm-Delete: true
```

**Request body:** None

**Response 204:** Account deleted — all auth cookies cleared (Max-Age=0)

**Response 400:** Missing `X-Confirm-Delete` header

**Response 401:** Unauthenticated

---

#### GET /api/users/me/export

Returns a JSON export of all personal data: profile, all reviews, and all ratings. Triggers a file download via `Content-Disposition` header.

**Auth required:** Yes (cookieAuth)

**Rate limit:** 1 request/hour/user

**Response 200:**

Header: `Content-Disposition: attachment; filename="my-data-export-2026-05-26.json"`

```json
{
  "profile": {
    "id": "uuid",
    "displayName": "Dinesh Rawal",
    "avatarUrl": "...",
    "createdAt": "2026-05-23T10:00:00Z",
    "email": "rawaldinesh13@dsu.ac.kr",
    "isAdmin": false
  },
  "reviews": [ ... ],
  "ratings": [ ... ],
  "exportedAt": "2026-05-26T10:00:00Z"
}
```

**Response 401:** Unauthenticated

**Response 429:** Rate limit exceeded (1 export/hour)

> Note: This endpoint is defined in the API specification but is deferred to v1.1. It returns 501 in v1.0.

---

#### GET /api/users/{userId}

Returns a user's public profile with their submitted reviews.

**Auth required:** No

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | UUID | Internal user identifier |

**Query parameters:** `page`, `limit` (pagination for the reviews list)

**Response 200:**

```json
{
  "user": {
    "id": "uuid",
    "displayName": "Dinesh Rawal",
    "avatarUrl": "...",
    "createdAt": "2026-05-23T10:00:00Z"
  },
  "reviews": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

Email is not included. Reviews by deleted users are not returned.

**Response 404:** User not found

---

### 9.7 Admin

All admin endpoints require the authenticated user to have `isAdmin: true` in their JWT. Requests by authenticated non-admin users return HTTP 403.

#### GET /api/admin/reviews

Returns all reviews (including hidden) in the moderation queue. Filterable and sortable.

**Auth required:** Yes (cookieAuth) — Admin role required

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | enum | `all` | `all`, `flagged`, `hidden`, `recent` |
| `sort` | enum | `newest` | `newest`, `most_flagged` |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

**Response 200:**

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

Each item in `data` is a `Review` object. Hidden reviews have `isHidden: true`.

---

#### GET /api/admin/movies

Returns all movies in the local catalogue with management metadata.

**Auth required:** Yes (cookieAuth) — Admin role required

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search by title |
| `stale` | boolean | If true, return only movies with `cachedAt` older than 24 hours |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Response 200:** Paginated list of `MovieDetail` objects

---

#### GET /api/admin/users

Returns all registered users with admin status.

**Auth required:** Yes (cookieAuth) — Admin role required

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search by display name or email |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Response 200:** Paginated list of `UserMe` objects (includes email and isAdmin)

---

#### PATCH /api/admin/users/{userId}/role

Promotes or demotes a user's admin status. Recorded in the audit log.

**Auth required:** Yes (cookieAuth) — Admin role required

**CSRF required:** Yes

**Path parameters:** `userId` — UUID of the user to update

**Request body:**

```json
{
  "isAdmin": true
}
```

Set `isAdmin: true` to promote; `false` to demote.

**Response 200:** Updated `UserMe` object

**Response 400:** Cannot demote sole admin

```json
{
  "statusCode": 400,
  "message": "Cannot revoke admin status: you are the only administrator"
}
```

**Response 401/403/404:** Standard responses

---

#### GET /api/admin/audit-log

Returns the admin action audit log, chronological descending.

**Auth required:** Yes (cookieAuth) — Admin role required

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `adminUserId` | UUID | Filter by admin user |
| `actionType` | enum | Filter by action type (see AuditLogEntry schema for values) |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

**Response 200:** Paginated list of `AuditLogEntry` objects

---

## 10. HTTP Status Code Reference

| Code | Name | When It Occurs |
|------|------|----------------|
| 200 | OK | Successful GET or POST/PUT/PATCH that returns content |
| 201 | Created | Successful resource creation (review created, movie added) |
| 204 | No Content | Successful deletion or action with no response body |
| 302 | Found | OAuth redirects |
| 400 | Bad Request | Missing required header, invalid input, sole-admin guard violation |
| 401 | Unauthorized | Missing, invalid, or expired JWT access token |
| 403 | Forbidden | Authenticated but insufficient role, or CSRF token mismatch |
| 404 | Not Found | Requested resource does not exist |
| 409 | Conflict | Duplicate resource (second review, second flag, duplicate movie) |
| 422 | Unprocessable Entity | Validation failure (body too long, value out of range, etc.) |
| 429 | Too Many Requests | Rate limit exceeded — see `Retry-After` header |
| 502 | Bad Gateway | Upstream dependency (TMDB) is unavailable |

---

*Produced by technical-writer — 2026-05-26*
*Reviewed by tech-lead — 2026-05-26*
