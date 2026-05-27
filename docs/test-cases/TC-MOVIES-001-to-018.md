# Test Cases — Movies Module (TC-MOVIES)

**Module:** MoviesModule, TMDBModule
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** FR-001–FR-006, FR-010–FR-016, FR-020–FR-028

---

## TC-MOVIES-001 — Home/Browse Page Displays Movies from TMDB

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-001 |
| **Title** | Home/browse page displays a list of movies sourced from TMDB |
| **Requirement ID** | FR-001 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) + Integration |
| **Status** | PLANNED |

**Preconditions:**
- Application running with Docker Compose.
- At least 5 movies in local `movies` table (seeded or synced from TMDB mock).
- TMDB mock returns valid popular movies response.

**Test Steps:**
1. Send GET `/api/movies` (Integration); verify HTTP 200.
2. Verify response contains `data` array with at least one `MovieCard` object.
3. Verify `meta` object present with `page`, `limit`, `total`, `totalPages`.
4. E2E: navigate to `/` (home page).
5. Verify at least one movie card is visible on the page.
6. Verify page does not show an error state or blank content area.

**Expected Result:**
- API returns a paginated list of movies.
- Home page displays movie cards.
- No errors or blank states when movies are available.

---

## TC-MOVIES-002 — Browse Cards Display Poster, Title, Release Year, Avg Rating

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-002 |
| **Title** | Each movie card on browse page shows poster, title, release year, and community avg rating |
| **Requirement ID** | FR-002 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) + Integration |
| **Status** | PLANNED |

**Preconditions:**
- At least 2 movies in database: one with ratings (avg_rating > 0), one with no ratings.
- Application running.

**Test Steps:**
1. Send GET `/api/movies` (Integration).
2. Verify each item in `data` array has: `id`, `title`, `releaseDate`, `posterUrl`, `avgRating`, `ratingCount`.
3. For the movie with no ratings: verify `avgRating = 0` and `ratingCount = 0`.
4. E2E: navigate to home page.
5. Inspect movie card for a rated movie: verify poster image visible, title text visible, release year visible.
6. Inspect movie card for the rated movie: verify community rating displayed (e.g., "4.3").
7. Inspect movie card for the unrated movie: verify "No ratings yet" (or equivalent) displayed.
8. Verify poster image `alt` attribute is non-empty (accessibility — NFR-032).

**Expected Result:**
- Each card displays all 4 required fields (poster, title, year, rating).
- Unrated movies show "No ratings yet" text.
- Poster images have meaningful alt text.

---

## TC-MOVIES-003 — Browse Page Supports Pagination

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-003 |
| **Title** | Browse page supports pagination to load additional results |
| **Requirement ID** | FR-003 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- At least 25 movies in database (to test paging with default limit of 20).

**Test Steps:**
1. Send GET `/api/movies?page=1&limit=20`; verify 20 items returned, `meta.totalPages >= 2`.
2. Send GET `/api/movies?page=2&limit=20`; verify different 20 items returned (no overlap with page 1).
3. Send GET `/api/movies?page=999&limit=20` (beyond last page); verify empty `data` array, `meta.total` correct.
4. Send GET `/api/movies?limit=0`; verify HTTP 400 (invalid limit).
5. E2E: navigate to home page; verify pagination controls visible (next page button or page numbers).
6. E2E: click "next page" or scroll to load more; verify new movies appear.

**Expected Result:**
- Pagination works correctly; page 2 returns different results from page 1.
- Out-of-range page returns empty data array, not an error.
- UI pagination controls are visible and functional.

---

## TC-MOVIES-004 — "Trending/Popular" Section Sourced from TMDB

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-004 |
| **Title** | Home page displays "Trending" or "Popular" section sourced from TMDB popular endpoint |
| **Requirement ID** | FR-004 |
| **Priority** | P1 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to return specific movies for the `/movie/popular` endpoint.
- Cache is clear (no stale popular results).

**Test Steps:**
1. Send GET `/api/movies?sort=popular` (or the designated popular endpoint).
2. Verify HTTP 200; verify response data matches movies from TMDB mock popular response.
3. E2E: navigate to home page; verify "Popular" or "Trending" section label visible.
4. Verify movies in the section match what TMDB mock returned.
5. Request the same endpoint a second time; verify TMDB mock was NOT called again (cache hit in Redis — TC-NFR-003).

**Expected Result:**
- Popular movies sourced from TMDB and displayed on home page.
- Cache-aside logic prevents redundant TMDB API calls within TTL.

---

