# Test Cases — Admin Module (TC-ADMIN)

**Module:** AdminModule, ReviewsModule, MoviesModule
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** FR-070–FR-076, FR-080–FR-085

---

## TC-ADMIN-001 — Admin Views Moderation Queue (All, Flagged, Recent)

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-001 |
| **Title** | Admin can view moderation queue filterable by all, flagged, and recent |
| **Requirement ID** | FR-070 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Admin user authenticated.
- 5 reviews exist: 2 active (unflagged), 2 active (1 flag each), 1 hidden.
- Non-admin authenticated user "Bob" exists.

**Test Steps:**
1. Send GET `/api/admin/reviews` with Admin auth; verify HTTP 200.
2. Verify `data` array contains all non-deleted reviews (active + hidden = 5, if deleted_at is null for all).
3. Hidden review IS included in admin queue (is_hidden=true but deleted_at=null).
4. Send GET `/api/admin/reviews?filter=flagged`; verify only reviews with `flag_count > 0` returned (2 reviews).
5. Send GET `/api/admin/reviews?filter=recent`; verify reviews sorted by `created_at` descending.
6. Send GET `/api/admin/reviews` with Bob's (non-admin) auth; verify HTTP 403.
7. E2E: navigate to `/admin/moderation`; verify moderation queue table rendered with review rows.

**Expected Result:**
- Admin sees all non-deleted reviews including hidden ones.
- Filter by "flagged" returns only flagged reviews.
- Non-admin receives 403.
- Admin panel renders moderation queue correctly.

---

## TC-ADMIN-002 — Admin Permanently Deletes Any Review

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-002 |
| **Title** | Admin can delete any review permanently, regardless of author |
| **Requirement ID** | FR-071 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Review "reviewId" by Alice exists (active).
- Admin user authenticated.

**Test Steps:**
1. Send DELETE `/api/admin/reviews/{reviewId}` with Admin auth and CSRF token.
2. Verify HTTP 200 or 204.
3. Query database: verify `reviews.deleted_at` is set for `reviewId` (soft delete by admin).
4. Send GET `/api/movies/{movieId}/reviews` (public); verify review NOT in list.
5. Send GET `/api/admin/reviews`; verify review also absent from admin queue (deleted_at set).
6. Verify audit log entry created: query `audit_log` for `action_type = 'REVIEW_DELETED'`, `target_review_id = reviewId`, `admin_user_id = adminId`.
7. Send DELETE with Bob (non-admin) auth; verify HTTP 403.
8. E2E: navigate to moderation queue; click "Delete" on a review; confirm; verify row disappears.

**Expected Result:**
- Review soft-deleted (`deleted_at` set).
- Audit log entry created for admin delete action.
- Public review list no longer shows deleted review.
- Non-admin cannot use this endpoint (403).

---

## TC-ADMIN-003 — Admin Hides (Soft-Deletes) a Review

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-003 |
| **Title** | Admin can hide a review making it invisible to public but recoverable |
| **Requirement ID** | FR-072 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Review "reviewId" by Alice is ACTIVE (`is_hidden=false`, `deleted_at=null`).
- Admin user authenticated.

**Test Steps:**
1. Send PATCH `/api/admin/reviews/{reviewId}` with body `{ "action": "hide" }` and Admin auth + CSRF.
2. Verify HTTP 200.
3. Query database: verify `reviews.is_hidden = true` for `reviewId`.
4. Verify `reviews.deleted_at` is still NULL (not a hard delete).
5. Send GET `/api/movies/{movieId}/reviews` (public, unauthenticated); verify review NOT in results.
6. Send GET `/api/admin/reviews`; verify hidden review IS in admin queue with `isHidden = true`.
7. Verify audit log entry: `action_type = 'REVIEW_HIDDEN'`, `target_review_id = reviewId`, `admin_user_id = adminId`.

**Expected Result:**
- Review is_hidden set to true.
- Hidden review not visible to public.
- Hidden review visible in admin queue.
- Audit log records the action.

---

