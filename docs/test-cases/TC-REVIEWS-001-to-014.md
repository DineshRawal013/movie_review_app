# Test Cases — Reviews Module (TC-REVIEWS)

**Module:** ReviewsModule
**Owner:** qa-engineer
**Version:** 1.0
**Date:** 2026-05-23
**Covers:** FR-023, FR-024, FR-025, FR-026, FR-050–FR-058, FR-074

---

## TC-REVIEWS-001 — Detail Page Displays All Approved Reviews Sorted Newest-First

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-001 |
| **Title** | Movie detail page shows all approved community reviews sorted newest-first |
| **Requirement ID** | FR-023 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Movie "Fight Club" has 3 reviews: submitted at T1 (oldest), T2, T3 (newest).
- All 3 reviews are active (is_hidden=false, deleted_at=null).
- One hidden review (is_hidden=true) also exists for the same movie.

**Test Steps:**
1. Send GET `/api/movies/{movieId}/reviews` as unauthenticated user.
2. Verify HTTP 200 response.
3. Verify `data` array contains exactly 3 reviews (hidden review excluded).
4. Verify reviews are ordered newest-first: T3, T2, T1 (by `createdAt` descending).
5. Verify hidden review (is_hidden=true) is NOT included in the public response.
6. E2E: navigate to movie detail page; verify review list shows 3 reviews; newest at top.

**Expected Result:**
- Only active reviews (is_hidden=false, deleted_at=null) are returned.
- Reviews sorted newest-first.
- Hidden reviews excluded from public view.

---

## TC-REVIEWS-002 — Each Review Displays Reviewer Name, Avatar, Star Rating, Text, Date

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-002 |
| **Title** | Each review card shows reviewer name, avatar, star rating, review text, and submission date/time |
| **Requirement ID** | FR-024 |
| **Priority** | P0 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Review exists with known author (display_name="Alice Test", avatar_url set).
- Author has also submitted a rating (value=4) for the same movie.

**Test Steps:**
1. Send GET `/api/movies/{movieId}/reviews` (Integration).
2. Verify each review object in `data` contains: `id`, `user.displayName`, `user.avatarUrl`, `body`, `createdAt`, `updatedAt`.
3. Verify `user.displayName = "Alice Test"`.
4. E2E: navigate to movie detail page.
5. Verify Alice's review card shows: "Alice Test" (name), avatar image, star display (4/5), review text body, formatted submission date.
6. Verify avatar image has non-empty alt text (e.g., "Alice Test's profile picture").

**Expected Result:**
- All 5 required review fields visible on each review card.
- Avatar image has descriptive alt text.
- Date/time displayed in a human-readable format.

---

## TC-REVIEWS-003 — Guest Sees "Write a Review" Prompt with Sign-In Link

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-003 |
| **Title** | Movie detail page shows "Write a Review" prompt to Guests with sign-in link |
| **Requirement ID** | FR-025 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- User is unauthenticated (Guest).
- Application running.

**Test Steps:**
1. Navigate to a movie detail page as Guest.
2. Verify "Write a Review" prompt or CTA (call-to-action) visible in review section.
3. Verify the prompt contains a link or button pointing to `/login` (sign-in page).
4. Verify the review submission form is NOT visible (only the sign-in prompt).
5. Click the sign-in link; verify navigation to `/login`.

**Expected Result:**
- "Write a Review" prompt with sign-in link visible to Guests.
- Full review submission form not shown to unauthenticated users.

---

## TC-REVIEWS-004 — Review Submission Form Displayed Inline for Authenticated Users

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-004 |
| **Title** | Inline review submission form shown on movie detail page for authenticated users |
| **Requirement ID** | FR-026 |
| **Priority** | P1 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" is authenticated.
- Alice has NOT yet reviewed the movie (to show the form, not the edit form).

**Test Steps:**
1. Navigate to a movie detail page as Alice.
2. Verify the review submission form is visible inline on the page.
3. Verify form contains: text area (for review body) and submit button.
4. Verify live character counter is visible (FR-051).
5. Verify sign-in prompt is NOT shown (replaced by the form).

**Expected Result:**
- Review form displayed inline for authenticated users.
- Form contains all required UI elements.
- Sign-in prompt replaced by form for authenticated users.

---

## TC-REVIEWS-005 — Registered User Submits One Review Per Movie (Max 500 Chars)

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-005 |
| **Title** | Registered user can submit one text review per movie; max 500 characters enforced |
| **Requirement ID** | FR-050 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- User "Alice" authenticated; no prior review for movie "Fight Club".

**Test Steps:**
1. Send POST `/api/movies/{movieId}/reviews` with body `{ "body": "This is a great film." }` and Alice's auth.
2. Verify HTTP 201 Created.
3. Verify response contains review object with `id`, `body`, `createdAt`, `userId`.
4. Send a second POST for the same movie with the same user; verify HTTP 409 Conflict.
5. Send POST with a 500-character body (exact boundary); verify HTTP 201.
6. Send POST with a 501-character body; verify HTTP 422 Unprocessable Entity.
7. Verify error message: "Review cannot exceed 500 characters" (or equivalent).