## TC-MOVIES-005 — "Top Rated" Section Sourced from TMDB

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-005 |
| **Title** | Home page displays "Top Rated" section from TMDB top-rated endpoint |
| **Requirement ID** | FR-005 |
| **Priority** | P2 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to return data for `/movie/top_rated`.

**Test Steps:**
1. Send GET `/api/movies?sort=top_rated`.
2. Verify HTTP 200; data matches TMDB mock top-rated response.
3. E2E: navigate to home page; verify "Top Rated" section present and shows expected movies.

**Expected Result:**
- Top Rated section displayed on home page sourced from TMDB top-rated endpoint.

---

## TC-MOVIES-006 — Graceful TMDB Unavailability: Cached Data or Error State

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-006 |
| **Title** | Browse page gracefully handles TMDB unavailability: serves cached data or shows informative error |
| **Requirement ID** | FR-006 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to return HTTP 503 (service unavailable).

**Scenario A — Stale cache available:**
1. Pre-populate Redis with stale cache entry for popular movies (key `tmdb:popular:1:stale`).
2. Send GET `/api/movies?sort=popular`; TMDB mock returns 503.
3. Verify HTTP 200; response contains stale cached data.
4. Verify log entry: "TMDB API unavailable; serving stale" (warn level).

**Scenario B — No cache available:**
1. Clear Redis cache; TMDB mock returns 503.
2. Send GET `/api/movies`; verify HTTP 200 (or 206) with empty data and an informative `message` field.
3. Verify response does NOT return HTTP 500 or an unhandled exception.
4. Verify no stack trace exposed in response body.

**Expected Result:**
- With stale cache: graceful degradation to stale data; no error to user.
- Without cache: informative message displayed; not a crash/500.

---

## TC-MOVIES-007 — Global Search Bar Returns Matching Movies

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-007 |
| **Title** | Search bar on all pages returns matching movies from TMDB/local catalogue |
| **Requirement ID** | FR-010 |
| **Priority** | P0 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- At least 3 movies in database with different titles (e.g., "Fight Club", "The Godfather", "Forrest Gump").
- TMDB mock configured to return search results for known queries.

**Test Steps:**
1. Send GET `/api/movies?q=Fight`; verify HTTP 200; `data` array contains "Fight Club".
2. Send GET `/api/movies?q=godfather`; verify "The Godfather" in results.
3. Send GET `/api/movies?q=xyz_no_match_12345`; verify empty `data` array; HTTP 200.
4. E2E: navigate to any page; locate search bar in header.
5. Type "Fight" into search bar; submit.
6. Verify search results page loads at `/movies?q=Fight`.
7. Verify "Fight Club" movie card appears in results.
8. Verify search bar is accessible from the /movies detail page (not just home page).

**Expected Result:**
- Search returns relevant movies matching the query.
- Global search bar accessible on all pages.
- Empty query returns no crash (empty results or default browse list).

---

## TC-MOVIES-008 — Search Results Display Within 2 Seconds

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-008 |
| **Title** | Search results display within 2 seconds of query submission |
| **Requirement ID** | FR-011, NFR-001 |
| **Priority** | P0 |
| **Test Type** | Performance (k6) |
| **Status** | PLANNED |

**Preconditions:**
- Docker Compose test environment running.
- Movies seeded with representative data.
- TMDB search responses cached (to test application logic, not TMDB network latency).

**Test Steps:**
1. Run k6 scenario: 10 VUs, 2-minute duration, each VU sends GET `/api/movies?q=action`.
2. Record p50, p90, p95, p99 response times.
3. Record error rate.

**Expected Result:**
- p95 response time < 2000ms.
- p99 response time < 3000ms.
- Error rate < 1%.

---

## TC-MOVIES-009 — Search Results Use Same Movie Card Format as Browse

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-009 |
| **Title** | Search result cards are identical in format to browse cards |
| **Requirement ID** | FR-012 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- At least 1 movie matches a search query.
- Application running.

**Test Steps:**
1. Navigate to home page; inspect a browse movie card; note all displayed fields.
2. Enter a search query; submit.
3. Navigate to search results page; inspect a search result movie card.
4. Verify search result card displays same fields as browse card: poster image, title, release year, avg rating.
5. Verify same CSS class names or component structure used (code review or visual inspection).

**Expected Result:**
- Search result cards are visually and structurally identical to browse cards.
- All 4 required fields present on both card types.

---

## TC-MOVIES-010 — Filter by Genre and Release Year Range

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-010 |
| **Title** | Filter search results and browse page by genre and release year range |
| **Requirement ID** | FR-013 |
| **Priority** | P1 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Movies in database: "Fight Club" (1999, Drama/Thriller), "Toy Story" (1995, Animation/Family).
- Genre seeds applied (migration 004).