## TC-ADMIN-004 — Admin Restores a Soft-Hidden Review

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-004 |
| **Title** | Admin can restore a soft-hidden review; review becomes publicly visible again |
| **Requirement ID** | FR-073 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Review "reviewId" is HIDDEN (`is_hidden=true`, `deleted_at=null`).
- Admin user authenticated.

**Test Steps:**
1. Send PATCH `/api/admin/reviews/{reviewId}` with body `{ "action": "restore" }` and Admin auth + CSRF.
2. Verify HTTP 200.
3. Query database: verify `reviews.is_hidden = false` for `reviewId`.
4. Verify `reviews.deleted_at` still NULL.
5. Send GET `/api/movies/{movieId}/reviews` (public); verify review IS now visible in results.
6. Verify audit log entry: `action_type = 'REVIEW_RESTORED'`, `target_review_id = reviewId`, `admin_user_id = adminId`.
7. Attempt to restore a DELETED review (`deleted_at` set); verify HTTP 400 (terminal state, no transitions out).

**Expected Result:**
- Restored review becomes publicly visible.
- `is_hidden = false` after restore.
- Audit log records restore action.
- Cannot restore a permanently deleted review (terminal state).

---

## TC-ADMIN-005 — Admin Moderation Queue Shows Flag Count Per Review

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-005 |
| **Title** | Admin moderation queue displays open flag count for each review |
| **Requirement ID** | FR-075 |
| **Priority** | P1 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Review "reviewId" has 3 flags from 3 different users.
- `reviews.flag_count = 3` (set by DB trigger).
- Admin authenticated.

**Test Steps:**
1. Send GET `/api/admin/reviews`; verify the review object includes `flagCount: 3`.
2. E2E: navigate to admin moderation queue; verify "3 flags" (or equivalent) shown next to the review.
3. Verify flag count is visually distinct for flagged reviews (e.g., badge, highlighting).
4. Send GET `/api/admin/reviews?sort=flag_count_desc`; verify most-flagged reviews appear first.

**Expected Result:**
- `flagCount` field present and accurate in admin API response.
- Flag count displayed per review in admin UI.
- Sort by flag count works.

---

## TC-ADMIN-006 — All Admin Moderation Actions Recorded in Audit Log

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-006 |
| **Title** | Every admin-initiated moderation action (delete, hide, restore) is recorded in audit log |
| **Requirement ID** | FR-076 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Admin authenticated; various reviews available to moderate.

**Test Steps:**
1. Perform REVIEW_DELETED action (TC-ADMIN-002 step 1).
2. Query `audit_log`: verify entry with `action_type='REVIEW_DELETED'`, `target_review_id` set, `admin_user_id` set, `created_at` recent.
3. Perform REVIEW_HIDDEN action (TC-ADMIN-003 step 1).
4. Query `audit_log`: verify entry with `action_type='REVIEW_HIDDEN'`.
5. Perform REVIEW_RESTORED action (TC-ADMIN-004 step 1).
6. Query `audit_log`: verify entry with `action_type='REVIEW_RESTORED'`.
7. Attempt to UPDATE or DELETE an existing audit_log row directly via API; verify no such endpoint exists (audit log is append-only).
8. Send GET `/api/admin/audit-log` with Admin auth; verify all 3 entries visible.

**Expected Result:**
- Audit log entry created for every moderation action.
- Each entry contains: action_type, target_review_id, admin_user_id, created_at.
- Audit log is append-only (no update/delete endpoints).

---

## TC-ADMIN-007 — Admin Adds Movie from TMDB Search

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-007 |
| **Title** | Admin adds a movie from TMDB search; metadata cached locally and movie becomes discoverable |
| **Requirement ID** | FR-080 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- TMDB mock configured to return "Inception" (tmdb_id=27205) for search query "Inception".
- "Inception" does NOT yet exist in local `movies` table.
- Admin authenticated.