**Expected Result:**
- First review submission returns 201.
- Second review for same movie returns 409.
- Exactly 500 chars accepted; 501 chars rejected with 422.

---

## TC-REVIEWS-006 — Review Form Shows Live Character Counter

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-006 |
| **Title** | Review submission form displays live character counter showing remaining characters |
| **Requirement ID** | FR-051 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Authenticated user on movie detail page with review form visible.

**Test Steps:**
1. Locate the review text area; verify character counter shows "500 characters remaining" (or "0/500").
2. Type "Hello" (5 characters) into text area.
3. Verify character counter updates to "495 remaining" (or "5/500").
4. Type 495 more characters to reach 500 total.
5. Verify counter shows "0 remaining" (or "500/500").
6. Verify counter turns red or warning colour at or near the limit (visual feedback — design system).
7. Type one more character (501st); verify input is NOT accepted (capped at 500 by frontend) OR counter shows negative/exceeded state.

**Expected Result:**
- Character counter updates in real time as user types.
- Counter reflects remaining characters (500 minus typed length).
- Visual warning applied at or near 500-character limit.

---

## TC-REVIEWS-007 — Submission Over 500 Chars Blocked Client-Side and Server-Side

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-007 |
| **Title** | Review exceeding 500 chars blocked by both client-side validation and server-side (HTTP 422) |
| **Requirement ID** | FR-052 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- User authenticated; review form visible (E2E).
- Review API endpoint accessible (Integration).

**Test Steps (Server-Side — Integration):**
1. Bypass frontend; send POST `/api/movies/{movieId}/reviews` with body length = 501 characters.
2. Verify HTTP 422 Unprocessable Entity.
3. Verify error response body includes message: "body must be shorter than or equal to 500 characters".

**Test Steps (Client-Side — E2E):**
1. Paste 501 characters into review text area.
2. Verify submit button is disabled OR clicking submit shows client-side validation error.
3. Verify error message displayed: "Review cannot exceed 500 characters" (or equivalent).
4. Verify no HTTP request sent to the server (network requests inspector shows no POST).

**Expected Result:**
- Server rejects 501+ char bodies with 422.
- Client prevents submission with visible error message.
- Both layers enforce the limit independently.

---

## TC-REVIEWS-008 — User Edits Own Review; Edit Timestamp Recorded and Displayed

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-008 |
| **Title** | User can edit own review; updated text saved; edit timestamp recorded and displayed |
| **Requirement ID** | FR-053 |
| **Priority** | P0 |
| **Test Type** | Integration + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Alice has an existing review (reviewId known) for "Fight Club".
- Original body: "Original review text."
- `created_at` = T1, `updated_at` = T1 (same at creation).

**Test Steps (Integration):**
1. Send PUT `/api/movies/{movieId}/reviews/{reviewId}` with body `{ "body": "Updated review text." }` and Alice's auth.
2. Verify HTTP 200.
3. Verify response contains updated `body = "Updated review text."`.
4. Verify `updatedAt` is greater than original `createdAt` (T2 > T1).
5. Attempt same edit with Bob's auth (different user); verify HTTP 403.

**Test Steps (E2E):**
1. Navigate to Alice's review card on movie detail page.
2. Click "Edit" button.
3. Modify text; save.
4. Verify updated text displayed on review card.
5. Verify "Edited" indicator with edit timestamp visible on review card.

**Expected Result:**
- Edit updates body and `updatedAt` timestamp.
- "Edited" indicator shown to public.
- Another user cannot edit Alice's review (403).

---

## TC-REVIEWS-009 — User Deletes Own Review; Deletion is Permanent

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-009 |
| **Title** | User can delete own review; review permanently removed |
| **Requirement ID** | FR-054 |
| **Priority** | P0 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- Alice has an existing review (reviewId known).

**Test Steps (Integration):**
1. Send DELETE `/api/movies/{movieId}/reviews/{reviewId}` with Alice's auth and CSRF token.
2. Verify HTTP 200 or 204.
3. Query database: verify `reviews` row for `reviewId` has `deleted_at` set (soft delete) or is fully deleted.
4. Send GET `/api/movies/{movieId}/reviews`; verify the deleted review is NOT in the response.
5. Attempt to delete a review with Bob's auth (not the owner); verify HTTP 403.

**Test Steps (E2E):**
1. Navigate to Alice's review card.
2. Click "Delete" button; confirm deletion in prompt (if present).
3. Verify review card disappears from page.
4. Reload page; verify review still absent.

**Expected Result:**
- Deleted review no longer appears in public review list.
- Soft-delete recorded in database (deleted_at set).
- Non-owner cannot delete another user's review (403).
- Deletion persists across page reloads.

---

## TC-REVIEWS-010 — New/Edited Reviews Appear Immediately on Page

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-010 |
| **Title** | Newly submitted or edited reviews appear on movie detail page immediately |
| **Requirement ID** | FR-055 |
| **Priority** | P0 |
| **Test Type** | E2E (Playwright) |
| **Status** | PLANNED |

**Preconditions:**
- Alice is authenticated; movie detail page open; Alice has not yet reviewed the movie.