**Test Steps:**
1. Send GET `/api/movies?genre=18` (Drama genre tmdb_genre_id=18).
2. Verify "Fight Club" in results; "Toy Story" NOT in results.
3. Send GET `/api/movies?yearFrom=1990&yearTo=1999`.
4. Verify both movies in results (both are 1990s).
5. Send GET `/api/movies?yearFrom=2000&yearTo=2024`.
6. Verify neither 1990s movie in results.
7. Send GET `/api/movies?genre=18&yearFrom=1995&yearTo=2000`.
8. Verify only "Fight Club" in results (1999 Drama).
9. E2E: navigate to browse page; apply genre filter; verify filter chip/indicator shown.
10. E2E: remove genre filter; verify full unfiltered results restored.

**Expected Result:**
- Genre filter correctly limits results.
- Year range filter correctly limits results.
- Combined filters work correctly.
- UI displays active filter indicators.

---

## TC-MOVIES-011 — Active Filters Visually Indicated and Individually Removable

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-011 |
| **Title** | Active filters visually indicated in UI and individually removable |
| **Requirement ID** | FR-014 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Browse page loaded with at least 10 movies.
- Two filters can be applied (genre + year).

**Test Steps:**
1. Navigate to browse page.
2. Apply genre filter "Action" and year filter "2000–2020".
3. Verify filter chips/tags visible for both active filters.
4. Verify filtered results shown (fewer movies than unfiltered).
5. Click the "X" / remove button on the "Action" genre filter chip.
6. Verify "Action" filter removed; year filter "2000–2020" still active.
7. Verify movie count in results changes to reflect only year filter active.
8. Click remove on year filter; verify all movies shown (no active filters).

**Expected Result:**
- Each active filter is visually indicated.
- Each filter can be removed independently without affecting other active filters.
- Results update correctly after each filter removal.

---

## TC-MOVIES-012 — Sort Browse/Search Results

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-012 |
| **Title** | Sort browse and search results by community rating, release year, and title |
| **Requirement ID** | FR-015 |
| **Priority** | P2 |
| **Test Type** | Integration |
| **Status** | PLANNED |

**Preconditions:**
- At least 5 movies with different avg_rating, release_date, and title values.

**Test Steps:**
1. Send GET `/api/movies?sort=rating_desc`; verify results sorted by `avgRating` descending.
2. Send GET `/api/movies?sort=year_desc`; verify results sorted by `releaseDate` descending (newest first).
3. Send GET `/api/movies?sort=year_asc`; verify results sorted by `releaseDate` ascending (oldest first).
4. Send GET `/api/movies?sort=title_asc`; verify results sorted alphabetically by title.

**Expected Result:**
- Each sort option produces correctly ordered results.
- Ties in sort key handled consistently (secondary sort by id for determinism).

---

## TC-MOVIES-013 — Empty Search Results Show Informative Message

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-013 |
| **Title** | Search query returning no results shows informative empty-state message |
| **Requirement ID** | FR-016 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to return 0 results for query "xyzqwertyuiop_no_match".

**Test Steps:**
1. Navigate to search bar; enter "xyzqwertyuiop_no_match"; submit.
2. Verify search results page loads (no error page or 404).
3. Verify empty-state message displayed (e.g., 'No movies found for "xyzqwertyuiop_no_match"').
4. Verify no blank white area — UI handles empty state gracefully.
5. Verify search bar still contains the query text (user can modify and re-search).

**Expected Result:**
- Empty state message is clearly displayed.
- No blank or error page.
- Search bar retains query text for easy modification.

---

## TC-MOVIES-014 — Each Movie Has a Unique URL Detail Page

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-014 |
| **Title** | Each movie has a dedicated detail page at a unique URL |
| **Requirement ID** | FR-020 |
| **Priority** | P0 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Movie "Fight Club" exists in database with known `id` (UUID).

**Test Steps:**
1. Send GET `/api/movies/{fightClubId}`; verify HTTP 200.
2. E2E: navigate to `/movies/{fightClubId}`.
3. Verify page loads; URL is unique to this movie.
4. Navigate to a different movie's detail page; verify different URL and different content.
5. Send GET `/api/movies/non-existent-uuid`; verify HTTP 404.

**Expected Result:**
- Each movie has a unique, bookmarkable URL.
- Valid movie ID returns 200 with movie details.
- Invalid movie ID returns 404.

---

## TC-MOVIES-015 — Movie Detail Page Displays All Required TMDB Metadata

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-015 |
| **Title** | Movie detail page displays title, poster, backdrop, release date, runtime, genres, synopsis, director, and main cast |
| **Requirement ID** | FR-021 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) + Integration |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" (tmdb_id=550) in database with full metadata populated.

