# ADR-004 — Caching Strategy

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The Movie Review Application has two distinct caching concerns:

**Concern A — TMDB API response caching:**
- NFR-003 requires TMDB responses to be cached for a minimum of 1 hour.
- The TMDB free-tier API is rate-limited at ~40 requests per 10 seconds (CON-007).
- TMDB is an external dependency; graceful degradation on TMDB unavailability is required (NFR-041, FR-006).
- TMDB data is read-heavy and changes infrequently (movie metadata is stable; popular/trending lists change daily).

**Concern B — Refresh token revocation tracking:**
- Signed-out refresh tokens must be invalidated before their natural expiry (7 days) to prevent session hijacking after sign-out (NFR-020).
- Need: fast key-value lookup by token hash; data expires automatically after the token's remaining lifetime.

**Concern C — Rate limit counters:**
- Per-IP and per-user sliding window counters for rate limiting (NFR-025).
- Need: atomic increment with TTL; sub-millisecond response.

The question is whether to use Redis, application-level in-memory caching, or no dedicated cache (relying solely on PostgreSQL).

---

## Decision

**Redis 7 as the dedicated caching layer, serving all three concerns.**

---

## Rationale

1. **Redis is purpose-built for all three use cases:**
   - Key-value storage with configurable TTL (Concern A, Concern B).
   - Atomic `INCR` + `EXPIRE` operations for sliding window rate limiting (Concern C).
   - Sub-millisecond response times for all three access patterns.

2. **Stateless API requirement (NFR-011):** In-process Node.js memory cache (e.g., `node-cache`, `lru-cache`) is not shared across container instances. While v1.0 runs a single backend container, the architecture targets future horizontal scaling (NFR-011). Redis externalizes the cache, making it accessible to multiple backend instances without code changes.

3. **Refresh token revocation (Concern B):** An in-memory store would lose revocation records on container restart, creating a security window where a signed-out token could be reused. Redis can optionally persist its data (AOF) and survives container restarts within the Docker Compose setup.

4. **Separation from PostgreSQL:** PostgreSQL (Concern A fallback) is the warm cache layer — once TMDB data is persisted to the `movies` table, subsequent full movie-detail requests (metadata + reviews + ratings) come entirely from PostgreSQL, with no Redis or TMDB round-trip. Redis is the hot cache for raw TMDB API JSON blobs (trending lists, search results, movie details not yet in PostgreSQL).

5. **Operational simplicity:** Redis 7 Alpine Docker image is ~30 MB, requires zero configuration for basic use, and adds no licensing cost. Fits the home-server deployment model.

6. **NestJS ecosystem:** `@nestjs/cache-manager` with the `cache-manager-ioredis-yet` adapter provides a clean, injectable cache service. `@nestjs/throttler` with `ThrottlerStorageRedisService` handles rate limit counters natively in Redis.

---

## Caching Architecture Details

### TMDB Response Cache (Redis hot cache)

```
Key format:  tmdb:{endpoint_slug}:{sha256(query_params)}
Value:       Serialized JSON string (TMDB API response body)
TTL:         3600 seconds (1 hour minimum, per NFR-003)
             Popular/trending lists: 3600s
             Movie detail: 86400s (24 hours; movie metadata changes rarely)
             Search results: 900s (15 minutes; search relevance changes more frequently)
```

Cache-aside read path:
1. Backend receives request.
2. Backend computes cache key.
3. Redis GET: if HIT, return cached response (< 1ms).
4. Redis MISS: call TMDB API, write response to Redis with TTL, return response.
5. If TMDB unreachable: if stale data exists in PostgreSQL `movies` table, serve it; else return empty/error state with informative message.

### Refresh Token Revocation Set

```
Key format:  rt_revoked:{sha256(token_value)}
Value:       "1" (presence flag)
TTL:         Remaining seconds until token's natural expiry
```

On sign-out: backend sets this key. On every refresh request: backend checks this key before validating against PostgreSQL. O(1) lookup.

### Rate Limit Counters

```
Key format:  rl:auth:{ip_address}        (auth endpoints, 60s window)
             rl:reviews:{user_id}        (review submission, 3600s window)
             rl:global:{ip_address}      (all endpoints, 60s window)
Value:       Integer counter
TTL:         Window size in seconds
Operation:  INCR (atomic); TTL set on first INCR
```

---

## Consequences

**Positive:**
- Redis absorbs TMDB read spike traffic, protecting the free-tier rate limit.
- Token revocation is reliable even under load and across container restarts (with AOF).
- Rate limiting is consistent and stateless from the API perspective.
- Cache externalization makes the API layer horizontally scalable.

**Negative:**
- Adds an additional Docker service to the Compose stack (one more container to manage).
- If Redis is unavailable, the application must degrade gracefully:
  - TMDB cache miss falls back to PostgreSQL or TMDB API directly (slower, but functional).
  - Rate limit enforcement becomes unavailable (acceptable degradation for home-server scale).
  - Token revocation set becomes unavailable — sign-out still clears cookies, but signed-out tokens could theoretically be replayed until natural expiry. Acceptable risk given the 15-minute access token window and home-server threat model.
- Redis data is ephemeral by default (unless AOF/RDB persistence configured). TMDB cache is re-warmable; token revocation data loss window is 15 minutes (access token expiry).

**Neutral:**
- Redis `redis_data` volume is defined in Docker Compose; AOF persistence can be enabled with a single Redis config line without changing the architecture.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| In-process Node.js cache (lru-cache / node-cache) | No extra container; zero latency (in-process) | Not shared across instances (violates NFR-011); lost on container restart (security risk for revocation); no atomic operations for rate limiting | NFR-011 compliance failure; security risk for token revocation |
| PostgreSQL only (no Redis) | No extra service; all data in one store; simpler ops | PostgreSQL not designed for sub-millisecond key-value TTL operations; `pg_cron` or application-level cleanup needed for expiry; rate limit counters require locking to avoid race conditions; high read load from TMDB caching would add to database I/O | Performance and operational complexity concerns; Redis is the right tool for these access patterns |
| Memcached | Faster than Redis for simple key-value caching | No persistence (token revocation risk); no sorted sets / atomic counters needed for rate limiting; less NestJS ecosystem support; Redis is strictly superior for this use case | Redis provides a superset of Memcached capabilities with better ecosystem support |
| No dedicated cache | Eliminates Redis dependency | TMDB rate limit risk (CON-007); NFR-003 violation; no graceful degradation strategy (NFR-041); rate limiting becomes complex | Multiple NFR violations; unacceptable TMDB API risk |

---

*Produced by solution-architect — 2026-05-23*