**Test Steps:**
1. Send POST `/api/admin/movies` with body `{ "tmdbId": 27205 }` and Admin auth + CSRF.
2. Verify HTTP 201 Created.
3. Query database: verify new `movies` row with `tmdb_id = 27205`, `title = "Inception"`, `cached_at` set.
4. Verify `movie_genres` rows created for Inception's genres.
5. Send GET `/api/movies?q=Inception`; verify "Inception" appears in search results.
6. Send POST with same tmdbId again; verify HTTP 409 Conflict (already exists).
7. Send POST with non-existent TMDB ID (TMDB mock returns 404); verify HTTP 404.
8. Verify audit log entry: `action_type = 'MOVIE_ADDED'`, `target_movie_id` set, `admin_user_id = adminId`.
9. E2E: navigate to `/admin/movies/add`; search for "Inception"; confirm; verify success message.

**Expected Result:**
- Movie added to local catalogue from TMDB.
- Duplicate addition returns 409.
- Invalid TMDB ID returns 404.
- Audit log records MOVIE_ADDED action.
- Movie discoverable in browse/search.

---

## TC-ADMIN-008 — Admin Triggers Metadata Refresh for Catalogued Movie

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-008 |
| **Title** | Admin can trigger TMDB metadata refresh for any catalogued movie |
| **Requirement ID** | FR-081 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" exists in database with stale `cached_at` (e.g., 2 days ago).
- TMDB mock returns updated metadata for tmdb_id=550 (e.g., updated overview).
- Admin authenticated.

**Test Steps:**
1. Record current `cached_at` value for Fight Club.
2. Send POST `/api/admin/movies/{movieId}/sync` with Admin auth + CSRF.
3. Verify HTTP 200.
4. Query database: verify `movies.cached_at` is updated (> original `cached_at`).
5. Verify updated metadata saved (if TMDB mock returns different data, verify change reflected in DB).
6. Verify audit log entry: `action_type = 'MOVIE_SYNCED'`, `target_movie_id` set.
7. Send POST with non-existent movieId; verify HTTP 404.
8. Send POST without admin auth; verify HTTP 403.

**Expected Result:**
- `cached_at` updated after sync.
- Latest TMDB metadata saved locally.
- Audit log records MOVIE_SYNCED.
- Non-admin receives 403.

---

## TC-ADMIN-009 — Admin Removes Movie; Requires Confirmation; Cascades Reviews/Ratings

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-009 |
| **Title** | Admin removes a movie from catalogue; confirmation required; all associated reviews and ratings removed |
| **Requirement ID** | FR-082 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" has 3 reviews and 5 ratings.
- Admin authenticated.

**Test Steps (Integration):**
1. Send DELETE `/api/admin/movies/{movieId}` with Admin auth + CSRF.
2. Verify HTTP 200 or 204.
3. Query database: verify `movies` row for Fight Club is DELETED (hard delete).
4. Query `reviews`: verify all 3 reviews for fightClub are DELETED (cascade).
5. Query `ratings`: verify all 5 ratings for fightClub are DELETED (cascade).
6. Send GET `/api/movies/{movieId}`; verify HTTP 404.
7. Send GET `/api/movies?q=Fight`; verify "Fight Club" no longer in results.
8. Verify audit log: `action_type = 'MOVIE_DELETED'`, `target_movie_id` set (or null post-cascade), `admin_user_id` set.

**Test Steps (E2E — confirmation dialog):**
1. Navigate to `/admin/movies`.
2. Click "Remove" on a movie.
3. Verify confirmation dialog appears ("Are you sure? This will permanently delete the movie and all its reviews and ratings.").
4. Click "Cancel"; verify movie is still present.
5. Click "Remove" again; click "Confirm".
6. Verify movie removed from list.

**Expected Result:**
- Movie and all associated reviews/ratings cascade-deleted.
- Confirmation prompt shown in UI before deletion.
- Audit log records MOVIE_DELETED.
- Movie no longer discoverable after deletion.

---

## TC-ADMIN-010 — Admin Can Add Editorial Note to Movie

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-010 |
| **Title** | Admin can add or update an editorial note on any movie detail page |
| **Requirement ID** | FR-083 |
| **Priority** | P2 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- "Fight Club" in database with `editorial_note = null`.
- Admin authenticated.

