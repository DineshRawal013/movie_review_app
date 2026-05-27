# Low-Level Design — Movie Review Application

**Document ID:** LLD-1.0
**Owner:** backend-engineer + database-architect
**Status:** DRAFT — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Produced by:** backend-engineer (Phase 4 — Detailed Design)
**Reviewed by:** tech-lead

---

## Table of Contents

1. [Module Breakdown — NestJS Modules](#1-module-breakdown--nestjs-modules)
2. [Service Layer Responsibilities](#2-service-layer-responsibilities)
3. [Key Algorithms](#3-key-algorithms)
4. [Error Handling Strategy](#4-error-handling-strategy)
5. [Logging Strategy](#5-logging-strategy)

---

## 1. Module Breakdown — NestJS Modules

The backend is structured as a NestJS modular monolith. Each module encapsulates its controllers, services, and Prisma access. Cross-module dependencies are explicit and injected via NestJS DI.

```
backend/src/
├── main.ts                    # Bootstrap + global pipes/filters/guards
├── app.module.ts              # Root module — imports all feature modules
│
├── auth/                      # AuthModule
│   ├── auth.module.ts
│   ├── auth.controller.ts     # GET /auth/google, GET /auth/google/callback, POST /auth/refresh, POST /auth/logout
│   ├── auth.service.ts        # Token issue/rotation/revocation logic
│   ├── strategies/
│   │   ├── google.strategy.ts # passport-google-oauth20 Passport strategy
│   │   └── jwt.strategy.ts    # passport-jwt strategy (reads httpOnly cookie)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts  # Applied globally; @Public() decorator skips it
│   │   ├── roles.guard.ts     # Checks isAdmin claim in JWT
│   │   └── csrf.guard.ts      # Double-submit cookie validation for POST/PUT/PATCH/DELETE
│   └── decorators/
│       ├── public.decorator.ts      # @Public() — marks route as unauthenticated
│       ├── roles.decorator.ts       # @Roles('admin')
│       └── current-user.decorator.ts # @CurrentUser() — injects authenticated user
│
├── movies/                    # MoviesModule
│   ├── movies.module.ts
│   ├── movies.controller.ts   # GET/POST /movies, GET/PUT/DELETE/POST-sync /movies/:id
│   ├── movies.service.ts      # Local movie CRUD, search, TMDB cache-aside coordination
│   └── dto/
│       ├── create-movie.dto.ts
│       ├── update-movie.dto.ts
│       └── list-movies.dto.ts
│
├── reviews/                   # ReviewsModule
│   ├── reviews.module.ts
│   ├── reviews.controller.ts  # All /movies/:id/reviews and /reviews/:id endpoints
│   ├── reviews.service.ts     # Review CRUD, flag operations, visibility rules
│   └── dto/
│       ├── create-review.dto.ts
│       ├── update-review.dto.ts
│       └── moderate-review.dto.ts
│
├── ratings/                   # RatingsModule
│   ├── ratings.module.ts
│   ├── ratings.controller.ts  # POST/DELETE /movies/:id/rating, GET /movies/:id/rating/me
│   ├── ratings.service.ts     # Upsert logic; triggers aggregate update via DB trigger
│   └── dto/
│       └── upsert-rating.dto.ts
│
├── users/                     # UsersModule
│   ├── users.module.ts
│   ├── users.controller.ts    # GET/DELETE /users/me, GET /users/me/export, GET /users/:userId
│   ├── users.service.ts       # Profile reads, GDPR deletion, data export
│   └── dto/
│       └── user-profile.dto.ts
│
├── admin/                     # AdminModule
│   ├── admin.module.ts
│   ├── admin.controller.ts    # All /admin/* endpoints
│   ├── admin.service.ts       # Moderation queue, user role mgmt, audit log writes
│   └── dto/
│       ├── update-user-role.dto.ts
│       └── admin-list-query.dto.ts
│
├── tmdb/                      # TMDBModule
│   ├── tmdb.module.ts
│   ├── tmdb.service.ts        # TMDB API calls, rate limiting, caching, transformation
│   └── tmdb.types.ts          # TMDB response shape types (internal; never leaked to wire)
│
├── cache/                     # CacheModule (wraps @nestjs/cache-manager with Redis)
│   ├── cache.module.ts        # Global module; exports CacheService
│   └── cache.service.ts       # get/set/del wrappers with typed TTL config
│
├── database/                  # DatabaseModule
│   ├── database.module.ts     # Global module; provides PrismaService
│   └── prisma.service.ts      # PrismaClient wrapper with lifecycle hooks (onModuleInit/Destroy)
│
└── common/                    # Shared utilities
    ├── filters/
    │   └── http-exception.filter.ts  # Global exception filter — formats all errors
    ├── interceptors/
    │   ├── logging.interceptor.ts     # Request/response logging with requestId
    │   └── transform.interceptor.ts  # Wraps responses in standard envelope
    ├── pipes/
    │   └── validation.pipe.ts         # Global ValidationPipe (class-validator + class-transformer)
    ├── dto/
    │   └── pagination.dto.ts          # Reusable page/limit query params
    └── utils/
        ├── hash.util.ts               # SHA-256 hashing for token storage
        └── pagination.util.ts         # Builds PaginationMeta from count + query params
```

### 1.1 Module Dependency Graph

```
AppModule
  ├── DatabaseModule (global)     — provides PrismaService to all modules
  ├── CacheModule (global)        — provides CacheService to all modules
  ├── AuthModule
  │   └── UsersModule (imports)   — AuthService calls UsersService for user upsert
  ├── MoviesModule
  │   └── TMDBModule (imports)    — MoviesService delegates TMDB calls to TMDBService
  ├── ReviewsModule
  │   └── MoviesModule (imports)  — ReviewsService validates movieId exists
  ├── RatingsModule
  │   └── MoviesModule (imports)  — RatingsService validates movieId exists
  ├── UsersModule
  ├── AdminModule
  │   ├── ReviewsModule (imports)
  │   ├── MoviesModule (imports)
  │   └── UsersModule (imports)
  └── TMDBModule
```

---

## 2. Service Layer Responsibilities

### 2.1 AuthService

| Method | Responsibility |
|--------|---------------|
| `handleGoogleCallback(profile)` | Upserts user in DB; issues access + refresh token pair; sets httpOnly cookies |
| `issueTokenPair(user)` | Signs JWT access token (15m, HS256); generates cryptographically random refresh token; hashes and stores in `refresh_tokens`; returns both |
| `refreshTokens(rawRefreshToken, response)` | Validates refresh token: hash → Redis revocation check → DB lookup → expiry check; rotates token pair; clears old DB row; sets new cookies |
| `logout(rawRefreshToken, response)` | Hashes token; adds to Redis revocation set (TTL = remaining lifetime); deletes from DB; clears all cookies |
| `validateJwtPayload(payload)` | Called by JwtStrategy on every protected request; returns full User record or throws 401 |
| `cleanupExpiredTokens()` | Scheduled job (@Cron): deletes `refresh_tokens` rows where `expires_at < now()` |

**Token issue flow:**
```
1. Generate random 32-byte Buffer → base64url-encode → rawRefreshToken
2. SHA-256 hash rawRefreshToken → tokenHash
3. INSERT refresh_tokens(user_id, token_hash, expires_at=now()+7d)
4. Sign JWT: { sub: userId, email, isAdmin, iat, exp: now()+15m }
5. Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
6. Set-Cookie: refresh_token=<rawRefreshToken>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
7. Set-Cookie: csrf_token=<uuid>; Secure; SameSite=Strict; Max-Age=604800  (NOT HttpOnly)
```

---

### 2.2 MoviesService

| Method | Responsibility |
|--------|---------------|
| `listMovies(query: ListMoviesDto)` | Builds Prisma query with optional title trigram search, genre filter, year filter, sort, pagination. Falls back to TMDB search on cache miss. |
| `getMovieById(id: string)` | Fetches movie with genres. Throws 404 if not found. |
| `addMovieFromTMDB(tmdbId: number)` | Checks local cache; throws 409 if exists; calls TMDBService; transforms; upserts to DB; writes audit log. |
| `updateMovie(id, dto: UpdateMovieDto)` | Updates only `editorial_note` (and other admin-overridable fields). |
| `deleteMovie(id)` | Hard deletes movie (cascade handles reviews/ratings); writes audit log. |
| `syncMovieFromTMDB(id)` | Fetches latest TMDB data; updates movie row + `cached_at`; writes audit log. |
| `upsertMoviesFromTMDB(tmdbMovies)` | Bulk upsert from TMDB search results into local `movies` table. |

---

### 2.3 ReviewsService

| Method | Responsibility |
|--------|---------------|
| `listReviewsForMovie(movieId, query, user?)` | Returns paginated reviews: `deleted_at IS NULL`. Hides `is_hidden=true` reviews unless caller is admin. |
| `createReview(movieId, userId, dto)` | Validates uniqueness; trims body; inserts review. Throws 409 on duplicate, 422 on validation fail. |
| `updateReview(reviewId, userId, dto)` | Verifies ownership (throws 403 if not owner); updates body; sets `updated_at`. |
| `deleteReview(reviewId, userId, isAdmin)` | Owner or admin may delete. Admin deletion writes audit log. Sets `deleted_at`. |
| `moderateReview(reviewId, adminUserId, dto)` | Admin-only: dispatches hide/restore/delete; writes audit log entry. |
| `flagReview(reviewId, userId)` | Inserts `review_flags` row (409 on duplicate). DB trigger increments `flag_count`. |
| `unflagReview(reviewId, userId)` | Deletes `review_flags` row. DB trigger decrements `flag_count`. |
| `getPublicVisibilityFilter()` | Returns Prisma `where` clause: `{ deletedAt: null, isHidden: false }` |

---

### 2.4 RatingsService

| Method | Responsibility |
|--------|---------------|
| `upsertRating(movieId, userId, value)` | Prisma `upsert` on unique(userId, movieId). DB trigger recalculates `movies.avg_rating` and `movies.rating_count`. Returns rating + updated movie aggregates. |
| `deleteRating(movieId, userId)` | Deletes rating row; DB trigger recalculates aggregates. Throws 404 if not found. |
| `getMyRating(movieId, userId)` | Returns user's rating or throws 404. |

---

### 2.5 UsersService

| Method | Responsibility |
|--------|---------------|
| `upsertFromGoogle(googleProfile)` | Called by AuthService after OAuth. Prisma `upsert` on `google_id`. Returns user record. |
| `findById(id)` | Throws 404 if not found or soft-deleted. |
| `getPublicProfile(userId)` | Returns `UserPublic` + paginated reviews (public visibility only). |
| `deleteOwnAccount(userId)` | Transaction: hard-deletes reviews/ratings/tokens/flags; sets `users.deleted_at`; clears cookies. |
| `exportData(userId)` | Builds JSON export: user profile + all reviews + all ratings. |

---

### 2.6 AdminService

| Method | Responsibility |
|--------|---------------|
| `getModerationQueue(query)` | Returns all reviews (including hidden, excluding hard-deleted), sorted and filtered per query params. |
| `listMoviesAdmin(query)` | Returns all movies with management metadata. |
| `listUsersAdmin(query)` | Returns all non-deleted users with admin status. |
| `updateUserRole(adminId, targetUserId, isAdmin)` | Sets `is_admin` flag. Guards against last-admin demotion. Writes audit log. |
| `writeAuditLog(entry: CreateAuditLogDto)` | Inserts into `audit_log`. Called internally by ReviewsService, MoviesService, AdminService on every admin action. |
| `getAuditLog(query)` | Returns paginated, filtered audit log. |

---

### 2.7 TMDBService

| Method | Responsibility |
|--------|---------------|
| `fetchPopularMovies(page)` | GET /movie/popular from TMDB; cache-aside with key `tmdb:popular:{page}` TTL=3600s |
| `searchMovies(query, page)` | GET /search/movie from TMDB; cache-aside with key `tmdb:search:{hash(query+page)}` TTL=3600s |
| `fetchMovieDetail(tmdbId)` | GET /movie/{tmdbId}?append_to_response=credits,videos; cache-aside with key `tmdb:movie:{tmdbId}` TTL=3600s |
| `transformToLocalMovie(tmdbResponse)` | Maps TMDB response to internal `Movie` shape; extracts director from credits; extracts top-10 cast; finds YouTube trailer |
| `checkStaleMovies()` | Scheduled job: queries `movies WHERE cached_at < now() - 24h LIMIT 50`; refreshes via `fetchMovieDetail` |

---

### 2.8 CacheService

| Method | Responsibility |
|--------|---------------|
| `get<T>(key: string): Promise<T \| null>` | Redis GET; returns null on miss or deserialization error |
| `set(key, value, ttlSeconds)` | Redis SETEX |
| `del(key)` | Redis DEL |
| `isRevoked(tokenHash)` | GET `rt_revoked:{hash}`; returns boolean |
| `revokeToken(tokenHash, ttlSeconds)` | SETEX `rt_revoked:{hash}` 1 {ttl} |

---

## 3. Key Algorithms

### 3.1 TMDB Cache-Aside Logic

```
function fetchWithCache<T>(cacheKey: string, tmdbFetcher: () => Promise<T>, ttl: number): Promise<T>

1. result = await cache.get(cacheKey)
2. IF result is not null:
     RETURN result                              // Cache HIT
3. TRY:
   a. tmdbResponse = await tmdbFetcher()        // TMDB API call
   b. await cache.set(cacheKey, tmdbResponse, ttl)
   c. RETURN tmdbResponse                       // Cache MISS, freshly fetched
4. CATCH (network error | 429 rate limit | 5xx):
   a. staleResult = await cache.get(cacheKey + ':stale')   // stale fallback
   b. IF staleResult is not null:
        LOG warning "TMDB unavailable; serving stale cache"
        RETURN staleResult
   c. ELSE:
        THROW TmdbUnavailableException (maps to 502 if admin sync; graceful empty if browse)
```

**Stale-while-revalidate pattern:**
On every successful TMDB fetch, the response is also written to a `:stale` key with a 48-hour TTL. This provides a fallback when TMDB is down and the primary 1-hour cache has expired.

**TMDB rate limit guard:**
A token bucket is maintained in Redis:
- Bucket capacity: 40 tokens
- Refill rate: 40 tokens per 10 seconds
- Each TMDB outbound request consumes 1 token
- If bucket is empty: queue request with exponential backoff (max 3 retries: 1s, 2s, 4s)

---

### 3.2 Review Moderation State Machine

Reviews have three visible states: **Active**, **Hidden**, **Deleted**.

```
State transitions:

                        ┌──────────────────────────────────────────┐
                        │               Submitted                   │
                        │                                          │
                        ▼                                          │
                ┌──────────────┐                                   │
                │    ACTIVE    │ ◄── restore ──────────────────────┤
                │  is_hidden=F │                                   │
                │  deleted_at=null                                 │
                └──────┬───────┘                                   │
                       │                                           │
              ┌────────┴────────────┐                             │
              │                     │                             │
              ▼ admin hide          ▼ owner/admin delete          │
     ┌──────────────┐      ┌───────────────┐                      │
     │    HIDDEN    │      │    DELETED    │                       │
     │  is_hidden=T │      │  deleted_at=T │                      │
     │  deleted_at=null    │  (soft)       │                      │
     └──────┬───────┘      └───────────────┘                      │
            │                                                      │
            │ admin restore ───────────────────────────────────────┘
            │
            │ admin delete
            ▼
     ┌───────────────┐
     │    DELETED    │
     │  deleted_at=T │
     └───────────────┘

Visibility rules:
  Public:  is_hidden=false AND deleted_at IS NULL
  Admin:   deleted_at IS NULL (sees hidden + active, not deleted)
  Audit:   all states (via audit_log)

Transitions:
  active  → hidden:  Admin sets is_hidden=true; audit log REVIEW_HIDDEN
  hidden  → active:  Admin sets is_hidden=false; audit log REVIEW_RESTORED
  active  → deleted: Owner OR Admin sets deleted_at=now(); admin: audit log REVIEW_DELETED
  hidden  → deleted: Admin sets deleted_at=now(); audit log REVIEW_DELETED
  deleted → *:       Terminal state; no transitions out (permanent deletion)
```

---

### 3.3 Rating Aggregation

Aggregation is handled entirely at the database layer via PostgreSQL trigger (defined in ERD.md Section 5.1). The application layer does not compute aggregates.

**Trigger: `trg_ratings_aggregate`**
- Fires: AFTER INSERT, UPDATE, DELETE on `ratings`
- Action: Recalculates `AVG(value)` and `COUNT(*)` for the affected `movie_id`
- Updates: `movies.avg_rating` (NUMERIC(3,2)), `movies.rating_count` (INTEGER), `movies.updated_at`
- Handles edge case: if last rating is deleted, sets `avg_rating = 0.00`, `rating_count = 0`

**Service layer:**
- `RatingsService.upsertRating()` calls `prisma.rating.upsert()` and then reads back `movie.avgRating` and `movie.ratingCount` in the same request to return updated aggregates to the client.
- This avoids a round-trip: the trigger updates the movie row synchronously within the same transaction, so the subsequent movie read reflects the new aggregate immediately.

**Precision:**
- `NUMERIC(3,2)` stores values with exactly 2 decimal places (e.g., 4.35).
- API response returns this as a float rounded to 1 decimal for display (`(4.35).toFixed(1)` → "4.4").
- Database stores the precise value; UI rounds for readability.

---

### 3.4 Sole-Admin Guard Algorithm

Applied in `AdminService.updateUserRole()` when `isAdmin = false`:

```
1. IF targetUserId == adminRequester.id:
     adminCount = SELECT COUNT(*) FROM users WHERE is_admin=true AND deleted_at IS NULL
     IF adminCount <= 1:
       THROW BadRequestException("Cannot revoke admin status: you are the only administrator")

2. IF targetUserId != adminRequester.id:
     IF target.is_admin == false:
       THROW BadRequestException("User is not currently an admin")
     adminCount = SELECT COUNT(*) FROM users WHERE is_admin=true AND deleted_at IS NULL
     IF adminCount <= 1:
       THROW BadRequestException("Cannot revoke the only remaining administrator")

3. UPDATE users SET is_admin=false WHERE id=targetUserId
4. WRITE audit_log(action: USER_DEMOTED, target_user_id: targetUserId)
```

---

### 3.5 GDPR Account Deletion Algorithm

`UsersService.deleteOwnAccount(userId)` executes in a single Prisma transaction:

```
BEGIN TRANSACTION:
  1. Hard-delete all refresh_tokens WHERE user_id = userId
  2. Hard-delete all review_flags WHERE user_id = userId
  3. Hard-delete all ratings WHERE user_id = userId
     (triggers: recalculate avg_rating for each affected movie)
  4. Hard-delete all reviews WHERE user_id = userId
     (cascade: deletes associated review_flags)
  5. Soft-delete user: UPDATE users SET deleted_at=now() WHERE id=userId
COMMIT

Post-transaction:
  6. Add all user's active refresh token hashes to Redis revocation set
  7. Clear access_token, refresh_token, csrf_token cookies
```

Note: The `audit_log` entries with `admin_user_id = userId` are preserved with `SET NULL` on the FK (the log entry remains; `admin_user_id` becomes NULL). This maintains the audit trail integrity.

---

## 4. Error Handling Strategy

### 4.1 Global HTTP Exception Filter

All unhandled exceptions are caught by `HttpExceptionFilter` registered globally in `main.ts`. It produces a consistent error response shape matching the `ErrorResponse` schema in the OpenAPI spec:

```typescript
{
  statusCode: number,
  message: string | string[],
  error: string,
  requestId: string  // UUID from LoggingInterceptor
}
```

**Exception mapping:**

| Exception | HTTP Status | Trigger |
|-----------|------------|---------|
| `NotFoundException` | 404 | Resource not found (Prisma `null` return) |
| `UnauthorizedException` | 401 | JwtAuthGuard fails; token expired/invalid |
| `ForbiddenException` | 403 | RolesGuard fails; not owner on edit/delete |
| `ConflictException` | 409 | Duplicate review/rating; duplicate flag |
| `BadRequestException` | 400 | Invalid input, business rule violation |
| `UnprocessableEntityException` | 422 | Validation error (class-validator) |
| `ThrottlerException` | 429 | Rate limit exceeded |
| `TmdbUnavailableException` | 502 | TMDB API unreachable (admin sync only) |
| `PrismaClientKnownRequestError (P2002)` | 409 | DB unique constraint violation |
| `PrismaClientKnownRequestError (P2025)` | 404 | Record not found on update/delete |
| Any unhandled `Error` | 500 | Bug — logs full stack trace, returns generic message |

### 4.2 Validation Pipe (Global)

`ValidationPipe` applied globally in `main.ts`:
```typescript
new ValidationPipe({
  whitelist: true,          // Strip unknown properties
  forbidNonWhitelisted: true, // Throw on unknown properties
  transform: true,          // Auto-transform to DTO types
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: (errors) => new UnprocessableEntityException(
    errors.flatMap(e => Object.values(e.constraints ?? {}))
  )
})
```

### 4.3 Prisma Error Handling

`PrismaService` wraps all queries. A custom interceptor catches `PrismaClientKnownRequestError` and maps known error codes:

| Prisma Code | Meaning | Mapped To |
|------------|---------|-----------|
| P2002 | Unique constraint violation | `ConflictException` |
| P2025 | Record not found | `NotFoundException` |
| P2003 | Foreign key constraint violation | `BadRequestException` |
| P1001 | DB connection error | 500 (logged; generic response) |

### 4.4 TMDB Error Handling

`TMDBService` handles TMDB API errors with this escalation:
1. Network error / timeout → retry (max 2 retries, exponential backoff: 1s, 2s)
2. HTTP 429 (rate limit) → wait for rate limit window reset (from Retry-After header); retry
3. HTTP 5xx → attempt stale cache fallback; if no stale cache → throw `TmdbUnavailableException`
4. HTTP 404 → movie does not exist on TMDB → throw `NotFoundException`

---

## 5. Logging Strategy

### 5.1 Structured JSON Logging (Pino)

NestJS uses a custom Pino logger. Every log entry is JSON-formatted:

```json
{
  "level": "info",
  "time": "2026-05-23T10:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "uuid-or-null",
  "method": "POST",
  "url": "/api/movies/123/reviews",
  "statusCode": 201,
  "responseTimeMs": 45,
  "message": "Review created"
}
```

Log levels:
- `trace`: Detailed request/response bodies (dev only; never in production)
- `debug`: Cache hit/miss decisions, query plans (dev + staging)
- `info`: Request completed, significant business events (all environments)
- `warn`: TMDB fallback to stale cache, rate limit near threshold, soft errors
- `error`: Unhandled exceptions, DB connection issues, TMDB unavailable (all environments)
- `fatal`: Service crash (process exit)

### 5.2 Request Lifecycle Logging

`LoggingInterceptor` applies to every request:
1. On request received: `info "Incoming request"` with method, url, userId (from JWT or null)
2. Generates `requestId` (UUID v4); attaches to `AsyncLocalStorage` context for propagation
3. On response sent: `info "Request completed"` with statusCode, responseTimeMs
4. On exception: `error "Request failed"` with error message and stack (500s only)

### 5.3 Business Event Logging

Key business events logged at `info` level by service methods:

| Event | Message | Extra Context |
|-------|---------|---------------|
| OAuth login (new user) | "New user registered" | userId, googleId |
| OAuth login (returning user) | "User authenticated" | userId |
| Token refresh | "Token refreshed" | userId |
| Logout | "User logged out" | userId |
| Review created | "Review created" | reviewId, movieId, userId |
| Review deleted (owner) | "Review deleted by owner" | reviewId, userId |
| Review deleted (admin) | "Review deleted by admin" | reviewId, adminUserId |
| Review hidden | "Review hidden by admin" | reviewId, adminUserId |
| Rating upserted | "Rating upserted" | movieId, userId, value |
| Movie added from TMDB | "Movie added to catalogue" | movieId, tmdbId, adminUserId |
| Movie deleted | "Movie deleted from catalogue" | movieId, adminUserId |
| GDPR deletion | "User account deleted" | userId |
| TMDB cache miss | "TMDB cache miss; fetching from API" | cacheKey |
| TMDB unavailable | "TMDB API unavailable; serving stale" | cacheKey, staleTtl |

### 5.4 Security Event Logging

Security events logged at `warn` or `error` level:

| Event | Level | Message |
|-------|-------|---------|
| JWT validation failure | warn | "JWT validation failed" + reason |
| CSRF token mismatch | warn | "CSRF validation failed" + ip |
| Rate limit exceeded | warn | "Rate limit exceeded" + ip/userId + endpoint |
| Refresh token invalid/revoked | warn | "Invalid refresh token" + reason |
| Unauthorized admin action attempt | warn | "Forbidden admin action attempt" + userId |
| DB error (non-expected) | error | Full stack trace; PrismaClientKnownRequestError code |

### 5.5 Log Retention

Logs are written to stdout (Docker Compose default). The host system's Docker log driver handles retention. For v1.0:
- Default Docker JSON file log driver with `max-size: 50m`, `max-file: 5`
- Configured in `docker-compose.yml` per service
- Security events are additionally written to a named log volume (`./logs/security.log`) via Pino transport target for easy audit review

---

*Produced by backend-engineer — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
