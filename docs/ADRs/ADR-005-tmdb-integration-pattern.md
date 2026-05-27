# ADR-005 — TMDB Integration Pattern

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The Movie Review Application sources all movie metadata from The Movie Database (TMDB) REST API (CON-003). The integration must handle:

- **Rate limits:** TMDB free tier allows ~40 requests per 10 seconds (CON-007). With ~10,000 users per year and the application serving movie data on browse, search, and detail pages, uncontrolled fan-out to TMDB would quickly exhaust this limit.
- **Availability:** TMDB is an external dependency. If TMDB is unavailable, the application must degrade gracefully — browse/read functions must remain available with cached data (NFR-041, FR-006).
- **Data freshness:** Movie metadata changes infrequently (a released film's poster, cast, and synopsis are stable). Trending/popular lists change daily. Search results change infrequently.
- **Admin-driven catalogue:** Admins can add movies to the local catalogue (FR-080), trigger metadata refreshes (FR-081), and remove movies (FR-082). This implies a local copy of TMDB data in PostgreSQL.
- **API key security:** The TMDB API key must never be exposed to clients (NFR-026); all TMDB calls must be server-side.

Three integration patterns were evaluated: direct proxy, background sync, and hybrid.

---

## Decision

**Hybrid pattern: On-demand cache-aside with selective local persistence and admin-triggered background sync.**

---

## Rationale

The hybrid pattern combines the best properties of direct proxy and background sync:

1. **On-demand cache-aside for search and browse (direct proxy element):**
   - When a user searches for or browses movies, the backend checks Redis first (TTL = 15min for search, 1h for popular/trending).
   - On Redis miss: the backend calls TMDB directly, caches the result in Redis, and returns to the client. No persistent storage yet.
   - This avoids pre-populating the entire TMDB catalogue (which would be impractical at ~900,000+ movies).

2. **Selective local persistence for catalogued movies (background sync element):**
   - When a movie is added to the catalogue (FR-080 admin action, or implicitly when a user submits a review/rating), TMDB metadata is persisted to the PostgreSQL `movies` table.
   - Once in PostgreSQL, movie detail pages are served from PostgreSQL (metadata + reviews + ratings in one query), with no TMDB call required at page view time.
   - A `cached_at` timestamp tracks data age. The backend flags movies with `cached_at > 24 hours` as stale and refreshes them on next access (or on admin request FR-081).

3. **Admin-triggered manual refresh (FR-081):**
   - Admins can force-refresh TMDB metadata for any catalogued movie. The backend calls TMDB immediately, updates the PostgreSQL record, and invalidates the Redis key for that movie.

4. **Rate limit protection:**
   - An outbound TMDB rate limiter (token-bucket, 35 req/10s to leave headroom) is implemented in the `TmdbService`. All TMDB calls go through this limiter.
   - Redis cache absorbs repeated identical requests from multiple users simultaneously.

5. **Graceful degradation:**
   - If TMDB is unavailable: Redis cache serves hot data; PostgreSQL serves persisted movie detail data.
   - If Redis is also cold: PostgreSQL serves stale-but-present data with a UI banner.
   - If neither has the requested data (cold start with no cache): return an empty state with an informative error message (FR-006, NFR-041).
   - TMDB unavailability never prevents reading existing reviews, ratings, or user profiles.

---

## Integration Architecture

```
Client Request
     │
     ▼
Backend TmdbService
     │
     ├── 1. Check Redis (TTL-based hot cache)
     │       HIT → return cached data immediately
     │       MISS → continue
     │
     ├── 2. Check PostgreSQL movies table (if detail page request)
     │       HIT (fresh, cached_at < 24h) → return PostgreSQL data
     │       HIT (stale, cached_at >= 24h) → return stale data + trigger async refresh
     │       MISS → continue
     │
     ├── 3. Call TMDB API (via outbound rate limiter)
     │       SUCCESS → write to Redis (TTL) + upsert PostgreSQL (if detail) → return
     │       FAILURE (429, 5xx, timeout) → retry 2x with exponential backoff
     │                                    → if still fails: return stale data if available
     │                                    → if no stale data: return empty/error state
     │
     └── Rate limiter: token bucket, 35 req/10s outbound
```

---

## TMDB API Endpoints Used

| Application Use Case | TMDB Endpoint | Cache TTL | Persisted to PostgreSQL |
|---------------------|--------------|-----------|------------------------|
| Browse / Popular | `GET /movie/popular` | 3600s | No (list only) |
| Browse / Top Rated | `GET /movie/top_rated` | 3600s | No (list only) |
| Search | `GET /search/movie?query=...` | 900s | No (list only) |
| Filter by genre | `GET /discover/movie?with_genres=...` | 3600s | No (list only) |
| Movie detail | `GET /movie/{id}` + `/credits` + `/videos` | 86400s | Yes |
| Related movies | `GET /movie/{id}/similar` | 86400s | No |
| Admin: Add movie | `GET /movie/{id}` (triggered by admin selection) | — | Yes (explicit upsert) |
| Admin: Refresh | `GET /movie/{id}` (triggered by admin action) | — | Yes (forced upsert) |

---

## Consequences

**Positive:**
- TMDB API calls are minimized; Redis absorbs repeated searches from concurrent users.
- Movie detail pages (the most frequently accessed pages) are served entirely from PostgreSQL once a movie is catalogued, achieving NFR-001 (< 2s) and NFR-002 (< 500ms) without any TMDB dependency.
- Graceful degradation is built in at every layer (Redis → PostgreSQL → TMDB fallback chain).
- TMDB API key stays server-side; never exposed to clients (NFR-026).
- Rate limit protection prevents exceeding TMDB free-tier limits (CON-007).

**Negative:**
- Cache staleness: movies not in PostgreSQL rely on Redis (15min–1h TTL). A user searching for a newly released movie immediately after release may briefly see slightly stale TMDB data. Acceptable for v1.0.
- Background async refresh (stale-while-revalidate) adds complexity: the async task must not swamp the event loop or TMDB rate limiter. Implemented as a fire-and-forget job with error logging, not a blocking operation.
- Cold-start scenario (empty Redis + empty PostgreSQL + TMDB unavailable) results in degraded browse/search experience. Mitigated by: (a) Redis and PostgreSQL warm up quickly on first use, (b) the scenario requires simultaneous Redis emptiness + TMDB outage, which is unlikely in normal operation.

**Neutral:**
- The TMDB data model is transformed into the application's internal domain model before storage. TMDB breaking changes require updating the transformer only, not all downstream consumers.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| Direct proxy (no local persistence) | Simplest implementation; always fresh TMDB data; no PostgreSQL movie table needed | Every page load hits TMDB (or Redis); reviews/ratings cannot be joined to movie data in a single DB query; graceful degradation limited to Redis TTL only; TMDB unavailability = broken movie detail pages | NFR-041 (graceful degradation) and NFR-002 (< 500ms CRUD) are not achievable without local persistence |
| Full background sync (pre-populate all TMDB movies) | All data available locally; zero TMDB dependency at runtime | TMDB has ~900,000+ movies; syncing the full catalogue is impractical (days of TMDB API calls); not feasible on free tier; storage requirements excessive | Not feasible at TMDB free-tier rate limits; storage cost disproportionate |
| Hybrid with scheduled background sync (cron job) | Proactive cache warming for popular movies | Adds scheduler complexity; requires knowing which movies to pre-warm; over-engineering for v1.0 | Demand-driven caching (hybrid as decided) achieves the same benefit without a scheduler |

---

*Produced by solution-architect — 2026-05-23*
