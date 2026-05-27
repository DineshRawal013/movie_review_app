# Software Requirements Specification — Movie Review Application

**Document ID:** SRS-1.0
**Owner:** product-manager
**Status:** DRAFT — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Product Owner:** rawaldinesh13@dsu.ac.kr
**Prepared by:** product-manager (Phase 2 — Requirements)

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Stakeholders and User Roles](#2-stakeholders-and-user-roles)
3. [Functional Requirements](#3-functional-requirements)
   - 3.1 [Movie Browsing and Discovery](#31-movie-browsing-and-discovery)
   - 3.2 [Movie Search and Filtering](#32-movie-search-and-filtering)
   - 3.3 [Movie Detail Page](#33-movie-detail-page)
   - 3.4 [User Authentication (Google OAuth)](#34-user-authentication-google-oauth)
   - 3.5 [Star Ratings](#35-star-ratings)
   - 3.6 [Text Reviews](#36-text-reviews)
   - 3.7 [User Profile](#37-user-profile)
   - 3.8 [Admin — Review Moderation](#38-admin--review-moderation)
   - 3.9 [Admin — Movie Management](#39-admin--movie-management)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Constraints and Assumptions](#5-constraints-and-assumptions)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Glossary](#7-glossary)

---

## 1. Purpose and Scope

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the Movie Review Application (v1.0). It is the baseline document from which all design, build, test, and deployment work is derived. It is binding from the moment the Product Owner signs off.

### 1.2 Project Overview

The Movie Review Application is a web-based platform where visitors can discover movies sourced from The Movie Database (TMDB) API, registered users can write star-rated text reviews, and administrators can moderate content and manage the movie catalogue. The application targets approximately 10,000 registered users in its first year.

### 1.3 Scope

**In Scope (v1.0):**
- User authentication via Google OAuth 2.0 only
- Movie discovery (browse, search, filter) powered by TMDB API
- Movie detail pages displaying TMDB metadata and community reviews
- Star ratings (1–5) and text reviews (max 500 characters) by registered users
- User profile page (Google avatar, display name, submitted reviews)
- Admin panel: review moderation and movie catalogue management
- Responsive web UI (desktop-first, mobile-responsive)
- Self-hosted deployment via Docker Compose on a home server
- CI/CD via GitHub Actions
- GDPR-aware data handling (user data export and deletion on request)
- WCAG 2.1 AA accessibility compliance

**Out of Scope (v1.0):**
- Mobile native apps (iOS / Android)
- Social features (follows, DMs, friend lists)
- Video streaming or trailer playback
- Payment or subscription model
- Multi-language UI (English only)
- Recommendation engine or ML personalization
- Integration with any movie platform other than TMDB
- Local credential-based authentication (email + password)
- Cloud hosting or CDN

---

## 2. Stakeholders and User Roles

### 2.1 Stakeholders

| Role | Contact | Responsibility |
|------|---------|----------------|
| Product Owner | rawaldinesh13@dsu.ac.kr | Sign-off authority; sets priorities; performs UAT |
| Tech Lead | tech-lead agent | Orchestration, gate enforcement, integration |
| Development Team | 10-agent SDLC team | Design, build, test, deploy |
| End Users | Public visitors and registered reviewers | Primary consumers of the system |

### 2.2 User Roles and Permissions

The system defines exactly three user roles:

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Guest** | Any unauthenticated visitor | Browse movies, view movie detail pages, read reviews and ratings; cannot write, rate, or interact with content |
| **Registered User** | Authenticated via Google OAuth | All Guest capabilities + submit/edit/delete own reviews, submit/update own star rating per movie |
| **Admin** | Registered User with elevated privilege (flag in DB) | All Registered User capabilities + delete any review, add/edit/delete movies in the catalogue, promote/demote users to admin role |

Role assignment:
- The first account created (or any account manually flagged in the database during deployment) is the Admin.
- Admins can promote other Registered Users to Admin and revoke Admin status (but cannot remove themselves if they are the only Admin).

---

## 3. Functional Requirements

Each requirement is assigned:
- **ID:** Unique identifier (FR-NNN)
- **Priority:** P0 (must-have for launch), P1 (important, launch-blocking if missing), P2 (nice-to-have, deferrable)
- **Role:** Which user role(s) this applies to

---

### 3.1 Movie Browsing and Discovery

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-001 | P0 | All | The system shall display a home/browse page listing movies from the TMDB API. |
| FR-002 | P0 | All | The browse page shall display each movie as a card containing: poster image, title, release year, and average community star rating (or "No ratings yet" if none exist). |
| FR-003 | P1 | All | The browse page shall support pagination or infinite scroll to load additional results. |
| FR-004 | P1 | All | The system shall display a "Trending" or "Popular" section on the home page sourced from TMDB's popular movies endpoint. |
| FR-005 | P2 | All | The system shall display a "Top Rated" section sourced from TMDB's top-rated movies endpoint. |
| FR-006 | P1 | All | The system shall gracefully handle TMDB API unavailability by displaying cached data where available, or an informative error state where not. |

### 3.2 Movie Search and Filtering

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-010 | P0 | All | The system shall provide a search bar accessible from all pages that accepts a text query and returns matching movies from TMDB. |
| FR-011 | P0 | All | Search results shall display within 2 seconds of query submission under normal operating conditions. |
| FR-012 | P0 | All | Search results shall be displayed as movie cards (poster, title, year, community rating) identical in format to browse cards. |
| FR-013 | P1 | All | The system shall support filtering search results and the browse page by: genre, release year range. |
| FR-014 | P1 | All | Active filters shall be visually indicated and individually removable. |
| FR-015 | P2 | All | The system shall support sorting browse and search results by: community rating (high-to-low), release year (newest first / oldest first), title (A–Z). |
| FR-016 | P1 | All | Searching for a query that returns no results shall display a clearly worded empty-state message rather than a blank page. |

### 3.3 Movie Detail Page

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-020 | P0 | All | Each movie shall have a dedicated detail page accessible via a unique URL slug (e.g., `/movies/{tmdb-id}`). |
| FR-021 | P0 | All | The detail page shall display: title, poster, backdrop image, release date, runtime, genres, overview/synopsis, director, and main cast (sourced from TMDB). |
| FR-022 | P0 | All | The detail page shall display the aggregate community star rating (arithmetic mean of all submitted ratings, rounded to one decimal place) and the total number of ratings. |
| FR-023 | P0 | All | The detail page shall display all approved community reviews sorted by newest submission date first. |
| FR-024 | P0 | All | Each displayed review shall show: reviewer display name, reviewer Google avatar, star rating, review text, and submission date/time. |
| FR-025 | P1 | All | The detail page shall display a "Write a Review" prompt to Guests with a link to the sign-in page. |
| FR-026 | P1 | Registered User | The detail page shall display the review submission form inline for authenticated users. |
| FR-027 | P1 | All | The detail page shall link to an external trailer source (YouTube via TMDB's video endpoint) if available. |
| FR-028 | P2 | All | The detail page shall display related / similar movies (sourced from TMDB's similar movies endpoint). |

### 3.4 User Authentication (Google OAuth)

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-030 | P0 | Guest | The system shall provide a "Sign in with Google" button that initiates the Google OAuth 2.0 authorization flow. |
| FR-031 | P0 | Guest | On successful Google OAuth callback, the system shall create a new user account (if first login) or retrieve the existing account, then issue a JWT access token and refresh token. |
| FR-032 | P0 | Registered User | The system shall maintain user sessions via JWT access tokens (short-lived, e.g., 15 minutes) and refresh tokens (longer-lived, e.g., 7 days) stored securely (httpOnly cookies). |
| FR-033 | P0 | Registered User | The system shall provide a "Sign out" action that invalidates the session and clears tokens. |
| FR-034 | P0 | All | The system shall protect all write operations (review creation, rating submission, admin actions) behind authentication — unauthenticated requests to these endpoints shall receive HTTP 401. |
| FR-035 | P1 | Registered User | The system shall silently refresh the access token using the refresh token before session expiry, providing a seamless user experience. |
| FR-036 | P1 | Registered User | On refresh token expiry or invalidation, the system shall redirect the user to the sign-in page with an appropriate message. |
| FR-037 | P0 | Registered User | The user's display name and avatar URL shall be sourced from their Google profile and stored locally on first OAuth login. |

### 3.5 Star Ratings

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-040 | P0 | Registered User | A registered user shall be able to submit one star rating (integer 1–5) per movie. |
| FR-041 | P0 | Registered User | A registered user may update their existing rating for a movie at any time; this replaces the previous value. |
| FR-042 | P0 | All | The aggregate community rating for a movie shall be recalculated in real time whenever a rating is submitted or updated. |
| FR-043 | P1 | Registered User | A registered user may delete their own rating for a movie; this removes their contribution from the aggregate. |
| FR-044 | P1 | All | The star rating UI shall be interactive and visually distinct (e.g., filled/empty star icons with hover state) and meet WCAG 2.1 AA contrast requirements. |
| FR-045 | P0 | All | Ratings are not required to accompany a text review — they are independent submissions. |

### 3.6 Text Reviews

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-050 | P0 | Registered User | A registered user shall be able to submit one text review per movie; maximum length is 500 characters. |
| FR-051 | P0 | Registered User | The review submission form shall display a live character counter showing remaining characters (500 minus current input length). |
| FR-052 | P0 | Registered User | Attempting to submit a review exceeding 500 characters shall be blocked by both client-side and server-side validation with a clear error message. |
| FR-053 | P0 | Registered User | A registered user may edit their own review at any time; the edit timestamp shall be recorded and displayed. |
| FR-054 | P0 | Registered User | A registered user may delete their own review at any time; deletion is permanent. |
| FR-055 | P0 | All | Newly submitted or edited reviews shall appear in the reviews list on the movie detail page immediately (or within one page refresh). |
| FR-056 | P1 | All | Reviews shall be displayed in chronological order (newest first) by default. |
| FR-057 | P1 | All | Blank or whitespace-only review submissions shall be rejected with a validation error. |
| FR-058 | P0 | All | Deleted reviews shall no longer appear in the public reviews list. |

### 3.7 User Profile

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-060 | P1 | Registered User | Each registered user shall have a profile page accessible at `/profile` (own) or `/users/{userId}` (public). |
| FR-061 | P1 | All | The profile page shall display: display name, Google avatar, member since date, and a list of the user's submitted reviews with links to the respective movie pages. |
| FR-062 | P1 | Registered User | The authenticated user's own profile page shall offer a "Delete my account" option that permanently deletes their account and all associated data (reviews, ratings) in compliance with GDPR. |
| FR-063 | P2 | Registered User | The user's own profile shall offer a "Export my data" option that produces a JSON file of all their reviews, ratings, and profile data. |

### 3.8 Admin — Review Moderation

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-070 | P0 | Admin | An admin shall be able to view a moderation queue listing all reviews (filterable by: all, flagged, recent). |
| FR-071 | P0 | Admin | An admin shall be able to delete any review from the system permanently, regardless of who authored it. |
| FR-072 | P1 | Admin | An admin shall be able to hide (soft-delete) a review, making it invisible to the public but recoverable. |
| FR-073 | P1 | Admin | An admin shall be able to restore a soft-deleted review. |
| FR-074 | P1 | Registered User | A registered user shall be able to "flag" a review as inappropriate; flagged reviews appear highlighted in the admin moderation queue. |
| FR-075 | P1 | Admin | The admin panel shall display the count of open flags per review in the moderation queue. |
| FR-076 | P0 | Admin | All admin-initiated moderation actions (delete, hide, restore) shall be recorded in an audit log with: action type, target review ID, admin user ID, and timestamp. |

### 3.9 Admin — Movie Management

| ID | Priority | Role | Requirement |
|----|----------|------|-------------|
| FR-080 | P1 | Admin | An admin shall be able to add a movie to the local catalogue by searching for it on TMDB and confirming the selection; TMDB metadata is then cached locally. |
| FR-081 | P1 | Admin | An admin shall be able to manually trigger a metadata refresh for any catalogued movie, pulling the latest data from TMDB. |
| FR-082 | P1 | Admin | An admin shall be able to remove a movie from the local catalogue; this also permanently removes all associated reviews and ratings. The admin must confirm this action. |
| FR-083 | P2 | Admin | An admin shall be able to add a custom editorial note or override the synopsis on any movie detail page. |
| FR-084 | P1 | Admin | An admin shall be able to promote a Registered User to Admin or revoke Admin status from an Admin, via the admin panel user management section. |
| FR-085 | P1 | Admin | An admin shall not be able to revoke their own Admin status if they are the only remaining Admin in the system. |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-001 | P0 | Page load time for home, search results, and movie detail pages shall be less than 2 seconds under normal LAN / localhost conditions. |
| NFR-002 | P1 | The API response time for any CRUD operation (review create, update, delete) shall be less than 500 ms under normal load. |
| NFR-003 | P1 | TMDB API calls shall be cached locally (PostgreSQL or in-memory) for a minimum of 1 hour to reduce external API dependency and latency. |
| NFR-004 | P2 | The application shall support up to 100 concurrent users without degradation beyond 20% of baseline response times. |

### 4.2 Scalability

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-010 | P1 | The data model and API design shall support up to 10,000 registered users and 100,000 reviews without schema changes. |
| NFR-011 | P2 | The application architecture shall be stateless at the API layer (enabling future horizontal scaling even if not needed at v1.0). |

### 4.3 Security

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-020 | P0 | All authentication tokens shall be stored in httpOnly, Secure, SameSite=Strict cookies; tokens shall never be exposed in JavaScript-accessible storage (localStorage, sessionStorage). |
| NFR-021 | P0 | All API endpoints performing state-changing operations shall verify the JWT on every request; expired or invalid tokens shall return HTTP 401. |
| NFR-022 | P0 | Admin-only endpoints shall additionally verify the admin role claim; unauthorized role access shall return HTTP 403. |
| NFR-023 | P0 | All database queries shall use parameterized statements (no raw string concatenation); ORM or query builder shall enforce this. |
| NFR-024 | P1 | The application shall implement CSRF protection for all state-changing operations. |
| NFR-025 | P1 | API rate limiting shall be applied to auth endpoints (max 10 requests per minute per IP) and review submission (max 20 per hour per user). |
| NFR-026 | P1 | TMDB API keys, database credentials, Google OAuth credentials, and JWT secrets shall never be committed to source control; they shall be injected via environment variables at runtime. |
| NFR-027 | P1 | The application shall apply standard HTTP security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security where TLS is in use). |
| NFR-028 | P2 | The application shall pass an OWASP Top 10 baseline security review (automated scan + manual check) before go-live. |

### 4.4 Accessibility

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-030 | P0 | The application shall meet WCAG 2.1 Level AA compliance across all public-facing pages. |
| NFR-031 | P0 | All interactive elements (buttons, links, form inputs, star rating widgets) shall be keyboard-navigable and have descriptive ARIA labels. |
| NFR-032 | P0 | All non-decorative images (movie posters, avatars) shall have meaningful alt text. |
| NFR-033 | P1 | The application shall maintain a minimum colour contrast ratio of 4.5:1 for normal text and 3:1 for large text (WCAG 2.1 AA). |
| NFR-034 | P1 | Focus indicators shall be visible and meet WCAG 2.1 AA contrast requirements. |

### 4.5 Availability and Reliability

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-040 | P1 | The application shall target 99% uptime during normal household internet operation (acknowledging home server hardware limitations). |
| NFR-041 | P1 | The application shall gracefully degrade when the TMDB API is unavailable: cached movie data is served; browsing/reading functions remain available; search may return cached or empty results with an informative message. |
| NFR-042 | P1 | The application shall survive container restarts without data loss (all persistent data in PostgreSQL volume). |
| NFR-043 | P2 | A database backup strategy (automated daily PostgreSQL dump) shall be implemented as part of the Docker Compose setup. |

### 4.6 Maintainability

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-050 | P1 | Unit test coverage shall be >= 80% for all backend business logic modules. |
| NFR-051 | P1 | The codebase shall pass ESLint/TSLint rules with zero errors before each CI build. |
| NFR-052 | P1 | All environment-specific configuration shall be externalized via `.env` files (not hard-coded). |
| NFR-053 | P2 | Application logs shall be structured (JSON format) and include request ID, timestamp, log level, and message. |

### 4.7 Compliance (GDPR-aware)

| ID | Priority | Requirement |
|----|----------|-------------|
| NFR-060 | P1 | The application shall collect only the minimum personal data required: Google user ID, display name, email address (for internal identification only, not displayed), and avatar URL. |
| NFR-061 | P1 | Users shall be able to delete their own account and all associated personal data permanently (right to erasure). See FR-062. |
| NFR-062 | P2 | Users shall be able to export all their personal data in machine-readable format (JSON). See FR-063. |
| NFR-063 | P1 | A privacy notice shall be linked from the application footer, describing what data is collected and how it is used. |

---

## 5. Constraints and Assumptions

### 5.1 Constraints

| ID | Constraint |
|----|-----------|
| CON-001 | Deployment target is fixed: a single home server running Docker Compose. No cloud hosting in v1.0. |
| CON-002 | Authentication is Google OAuth 2.0 only. No email/password, no other OAuth providers in v1.0. |
| CON-003 | Movie data is sourced from TMDB only. No other movie data providers. |
| CON-004 | UI language is English only for v1.0. |
| CON-005 | Review text is capped at 500 characters; this limit is non-negotiable for v1.0 (aligns with Product Owner brief). |
| CON-006 | Star ratings use an integer 1–5 scale only (no half-stars). |
| CON-007 | The TMDB API key (free tier) is subject to TMDB's rate limits (~40 requests per 10 seconds); the application must respect these limits. |
| CON-008 | TypeScript is the mandated language for all new code (frontend and backend). |

### 5.2 Assumptions

| ID | Assumption |
|----|-----------|
| ASM-001 | The Product Owner possesses a valid TMDB API key (free tier) and will supply it as an environment variable during the build phase. |
| ASM-002 | The Product Owner has a Google Cloud project with OAuth 2.0 credentials (or will create one prior to build phase). |
| ASM-003 | The home server runs a modern Linux OS (Ubuntu 22.04 LTS or equivalent) with Docker Engine and Docker Compose installed. |
| ASM-004 | The home server has sufficient resources: minimum 2 vCPUs, 4 GB RAM, 20 GB storage. |
| ASM-005 | No SLA or guaranteed uptime is required; "best effort" availability on personal hardware is acceptable. |
| ASM-006 | TMDB's free tier API quota is sufficient for approximately 10,000 users per year, given local caching. |
| ASM-007 | The Product Owner is the sole Admin for v1.0 and will serve as the primary UAT tester. |
| ASM-008 | Third-party open-source libraries may be used freely without licensing cost. |
| ASM-009 | Users visiting the site implicitly consent to the data practices described in the privacy notice by using the service. |

---

## 6. Acceptance Criteria

Acceptance criteria are defined for all P0 and P1 user stories. They use Gherkin-style Given/When/Then format.

---

### AC-FR-001/002 — Movie Browse Page (P0)

**Given** any user (Guest, Registered, or Admin) navigates to the home/browse page,
**When** the page loads,
**Then** a list of movie cards is displayed, each showing a poster image, title, release year, and the community average star rating (or "No ratings yet").

**Given** the TMDB API is unavailable,
**When** a user loads the browse page,
**Then** cached movie data is displayed if available, or an error state is shown with a message indicating that movie data is temporarily unavailable.

---

### AC-FR-010/011/012 — Movie Search (P0)

**Given** any user is on any page,
**When** the user types a query into the search bar and submits,
**Then** matching movie results are displayed as movie cards within 2 seconds.

**Given** a search query returns no matching movies,
**When** the results page renders,
**Then** a message such as "No movies found for '[query]'" is displayed; no blank or error page is shown.

---

### AC-FR-013/014 — Search Filtering (P1)

**Given** search results or the browse page is displayed,
**When** the user applies a genre filter,
**Then** only movies matching that genre are shown and the active filter is visually indicated.

**Given** an active filter is applied,
**When** the user removes the filter,
**Then** the full unfiltered result set is restored.

---

### AC-FR-020/021 — Movie Detail Page (P0)

**Given** any user clicks on a movie card,
**When** the movie detail page loads,
**Then** the page displays: title, poster, backdrop, release date, runtime, genres, synopsis, director, and main cast (all sourced from TMDB).

---

### AC-FR-022/023/024 — Reviews on Detail Page (P0)

**Given** a movie has at least one community review,
**When** the movie detail page is rendered,
**Then** reviews are displayed sorted newest-first, each showing reviewer name, avatar, star rating, review text, and submission date/time.

**Given** a movie has at least one community rating,
**When** the movie detail page is rendered,
**Then** the aggregate star rating (mean, rounded to one decimal) and total rating count are displayed.

---

### AC-FR-030/031 — Google OAuth Sign-In (P0)

**Given** a Guest user clicks "Sign in with Google",
**When** the Google OAuth flow completes successfully,
**Then** the user is redirected back to the application, a Registered User account is created (if new) or retrieved (if returning), and the user is in an authenticated session.

**Given** the OAuth flow fails or is cancelled by the user,
**When** the application receives the callback,
**Then** the user is returned to the sign-in page with an informative error message; no partial account is created.

---

### AC-FR-033 — Sign Out (P0)

**Given** a Registered User is authenticated,
**When** the user clicks "Sign out",
**Then** the JWT and refresh tokens are invalidated/cleared, and the user is redirected to the home page in a Guest state.

---

### AC-FR-034 — Authentication Guard (P0)

**Given** an unauthenticated request is made to a write endpoint (review submit, rating submit, admin action),
**When** the API server receives the request,
**Then** HTTP 401 Unauthorized is returned and no state change occurs.

---

### AC-FR-040/041 — Star Ratings (P0)

**Given** a Registered User views a movie detail page and has not yet rated it,
**When** the user selects a star rating (1–5) and submits,
**Then** the rating is saved and the aggregate community rating on the page updates to reflect the new value.

**Given** a Registered User has already submitted a rating for a movie,
**When** the user selects a different rating and submits,
**Then** the existing rating is replaced and the aggregate updates accordingly.

---

### AC-FR-050/051/052 — Text Review Submission (P0)

**Given** a Registered User is on a movie detail page,
**When** the user types a review (1–500 characters) and submits,
**Then** the review appears in the reviews list on that page, with the character count respected.

**Given** a Registered User types more than 500 characters in the review field,
**When** the user attempts to submit,
**Then** the client blocks submission and displays a validation error ("Review cannot exceed 500 characters"). The server also rejects any bypass attempt with HTTP 422.

**Given** a Registered User submits a blank or whitespace-only review,
**When** the form is submitted,
**Then** a validation error is displayed ("Review text cannot be blank"); no review is stored.

---

### AC-FR-053/054 — Edit and Delete Own Review (P0)

**Given** a Registered User has previously submitted a review,
**When** the user edits the review text and saves,
**Then** the updated text is displayed and an "edited" indicator (with edit timestamp) appears on the review card.

**Given** a Registered User has previously submitted a review,
**When** the user deletes the review,
**Then** the review is permanently removed and no longer appears on the movie detail page.

---

### AC-FR-060/061 — User Profile Page (P1)

**Given** any user navigates to a user profile page,
**When** the page loads,
**Then** the profile displays the user's display name, Google avatar, member-since date, and a list of their submitted reviews with links to corresponding movies.

---

### AC-FR-062 — Account Deletion / GDPR (P1)

**Given** an authenticated Registered User navigates to their own profile page and selects "Delete my account",
**When** the user confirms the deletion,
**Then** their account, all reviews, all ratings, and all personal data are permanently deleted from the database, and the user is signed out.

---

### AC-FR-070/071 — Admin Review Moderation (P0)

**Given** an Admin is in the admin panel moderation section,
**When** the Admin clicks "Delete" on any review,
**Then** the review is permanently removed from the database and no longer appears on any public page; the action is recorded in the audit log.

---

### AC-FR-076 — Admin Audit Log (P0)

**Given** an Admin performs any moderation action (delete, hide, restore review),
**When** the action is executed,
**Then** an audit log entry is created containing: action type, target review ID, admin user ID, and UTC timestamp.

---

### AC-FR-080/081 — Admin Movie Management (P1)

**Given** an Admin searches for a movie by title in the admin movie-add interface,
**When** the Admin selects a result and confirms,
**Then** the TMDB metadata for that movie is cached locally and the movie becomes discoverable in the browse and search views.

**Given** an Admin triggers a metadata refresh for a catalogued movie,
**When** the refresh completes,
**Then** the locally cached TMDB data for that movie is updated to the latest values.

---

### AC-FR-082 — Admin Movie Deletion (P1)

**Given** an Admin selects "Remove movie" for a catalogued movie and confirms,
**When** the deletion is executed,
**Then** the movie, all associated reviews, and all associated ratings are permanently removed; a confirmation prompt was shown before execution.

---

### AC-NFR-020/021 — Token Security (P0)

**Given** a user authenticates successfully,
**When** the tokens are issued,
**Then** both JWT access token and refresh token are stored only in httpOnly cookies; no token values are accessible via `document.cookie` or any JavaScript API.

---

### AC-NFR-030 — WCAG 2.1 AA (P0)

**Given** any public-facing page,
**When** evaluated with an automated accessibility audit tool (e.g., axe-core) and manual keyboard navigation,
**Then** zero critical or serious WCAG 2.1 AA violations are reported.

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| TMDB | The Movie Database — external third-party API providing movie metadata |
| OAuth 2.0 | Open Authorization protocol used for delegated authentication (Google) |
| JWT | JSON Web Token — compact, URL-safe token for stateless authentication |
| Guest | An unauthenticated visitor to the application |
| Registered User | A user who has authenticated via Google OAuth |
| Admin | A Registered User with elevated moderation and management privileges |
| Review | A text entry (max 500 chars) submitted by a Registered User about a movie |
| Rating | An integer star score (1–5) submitted by a Registered User for a movie |
| Aggregate Rating | The arithmetic mean of all user ratings for a movie, rounded to one decimal place |
| Soft-delete | Marking a record as inactive/hidden without permanently removing it from the database |
| Audit Log | A tamper-evident record of administrative actions performed within the system |
| P0 | Must-have; launch is blocked without it |
| P1 | Important; launch is blocked without it unless explicitly deferred |
| P2 | Nice-to-have; can be deferred to a future version without blocking launch |
| SRS | Software Requirements Specification — this document |
| NFR | Non-Functional Requirement |
| FR | Functional Requirement |
| WCAG | Web Content Accessibility Guidelines |
| GDPR | General Data Protection Regulation |
| CR | Change Request — formal process for scope changes after SRS sign-off |

---

*Produced by product-manager — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