**Test Steps:**
1. Submit a new review via the inline form.
2. Verify new review appears in the review list WITHOUT a full page navigation.
3. Verify new review appears at the top of the list (newest-first sort).
4. Edit the review via the edit form.
5. Verify updated review text visible without full page navigation.

**Expected Result:**
- New review appears in list immediately after submission (within 1 page refresh at most — SRS FR-055 wording).
- Edit updates review text visibly.
- No full page reload required (optimistic update or re-fetch acceptable).

---

## TC-REVIEWS-011 — Reviews Displayed Newest-First by Default

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-011 |
| **Title** | Reviews displayed in chronological order (newest first) by default |
| **Requirement ID** | FR-056 |
| **Priority** | P1 |
| **Test Type** | Integration |
| **Status** | PLANNED |

**Preconditions:**
- 3 reviews submitted in order: Review A (T1), Review B (T2), Review C (T3 = newest).

**Test Steps:**
1. Send GET `/api/movies/{movieId}/reviews`.
2. Verify first item in `data` array has `createdAt = T3`.
3. Verify second item has `createdAt = T2`.
4. Verify third item has `createdAt = T1`.
5. Send GET `/api/movies/{movieId}/reviews?page=1&limit=10`; verify same ordering.

**Expected Result:**
- Reviews sorted by `createdAt` descending (newest first) in all paginated responses.

---

## TC-REVIEWS-012 — Blank/Whitespace Review Rejected with Validation Error

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-012 |
| **Title** | Blank or whitespace-only review submission rejected with validation error |
| **Requirement ID** | FR-057 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) + E2E |
| **Status** | PLANNED |

**Preconditions:**
- User authenticated; review for the movie does not exist.

**Test Steps (Integration):**
1. Send POST `/api/movies/{movieId}/reviews` with `{ "body": "" }` (empty string).
2. Verify HTTP 422; error message contains "review text cannot be blank" or similar.
3. Send POST with `{ "body": "   " }` (whitespace only).
4. Verify HTTP 422; same error message.
5. Send POST with `{ "body": "\n\t\r" }` (whitespace characters only).
6. Verify HTTP 422.
7. Verify no review row created in database for any of the above attempts.

**Test Steps (E2E):**
1. Navigate to review form; submit with empty text area.
2. Verify client-side validation error shown: "Review text cannot be blank".
3. Verify submit button is disabled for empty input (if applicable by design).

**Expected Result:**
- Empty and whitespace-only submissions rejected with 422 server-side.
- Client-side validation prevents submission with helpful error message.

---

## TC-REVIEWS-013 — Deleted Reviews No Longer Appear in Public List

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-013 |
| **Title** | Deleted reviews do not appear in the public reviews list |
| **Requirement ID** | FR-058 |
| **Priority** | P0 |
| **Test Type** | Integration |
| **Status** | PLANNED |

**Preconditions:**
- Movie has 3 reviews: A (active), B (deleted — deleted_at set), C (active).

**Test Steps:**
1. Send GET `/api/movies/{movieId}/reviews` (unauthenticated).
2. Verify only 2 reviews returned (A and C).
3. Verify review B (with deleted_at set) is NOT in the response.
4. Send GET as authenticated Admin; verify Admin response also excludes hard-deleted reviews.
5. Verify review B does not appear at any pagination page.

**Expected Result:**
- Reviews with `deleted_at` set (soft-deleted) are excluded from all public responses.
- Admins also do not see soft-deleted reviews via the public endpoint (admin sees them via /admin/reviews with appropriate filtering).

---

## TC-REVIEWS-014 — Registered User Can Flag a Review as Inappropriate

| Field | Value |
|-------|-------|
| **ID** | TC-REVIEWS-014 |
| **Title** | Registered user can flag a review as inappropriate; flag appears in admin moderation queue |
| **Requirement ID** | FR-074 |
| **Priority** | P1 |
| **Test Type** | Integration (Supertest) |
| **Status** | PLANNED |

**Preconditions:**
- Review "reviewId" exists (active).
- User "Bob" is authenticated and has NOT flagged this review.

**Test Steps:**
1. Send POST `/api/reviews/{reviewId}/flag` with Bob's auth and CSRF token.
2. Verify HTTP 201 Created.
3. Query database: verify `review_flags` row exists with Bob's userId + reviewId.
4. Query database: verify `reviews.flag_count` incremented by 1 (DB trigger).
5. Send a second POST to `/api/reviews/{reviewId}/flag` by Bob; verify HTTP 409 Conflict (cannot flag twice).
6. Send GET `/api/admin/reviews` as Admin; verify the flagged review appears with `flagCount = 1`.
7. Unflag: send DELETE `/api/reviews/{reviewId}/flag` with Bob's auth.
8. Verify HTTP 204; `review_flags` row deleted; `flag_count` decremented.

**Expected Result:**
- Flag created successfully on first attempt.
- Duplicate flag by same user returns 409.
- `flag_count` incremented/decremented correctly via DB trigger.
- Flagged review highlighted in admin moderation queue.

---

*Produced by qa-engineer — 2026-05-23*