**Test Steps:**
1. Send PUT `/api/admin/movies/{movieId}` with body `{ "editorialNote": "Classic Fincher film." }` and Admin auth.
2. Verify HTTP 200.
3. Query database: verify `movies.editorial_note = "Classic Fincher film."`.
4. Send GET `/api/movies/{movieId}`; verify `editorialNote` field in response.
5. Send PUT with `{ "editorialNote": null }` to clear; verify note cleared.
6. Verify audit log: `action_type = 'MOVIE_UPDATED'`, `target_movie_id` set.

**Expected Result:**
- Editorial note stored and returned in movie detail response.
- Note can be cleared (set to null).
- Audit log records MOVIE_UPDATED.

---

## TC-ADMIN-011 — Admin Can Promote and Demote Users

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-011 |
| **Title** | Admin can promote a registered user to admin or revoke admin status via admin panel |
| **Requirement ID** | FR-084 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Admin (adminId) is authenticated; there are 2 admins in the system (adminId, admin2Id).
- Regular user "Bob" (bobId) with `is_admin = false`.

**Test Steps (Promote):**
1. Send PATCH `/api/admin/users/{bobId}/role` with body `{ "isAdmin": true }` and Admin auth.
2. Verify HTTP 200.
3. Query database: verify `users.is_admin = true` for Bob.
4. Verify audit log: `action_type = 'USER_PROMOTED'`, `target_user_id = bobId`.
5. Verify Bob can now access admin endpoints (send GET `/api/admin/reviews` with Bob's token; verify 200).

**Test Steps (Demote):**
1. Send PATCH `/api/admin/users/{bobId}/role` with body `{ "isAdmin": false }` and Admin auth.
2. Verify HTTP 200.
3. Query database: verify `users.is_admin = false` for Bob.
4. Verify audit log: `action_type = 'USER_DEMOTED'`, `target_user_id = bobId`.
5. Verify Bob can no longer access admin endpoints (403).

**Test Steps (Non-admin attempt):**
1. Send PATCH `/api/admin/users/{bobId}/role` with Bob's (non-admin) auth; verify HTTP 403.

**Expected Result:**
- Admin can promote/demote users.
- Promoted user gains admin access immediately.
- Demoted user loses admin access immediately.
- Audit log records USER_PROMOTED and USER_DEMOTED.

---

## TC-ADMIN-012 — Admin Cannot Revoke Own Status if Sole Admin

| Field | Value |
|-------|-------|
| **ID** | TC-ADMIN-012 |
| **Title** | Admin cannot revoke their own admin status when they are the only remaining admin |
| **Requirement ID** | FR-085 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Only ONE admin exists in the system (adminId).
- Admin authenticated.

**Test Steps:**
1. Send PATCH `/api/admin/users/{adminId}/role` with body `{ "isAdmin": false }` (self-demotion) and Admin auth.
2. Verify HTTP 400 Bad Request.
3. Verify error message: "Cannot revoke admin status: you are the only administrator" (or equivalent).
4. Query database: verify `users.is_admin = true` still for adminId (no change made).
5. Verify no audit log entry created for this failed action.

**Test Steps (Two admins — self-demotion allowed):**
1. Ensure 2 admins exist (adminId and admin2Id).
2. Send PATCH `/api/admin/users/{adminId}/role` with `{ "isAdmin": false }` for self-demotion.
3. Verify HTTP 200 (allowed since another admin exists).
4. Query: verify `adminId.is_admin = false`; `admin2Id.is_admin = true`.

**Test Steps (Demote other admin when sole admin would result):**
1. With only 1 admin (adminId), attempt to demote any other existing admin who is the last second admin.
2. Ensure same guard prevents creating a system with 0 admins.

**Expected Result:**
- Self-demotion blocked when sole admin (HTTP 400 with clear message).
- Self-demotion allowed when multiple admins exist.
- System can never reach a state of 0 admins.
- Failed demotion leaves database state unchanged.

---

*Produced by qa-engineer — 2026-05-23*
