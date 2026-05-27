# Test Cases — Ratings Module (TC-RATINGS)

**Module:** RatingsModule
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** FR-040–FR-045

---

## TC-RATINGS-001 — Registered User Submits One Star Rating (1–5) Per Movie

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-001 |
| **Title** | Registered user can submit one star rating (integer 1–5) per movie |
| **Requirement ID** | FR-040 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" is authenticated.
- Movie "Fight Club" (movieId known) has no existing rating from Alice.

**Test Steps:**
1. Send POST `/api/movies/{movieId}/rating` with body `{ "value": 4 }` and Alice's auth + CSRF token.
2. Verify HTTP 201 Created.
3. Verify response contains: `userId` (Alice's), `movieId`, `value: 4`, `createdAt`.
4. Query database: verify `ratings` row exists with `user_id=Alice`, `movie_id=fightClub`, `value=4`.
5. Send POST with `value = 0`; verify HTTP 422 (below minimum).
6. Send POST with `value = 6`; verify HTTP 422 (above maximum).
7. Send POST with `value = 2.5`; verify HTTP 422 (non-integer).
8. Send POST without authentication; verify HTTP 401.

**Expected Result:**
- Valid rating (1–5 integer) saved successfully.
- Values 0, 6, and non-integer values rejected with 422.
- Unauthenticated request rejected with 401.

---

## TC-RATINGS-002 — User Can Update Existing Rating; Previous Value Replaced

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-002 |
| **Title** | User can update an existing rating for a movie; new value replaces previous |
| **Requirement ID** | FR-041 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Alice has an existing rating of 4 for "Fight Club" (rating row with value=4 exists).

**Test Steps:**
1. Send POST `/api/movies/{movieId}/rating` with body `{ "value": 2 }` and Alice's auth.
2. Verify HTTP 200 (upsert — update existing) or 201.
3. Verify response contains `value: 2`.
4. Query database: verify exactly ONE `ratings` row for (Alice, fightClub); `value = 2`.
5. Verify old value (4) no longer stored.
6. Send GET `/api/movies/{movieId}/rating/me` with Alice's auth; verify response `value = 2`.

**Expected Result:**
- Second rating submission updates the existing rating (upsert behavior).
- Only one rating row per user per movie in database.
- GET /rating/me confirms updated value.

---

## TC-RATINGS-003 — Aggregate Community Rating Recalculated in Real Time

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-003 |
| **Title** | Aggregate community rating recalculated in real time whenever rating submitted or updated |
| **Requirement ID** | FR-042 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" has 0 ratings initially (`avg_rating = 0.00`, `rating_count = 0`).

**Test Steps:**
1. Alice submits rating `value = 4`.
2. Send GET `/api/movies/{movieId}`; verify `avgRating = 4.0`, `ratingCount = 1`.
3. Bob submits rating `value = 2`.
4. Send GET `/api/movies/{movieId}`; verify `avgRating = 3.0` (mean of 4+2 = 3.0), `ratingCount = 2`.
5. Alice updates rating to `value = 5`.
6. Send GET `/api/movies/{movieId}`; verify `avgRating = 3.5` (mean of 5+2 = 3.5), `ratingCount = 2`.
7. Verify the movie detail page reflects updated aggregate (E2E: reload page after rating update).

**Expected Result:**
- `avg_rating` recalculated by DB trigger immediately after each INSERT or UPDATE on ratings.
- `rating_count` stays accurate throughout.
- API response reflects updated values.

---

## TC-RATINGS-004 — User Can Delete Own Rating

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-004 |
| **Title** | Registered user can delete their own rating; contribution removed from aggregate |
| **Requirement ID** | FR-043 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Alice has rating `value = 4`; Bob has rating `value = 2`.
- `avg_rating = 3.0`, `rating_count = 2`.

**Test Steps:**
1. Send DELETE `/api/movies/{movieId}/rating` with Alice's auth and CSRF token.
2. Verify HTTP 200 or 204.
3. Query database: verify Alice's rating row is deleted (hard delete, not soft delete).
4. Send GET `/api/movies/{movieId}`; verify `avgRating = 2.0` (only Bob's rating remains), `ratingCount = 1`.
5. Send DELETE `/api/movies/{movieId}/rating` again for Alice (no rating exists); verify HTTP 404.
6. Send DELETE without authentication; verify HTTP 401.

**Expected Result:**
- Rating deleted; aggregate recalculated immediately.
- Deleting a non-existent rating returns 404.
- Unauthenticated delete returns 401.

---

## TC-RATINGS-005 — Star Rating UI: Interactive, Accessible, WCAG AA Contrast

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-005 |
| **Title** | Star rating UI is interactive, visually distinct, and meets WCAG 2.1 AA contrast requirements |
| **Requirement ID** | FR-044, NFR-030, NFR-031 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright + axe-core) |
| **Status** | PLANNED |

**Preconditions:**
- Authenticated user on movie detail page with star rating widget visible.

**Test Steps:**
1. Verify star rating widget is visible (5 star icons).
2. Hover over star 3; verify stars 1, 2, 3 appear "filled" (hover state).
3. Click star 4; verify visual confirmation (stars 1–4 filled).
4. Keyboard navigation: tab to star rating widget; verify focus indicator visible.
5. Use arrow keys (or Tab) to navigate between stars; verify each star is focusable.
6. Press Enter/Space on star 5; verify rating submitted.
7. Verify all star icons have ARIA labels (e.g., "Rate 1 star", "Rate 5 stars").
8. Run axe-core on the page; verify zero colour contrast violations for star icons.

**Expected Result:**
- Star rating widget is fully keyboard-navigable.
- ARIA labels present on all star elements.
- Hover and active states visually distinct.
- No WCAG AA colour contrast violations.

---

## TC-RATINGS-006 — Ratings Independent of Text Reviews

| Field | Value |
|-------|-------|
| **ID** | TC-RATINGS-006 |
| **Title** | A star rating can be submitted independently without accompanying a text review |
| **Requirement ID** | FR-045 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Alice is authenticated.
- Alice has NOT submitted a review for "Fight Club".

**Test Steps:**
1. Send POST `/api/movies/{movieId}/rating` with `{ "value": 5 }` — NO review submitted.
2. Verify HTTP 201.
3. Query database: verify `ratings` row exists for Alice + fightClub.
4. Query database: verify NO `reviews` row exists for Alice + fightClub (rating submitted without review).
5. Send GET `/api/movies/{movieId}`; verify `avgRating = 5.0`, `ratingCount = 1`.
6. Send GET `/api/movies/{movieId}/reviews`; verify no review from Alice in the list.
7. Conversely: Alice submits a review WITHOUT a rating.
8. Query: verify `reviews` row exists; NO `ratings` row for Alice (if she had no prior rating).

**Expected Result:**
- Rating can be submitted without a review.
- Review can be submitted without a rating.
- Both are stored independently in separate tables.
- Aggregate rating reflects only submitted ratings, not reviews.

---

*Produced by qa-engineer — 2026-05-23*