**Test Steps:**
1. Send GET `/api/movies/{fightClubId}` (Integration).
2. Verify response contains: `title`, `posterUrl`, `backdropUrl`, `releaseDate`, `runtime`, `genres` (array), `overview`, `director`, `cast` (array), `trailerUrl`.
3. E2E: navigate to `/movies/{fightClubId}`.
4. Verify title "Fight Club" visible on page.
5. Verify poster image displayed with non-empty alt text.
6. Verify backdrop image displayed (or graceful absence if null).
7. Verify release date displayed (formatted as human-readable date).
8. Verify runtime displayed (e.g., "139 min").
9. Verify at least one genre chip/label visible (e.g., "Drama").
10. Verify synopsis/overview text visible.
11. Verify director name visible.
12. Verify at least one cast member name visible.

**Expected Result:**
- All 9 required metadata fields displayed on detail page.
- Poster and backdrop images have descriptive alt text.
- Fields with null values (optional fields) handled gracefully (hidden or placeholder shown).

---

## TC-MOVIES-016 — Detail Page Shows Aggregate Rating (Mean, 1dp) and Total Count

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-016 |
| **Title** | Movie detail page displays aggregate community star rating (arithmetic mean, 1 decimal place) and total rating count |
| **Requirement ID** | FR-022 |
| **Priority** | P0 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" has 3 ratings: 4, 5, 4 → mean = 4.333... → displayed as 4.3.
- DB trigger has recalculated `avg_rating = 4.33`, `rating_count = 3`.

**Test Steps:**
1. Send GET `/api/movies/{fightClubId}` (Integration).
2. Verify `avgRating = 4.3` (rounded to 1 decimal, as per SRS FR-022).
3. Verify `ratingCount = 3`.
4. E2E: navigate to detail page.
5. Verify "4.3" (or "4.3 / 5") displayed as aggregate rating.
6. Verify "(3 ratings)" or equivalent count displayed.
7. Add a 4th rating (value=2) via API; reload detail page.
8. Verify new aggregate: (4+5+4+2)/4 = 3.75 → displayed as "3.8".
9. Verify ratingCount updated to 4.

**Expected Result:**
- Aggregate rating is arithmetic mean rounded to 1 decimal place.
- Rating count reflects actual number of ratings.
- Display updates after new rating submitted.

---

## TC-MOVIES-017 — Detail Page Links to YouTube Trailer if Available

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-017 |
| **Title** | Movie detail page displays link to YouTube trailer when available |
| **Requirement ID** | FR-027 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- One movie in database with `trailer_url` set (YouTube URL).
- One movie in database with `trailer_url = NULL`.

**Test Steps:**
1. Navigate to detail page of movie with trailer.
2. Verify "Watch Trailer" link or play button visible.
3. Verify link href points to a YouTube URL (`youtube.com/watch?v=...`).
4. Navigate to detail page of movie without trailer.
5. Verify trailer link/button is NOT visible (not shown when unavailable).

**Expected Result:**
- Trailer link shown when `trailer_url` is populated.
- Trailer link hidden gracefully when no trailer available.
- Link target is the correct YouTube URL.

---

## TC-MOVIES-018 — Detail Page Shows Related/Similar Movies

| Field | Value |
|-------|-------|
| **ID** | TC-MOVIES-018 |
| **Title** | Movie detail page displays related/similar movies from TMDB |
| **Requirement ID** | FR-028 |
| **Priority** | P2 |
| **Test Type** | Integration + E2E |
| **Status** | DEFERRED (v2.0) |

> **Deferred:** FR-028 has no corresponding endpoint in the approved api-spec.yaml (v1.0). Adding a `/movies/{id}/similar` endpoint post-Phase-4 requires a formal Change Request. This test case is out of scope for v1.0 and will be reinstated when FR-028 is implemented in a future version.

**Preconditions:**
- TMDB mock returns 3 similar movies for "Fight Club".
- Application running.

**Test Steps:**
1. Navigate to "Fight Club" detail page.
2. Verify "Similar Movies" or "You May Also Like" section visible.
3. Verify at least 1 similar movie card displayed.
4. Verify similar movie cards are clickable and navigate to the respective detail pages.
5. If TMDB returns 0 similar movies: verify section is hidden or shows "No similar movies found".

**Expected Result:**
- Similar movies section displayed with TMDB data when available.
- Section gracefully hidden when no similar movies exist.
- Similar movie cards are functional links.

---

*Produced by qa-engineer — 2026-05-23*
