# Wireframes and UX Design — Movie Review Application

**Document ID:** WIREFRAMES-1.0
**Owner:** ux-designer
**Status:** DRAFT — Awaiting Product Owner Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Produced by:** ux-designer (Phase 4 — Detailed Design)
**Reviewed by:** tech-lead

---

## Table of Contents

1. [Information Architecture — Site Map](#1-information-architecture--site-map)
2. [User Flows](#2-user-flows)
3. [Wireframes](#3-wireframes)
4. [Design System Decisions](#4-design-system-decisions)
5. [Accessibility Specification](#5-accessibility-specification)
6. [Responsive Breakpoints](#6-responsive-breakpoints)

---

## 1. Information Architecture — Site Map

```
Movie Review App
│
├── Public (Guest accessible)
│   ├── / (Home — Popular Movies)
│   ├── /movies (Browse / Search results)
│   │   └── ?q=&genre=&yearFrom=&yearTo=&sort=&page=
│   ├── /movies/[id] (Movie Detail Page)
│   │   └── /movies/[id]#reviews
│   ├── /users/[userId] (Public User Profile)
│   ├── /login (Sign-In Page)
│   │   └── /login?error=oauth_failed
│   └── /privacy (Privacy Notice)
│
├── Authenticated (Registered User)
│   └── /profile (Own Profile — redirects to /users/[me])
│       └── /profile?tab=reviews
│
└── Admin (isAdmin=true)
    └── /admin (Admin Dashboard)
        ├── /admin/moderation (Review Moderation Queue)
        ├── /admin/movies (Movie Catalogue Management)
        │   └── /admin/movies/add (Add Movie from TMDB)
        ├── /admin/users (User Management)
        └── /admin/audit-log (Audit Log)
```

### Navigation Structure

**Global Header** (all pages):
- Logo / App name (links to /)
- Search bar (persistent)
- "Browse Movies" link
- "Sign in with Google" button (Guest) OR Avatar dropdown (Registered User)
  - Avatar dropdown items: My Profile, Sign out
  - Admin users additionally see: Admin Dashboard

**Global Footer** (all pages):
- Privacy Policy link
- "Powered by TMDB" attribution (TMDB API requirement)
- App version

---

## 2. User Flows

### 2.1 Guest Browsing Flow

```
[Entry: Any URL / Direct visit]
         │
         ▼
  ┌─────────────────────┐
  │   Home Page (/)     │
  │   Popular movies    │
  └─────────┬───────────┘
            │
     ┌──────┴──────────────────────────────┐
     │                                     │
     ▼                                     ▼
┌──────────────────┐             ┌──────────────────────┐
│  Click Movie Card│             │  Type in Search Bar  │
└────────┬─────────┘             └──────────┬───────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Movie Detail Page   │         │  /movies?q=batman     │
│  /movies/[id]        │         │  Search Results       │
│                      │◄────────┤  Apply filters        │
│  - Poster, metadata  │         │  (genre, year, sort)  │
│  - Community rating  │         └──────────┬───────────┘
│  - Reviews (list)    │                    │
│  - "Sign in to       │         ┌──────────┘
│    review" prompt    │         │ Click result
└──────────────────────┘◄────────┘
         │
         ▼
 [Read reviews, see
  aggregate rating]
         │
         ▼
  [Click "Sign in
   to write a review"]
         │
         ▼
  ┌─────────────────┐
  │   /login        │
  │   Sign-In Page  │
  └─────────────────┘
```

### 2.2 OAuth Login and First Review Flow

```
[User on /login page or redirected from protected action]
         │
         ▼
┌────────────────────────┐
│  /login                │
│  "Sign in with Google" │
│  button                │
└────────┬───────────────┘
         │ Click
         ▼
  [GET /api/auth/google]
  [302 → accounts.google.com]
         │
         ▼
┌────────────────────────┐
│  Google Consent Screen │
│  (external)            │
└────────┬───────────────┘
         │
    ┌────┴────────────────────┐
    │ Success                 │ Cancel/Error
    ▼                         ▼
[GET /api/auth/             ┌────────────────────────┐
google/callback?code=...]   │  /login?error=oauth_    │
    │                       │  failed                 │
    ▼                       │  Error message shown    │
[Backend: upsert user]      └────────────────────────┘
[Issue JWT cookies]
    │
    ▼
[302 → / or original URL]
    │
    ▼
┌────────────────────────┐
│  Home Page (/)         │
│  Now authenticated:    │
│  - Avatar in header    │
│  - Can write reviews   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Navigate to           │
│  /movies/[id]          │
│  Movie Detail Page     │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Review Form (inline)  │
│  - Text area (500 chr) │
│  - Live char counter   │
│  - Star rating widget  │
│  - Submit button       │
└────────┬───────────────┘
         │ Type + Submit
         ▼
┌────────────────────────┐    ┌──────────────────────────┐
│  POST /api/movies/[id]/│    │  Validation Error         │
│  reviews               │    │  (blank, >500 chars)      │
│                        ├────►  Inline error message      │
│  201 Created           │    │  Form NOT submitted        │
└────────┬───────────────┘    └──────────────────────────┘
         │ Success
         ▼
┌────────────────────────┐
│  Review appears at top │
│  of reviews list       │
│  (real-time update)    │
└────────────────────────┘
         │
     [User can edit or
      delete own review
      via inline controls]
```

### 2.3 Admin Moderation Flow

```
[Admin authenticated, navigates to /admin]
         │
         ▼
┌────────────────────────────────────────┐
│  Admin Dashboard (/admin)              │
│                                        │
│  Summary cards:                        │
│  [Pending Flags: 3] [New Reviews: 12]  │
│  [Total Movies: 47] [Total Users: 156] │
└────────────────────┬───────────────────┘
                     │
        ┌────────────┴────────────────────┐
        │                                 │
        ▼                                 ▼
┌────────────────────┐         ┌─────────────────────────┐
│  /admin/moderation │         │  /admin/movies           │
│  Moderation Queue  │         │  Movie Management        │
└─────────┬──────────┘         └────────────┬────────────┘
          │                                 │
          ▼                                 ▼
[Filter: All / Flagged                [Search movies]
 / Hidden / Recent]                   [Add from TMDB]
          │                           [Sync metadata]
          ▼                           [Delete movie]
[See review list with:
  - Review text
  - Author, date
  - Flag count badge
  - Action buttons:
    [Hide] [Delete]
    (for hidden: [Restore])]
          │
     ┌────┴───────────────────────────────┐
     │                                    │
     ▼                                    ▼
[Click HIDE]                        [Click DELETE]
     │                                    │
     ▼                                    ▼
[POST /reviews/:id/moderate         [Confirmation dialog:
 action: hide]                       "Permanently delete
     │                               this review?
     ▼                               [Cancel] [Delete]"]
[Review marked is_hidden=true]            │
[Row shows "Hidden" badge]                ▼
[Audit log entry created]          [POST /reviews/:id/
     │                              moderate action:delete]
     ▼                                    │
[Option: [Restore] button appears]        ▼
                                   [Review gone from queue]
                                   [Audit log entry created]
```

---

## 3. Wireframes

### 3.1 Global Header Component

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER  (sticky, full-width, height: 64px)                                  │
│                                                                             │
│ ┌─────────────┐  ┌──────────────────────────────────────────┐  ┌─────────┐ │
│ │ 🎬 MovieRev │  │ 🔍 Search movies...                      │  │ Sign in │ │
│ │  (logo+name)│  │                                (search)  │  │with     │ │
│ └─────────────┘  └──────────────────────────────────────────┘  │ Google  │ │
│ [Home] [Browse]                                                 └─────────┘ │
│                                                                             │
│ ── When authenticated: ──────────────────────────────────────────────────── │
│                                                                             │
│ ┌─────────────┐  ┌──────────────────────────────────────────┐  ┌─────────┐ │
│ │ 🎬 MovieRev │  │ 🔍 Search movies...                      │  │ [Avatar]│ │
│ └─────────────┘  └──────────────────────────────────────────┘  │ ▼       │ │
│ [Home] [Browse]                                                 └─────────┘ │
│                                                                  Dropdown:  │
│                                                                  My Profile │
│                                                                  Admin Panel│
│                                                                  ─────────  │
│                                                                  Sign out   │
└─────────────────────────────────────────────────────────────────────────────┘

Accessibility:
- Header landmark: <header role="banner">
- Navigation: <nav aria-label="Main navigation">
- Search: <input type="search" aria-label="Search movies">
- Avatar button: <button aria-label="User menu, [displayName]" aria-expanded="false">
- Dropdown: <ul role="menu"> with <li role="menuitem">
```

---

### 3.2 Home / Movie Listing Page (Desktop 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER (see 3.1)                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Popular Movies                                            [Sort: ▼ Popular]│
│  ─────────────                                                              │
│                                                                             │
│  FILTER PANEL                    MOVIE GRID                                 │
│  ┌─────────────────────┐  ┌──────┬──────┬──────┬──────┐                   │
│  │ Genres              │  │      │      │      │      │                   │
│  │ ☐ Action            │  │[img] │[img] │[img] │[img] │                   │
│  │ ☐ Drama             │  │Title │Title │Title │Title │                   │
│  │ ☐ Comedy            │  │Year  │Year  │Year  │Year  │                   │
│  │ ☐ Thriller          │  │★ 4.3 │★ 3.9 │★ 4.1 │★ —  │                   │
│  │ ☐ Horror            │  │      │      │      │      │                   │
│  │ ☐ Sci-Fi            │  ├──────┼──────┼──────┼──────┤                   │
│  │ [+ Show all]        │  │      │      │      │      │                   │
│  │                     │  │[img] │[img] │[img] │[img] │                   │
│  │ Release Year        │  │Title │Title │Title │Title │                   │
│  │ From: [2000 ▼]      │  │Year  │Year  │Year  │Year  │                   │
│  │ To:   [2024 ▼]      │  │★ 4.7 │★ 2.8 │★ 4.0 │★ 4.5│                   │
│  │                     │  │      │      │      │      │                   │
│  │ [Clear All Filters] │  └──────┴──────┴──────┴──────┘                   │
│  └─────────────────────┘                                                   │
│                                                                             │
│  Active filters: [Action ×] [2000–2020 ×]           Page: [1] [2] [3] ...  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER: Privacy Policy | Powered by TMDB                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Movie Card Detail:
┌───────────┐
│           │ ← 2:3 aspect ratio poster image
│  [Poster] │   alt="[Title] movie poster"
│           │
├───────────┤
│ Movie     │ ← h3 element
│ Title     │
│ 1999      │ ← release year (muted text)
│ ★★★★☆ 4.3│ ← star icons + numeric rating
│ (247)     │ ← rating count
└───────────┘
Entire card is a link: <a href="/movies/[id]" aria-label="[Title] (1999), rated 4.3 stars">

Accessibility:
- Page landmark: <main>
- Heading hierarchy: h1 "Popular Movies", h3 per movie card
- Filter panel: <aside aria-label="Movie filters">
- Genre checkboxes: <fieldset><legend>Genres</legend>
- Active filter chips: <button aria-label="Remove Action filter">Action ×</button>
- Movie grid: role="list" with role="listitem" per card
- "No ratings yet" shown as aria-label="Not yet rated"
```

---

### 3.3 Movie Detail Page (Desktop 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │  BACKDROP IMAGE (full-width, 40vh, darkened overlay)                     ││
│ │                                                                          ││
│ │  Fight Club  (1999)                                                      ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌──────────────┐  MOVIE METADATA                                          │
│  │              │  ─────────────────────────────────────────────           │
│  │  [Poster     │  Fight Club                               [Action] [Drama]│
│  │   Image]     │  1999 · 2h 19min · English                              │
│  │  w300        │                                                           │
│  │              │  Community Rating: ★★★★☆  4.3 / 5   (247 ratings)       │
│  │              │                                                           │
│  │              │  [Rate this movie: ☆ ☆ ☆ ☆ ☆] ← interactive, auth-only │
│  │              │  (Guest sees: "Sign in to rate")                         │
│  └──────────────┘                                                           │
│                                                                             │
│  Overview                                                                   │
│  ─────────                                                                  │
│  An insomniac office worker and a devil-may-care soapmaker form an          │
│  underground fight club that evolves into something much, much more...      │
│                                                                             │
│  Director: David Fincher                                                    │
│                                                                             │
│  Cast                                                                       │
│  Brad Pitt · Edward Norton · Helena Bonham Carter · ...                     │
│  [→ Watch Trailer on YouTube]  (if available)                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Community Reviews  (247 reviews)                                           │
│  ────────────────                                                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WRITE A REVIEW  (authenticated users only)                         │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Your review...                                              │   │   │
│  │  │                                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                              450 / 500 characters   │   │
│  │                                           [Submit Review]           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  (Guests see: "Sign in to write a review → [Sign in with Google]")          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Avatar] Jane Doe          ★★★★★  May 22, 2026                     │   │
│  │                                                                     │   │
│  │ "A brutal, poetic film that stays with you long after the credits   │   │
│  │  roll. Fincher at his finest."                                      │   │
│  │                                                                     │   │
│  │ [Flag]     (own review also shows: [Edit] [Delete])                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Avatar] John Smith        ★★★★☆  May 21, 2026  (edited May 22)    │   │
│  │                                                                     │   │
│  │ "Visceral, raw, and deeply unsettling in the best way."             │   │
│  │                                                                     │   │
│  │ [Flag]                                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Load more reviews] / Pagination                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Star Rating Widget (interactive):
┌────────────────────────────────────────┐
│  Rate this movie:                      │
│  ☆ ☆ ☆ ☆ ☆   (unfilled, hover fills) │
│  [1][2][3][4][5] — radio button group  │
└────────────────────────────────────────┘
<fieldset>
  <legend>Rate this movie</legend>
  <label><input type="radio" name="rating" value="1" aria-label="1 star"> ☆</label>
  <label><input type="radio" name="rating" value="2" aria-label="2 stars"> ☆</label>
  ...
</fieldset>

Review Card Accessibility:
- <article aria-label="Review by Jane Doe, 5 stars">
- Avatar: <img alt="Jane Doe's profile picture">
- Star display: <span aria-label="5 out of 5 stars">★★★★★</span>
- Flag button: <button aria-label="Flag this review by Jane Doe as inappropriate">Flag</button>
- Edit button: <button aria-label="Edit your review">Edit</button>
- Delete button: <button aria-label="Delete your review">Delete</button>
```

---

### 3.4 User Profile / My Reviews Page (Desktop 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [Avatar 96px]  Jane Doe                                             │  │
│  │                 Member since: January 2026                           │  │
│  │                 24 reviews submitted                                 │  │
│  │                                                                      │  │
│  │  (Own profile only): [Delete My Account]  ← danger/red button       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  My Reviews                                                                 │
│  ──────────                                                                 │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ [Poster  ]  Fight Club (1999)                                        │  │
│  │ [thumb   ]  ★★★★★   May 22, 2026                                    │  │
│  │             "A brutal, poetic film that stays with you..."           │  │
│  │             [View Movie]  [Edit Review]  [Delete Review]             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ [Poster  ]  Inception (2010)                                         │  │
│  │ [thumb   ]  ★★★★☆   May 18, 2026                                    │  │
│  │             "Mind-bending masterpiece."                              │  │
│  │             [View Movie]  [Edit Review]  [Delete Review]             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Page: [1] [2] [3] ...                                                     │
│                                                                             │
│  (Own profile only, bottom):                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Data & Privacy                                                     │   │
│  │  [Export My Data (JSON)]  [Delete My Account]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Delete Account Confirmation Modal:
┌──────────────────────────────────────────────┐
│  Delete Account                              │
│  ────────────────────────────────────────    │
│  This will permanently delete your account  │
│  and ALL your reviews and ratings. This      │
│  action cannot be undone.                    │
│                                              │
│  [Cancel]              [Delete My Account]   │
│                        (red, destructive)    │
└──────────────────────────────────────────────┘

Accessibility:
- Profile region: <main aria-label="[Name]'s profile">
- Delete account button: aria-describedby pointing to consequences paragraph
- Confirmation modal: role="alertdialog", aria-labelledby="dialog-title", focus trap inside
```

---

### 3.5 Admin Dashboard (Desktop 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER (with "Admin Panel" link in dropdown)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Admin Dashboard                                                            │
│  ───────────────                                                            │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ Pending     │ │ New Reviews │ │ Total Movies│ │ Total Users │         │
│  │ Flags: 3    │ │ (24h): 12   │ │ 47          │ │ 156         │         │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │  Quick Actions       │  │  Recent Audit Log     │                       │
│  │  ─────────────────── │  │  ───────────────────  │                       │
│  │  [Review Moderation] │  │  [HIDDEN] Review #32  │                       │
│  │  [Movie Management]  │  │  by admin@.. 2m ago   │                       │
│  │  [User Management]   │  │  [DELETED] Review #28 │                       │
│  │  [Audit Log]         │  │  by admin@.. 5m ago   │                       │
│  └──────────────────────┘  │  [View Full Log →]    │                       │
│                             └──────────────────────┘                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ADMIN NAV (side panel or top sub-nav):                                      │
│ [Dashboard] [Moderation] [Movies] [Users] [Audit Log]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Admin Moderation Queue (Desktop 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER + ADMIN SUB-NAV                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Review Moderation                                                          │
│  ──────────────────                                                         │
│                                                                             │
│  Filter: [All ▼]  [Flagged ▼]  [Hidden ▼]  Sort: [Most Flagged ▼]         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [!] 3 FLAGS  │ Fight Club               May 22, 2026                │   │
│  │              │ Author: Jane Doe [View Profile]                      │   │
│  │              │                                                      │   │
│  │              │ "This movie is garbage and anyone who likes it is    │   │
│  │              │  an idiot. Completely overrated."                    │   │
│  │              │                                                      │   │
│  │              │ [Hide Review]  [Delete Review]  [View on Movie Page] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [HIDDEN] 1 FLAG │ Inception               May 18, 2026              │   │
│  │                 │ Author: John Smith                                │   │
│  │                 │                                                   │   │
│  │                 │ [Hidden content — click to view]                 │   │
│  │                 │                                                   │   │
│  │                 │ [Restore Review]  [Delete Permanently]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 0 FLAGS     │ The Godfather            May 17, 2026                │   │
│  │             │ Author: Alice Chen                                    │   │
│  │             │                                                       │   │
│  │             │ "A timeless classic. The performances are..."        │   │
│  │             │                                                       │   │
│  │             │ [Hide Review]  [Delete Review]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Page: [1] [2] [3] ...                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Delete Confirmation Dialog:                                                 │
│ ┌──────────────────────────────────────────────────┐                       │
│ │ Permanently delete this review?                  │                       │
│ │ This action cannot be undone.                    │                       │
│ │ Optional reason: [                             ] │                       │
│ │          [Cancel]      [Delete Permanently]      │                       │
│ └──────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘

Accessibility:
- Flag count badge: <span aria-label="3 flags reported" role="status">
- Hidden content toggle: <button aria-expanded="false" aria-controls="review-body-id">
- Action buttons: distinct aria-labels per review
  e.g. aria-label="Hide review by Jane Doe on Fight Club"
- Confirmation dialog: role="alertdialog", focus on Cancel by default
```

---

### 3.7 Login / OAuth Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER (simplified — logo only, no nav links)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                   ┌─────────────────────────────────────┐                  │
│                   │                                     │                  │
│                   │     🎬  MovieReview                 │                  │
│                   │                                     │                  │
│                   │  Discover and review movies.        │                  │
│                   │  Join the community.                │                  │
│                   │                                     │                  │
│                   │  ┌───────────────────────────────┐  │                  │
│                   │  │  [G]  Sign in with Google     │  │                  │
│                   │  └───────────────────────────────┘  │                  │
│                   │                                     │                  │
│                   │  By signing in, you agree to our   │                  │
│                   │  Privacy Policy.                    │                  │
│                   │                                     │                  │
│                   └─────────────────────────────────────┘                  │
│                                                                             │
│  ── Error state (when ?error=oauth_failed): ──────────────────────────     │
│                   ┌─────────────────────────────────────┐                  │
│                   │  ⚠ Sign-in failed                   │                  │
│                   │  The Google sign-in was cancelled   │                  │
│                   │  or an error occurred. Please try   │                  │
│                   │  again.                             │                  │
│                   │                                     │                  │
│                   │  [Sign in with Google]              │                  │
│                   └─────────────────────────────────────┘                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FOOTER: Privacy Policy | Powered by TMDB                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Accessibility:
- Page <title>: "Sign In — MovieReview"
- Sign-in button: <a href="/api/auth/google" role="button" aria-label="Sign in with Google">
- Error message: role="alert" (announced to screen readers on load)
- Card: <main aria-label="Sign in">
```

---

### 3.8 Mobile Wireframe — Movie Listing (375px)

```
┌──────────────────────────┐
│ [☰] MovieRev    [🔍] [👤]│ ← Hamburger for nav, search icon, avatar
├──────────────────────────┤
│                          │
│ Popular Movies           │
│                          │
│ Filters ▼ (collapsed)    │ ← Expandable filter drawer
│                          │
│ ┌──────────┐ ┌─────────┐ │
│ │  [img]   │ │  [img]  │ │ ← 2-column grid on mobile
│ │ Title    │ │ Title   │ │
│ │ 1999     │ │ 2008    │ │
│ │ ★ 4.3   │ │ ★ 4.7  │ │
│ └──────────┘ └─────────┘ │
│                          │
│ ┌──────────┐ ┌─────────┐ │
│ │  [img]   │ │  [img]  │ │
│ │ Title    │ │ Title   │ │
│ │ 2003     │ │ 1994    │ │
│ │ ★ 4.1   │ │ ★ 4.9  │ │
│ └──────────┘ └─────────┘ │
│                          │
│ [Load more]              │
└──────────────────────────┘
```

---

### 3.9 Mobile Wireframe — Movie Detail (375px)

```
┌──────────────────────────┐
│ [☰] MovieRev    [🔍] [👤]│
├──────────────────────────┤
│                          │
│ [Full-width backdrop img]│
│                          │
│ ┌──────┐ Fight Club      │
│ │      │ 1999 · 2h 19min │
│ │Poster│ [Action] [Drama]│
│ │img   │                 │
│ └──────┘ ★★★★☆ 4.3 (247)│
│                          │
│ [Rate: ☆☆☆☆☆]           │
│                          │
│ Overview                 │
│ An insomniac office...   │
│ [Read more]              │
│                          │
│ Director: David Fincher  │
│                          │
│ Cast:                    │
│ [Brad Pitt] [E. Norton]  │ ← horizontal scroll
│                          │
│ [▶ Watch Trailer]        │
│                          │
│ ─────────────────────    │
│ Community Reviews (247)  │
│                          │
│ [Sign in to review]      │
│                          │
│ ┌──────────────────────┐ │
│ │[Av] Jane Doe  ★★★★★ │ │
│ │May 22, 2026          │ │
│ │"A brutal, poetic..." │ │
│ │[Flag]                │ │
│ └──────────────────────┘ │
│                          │
│ [Load more]              │
└──────────────────────────┘
```

---

## 4. Design System Decisions

### 4.1 Component Library

**Selected: Shadcn/ui + Tailwind CSS**

Rationale:
- Shadcn/ui provides unstyled, accessible Radix UI primitives with Tailwind-based styling.
- Components are copied into the codebase (no external runtime dependency), enabling full customization.
- Radix UI primitives handle all accessibility patterns (focus management, keyboard nav, ARIA) out of the box.
- Tailwind CSS provides utility-first styling with design tokens, keeping bundle size minimal.

Core Shadcn/ui components to use:
- `Button` — primary, secondary, destructive, ghost variants
- `Input`, `Textarea` — form fields with validation states
- `Dialog` — confirmation modals (delete account, delete review)
- `DropdownMenu` — user avatar dropdown
- `Badge` — genre tags, flag count indicators, "Hidden" / "Admin" markers
- `Pagination` — review list and movie list pagination
- `Alert` — error states, TMDB unavailability banner
- `Avatar` — user profile pictures
- `Skeleton` — loading states for movie cards and reviews
- `Toast` — success/error notifications (Sonner integration)

Custom components to build:
- `StarRatingWidget` — interactive + display-only variants (uses Radix radio group)
- `MovieCard` — poster + metadata card
- `ReviewCard` — review display with actions
- `CharacterCounter` — live remaining character count
- `FilterPanel` — genre checkboxes + year range
- `AdminReviewRow` — moderation queue item

### 4.2 Color Palette

**Theme: Dark cinema aesthetic**

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-background` | `#FFFFFF` | `#0F1117` | Page background |
| `--color-surface` | `#F8F9FA` | `#1A1D27` | Card background |
| `--color-surface-elevated` | `#FFFFFF` | `#242736` | Elevated cards, modals |
| `--color-border` | `#E2E8F0` | `#2D3148` | Borders, dividers |
| `--color-text-primary` | `#0F172A` | `#F1F5F9` | Main body text |
| `--color-text-secondary` | `#64748B` | `#94A3B8` | Muted text (year, metadata) |
| `--color-text-disabled` | `#CBD5E1` | `#475569` | Disabled states |
| `--color-primary` | `#6366F1` | `#818CF8` | Brand accent (indigo) |
| `--color-primary-hover` | `#4F46E5` | `#A5B4FC` | Hover state |
| `--color-star-filled` | `#F59E0B` | `#FCD34D` | Filled star (amber) |
| `--color-star-empty` | `#D1D5DB` | `#374151` | Empty star |
| `--color-danger` | `#EF4444` | `#F87171` | Destructive actions |
| `--color-danger-bg` | `#FEF2F2` | `#450A0A` | Danger button/area background |
| `--color-success` | `#10B981` | `#34D399` | Success states |
| `--color-warning` | `#F59E0B` | `#FCD34D` | Warnings (flagged content) |
| `--color-admin-badge` | `#7C3AED` | `#A78BFA` | Admin badge |
| `--color-hidden-bg` | `#FEF3C7` | `#451A03` | Hidden review row tint |

**Contrast compliance (WCAG 2.1 AA):**
- `--color-text-primary` on `--color-background`: 15.3:1 (dark mode) / 19.4:1 (light mode) — PASS
- `--color-text-secondary` on `--color-background`: 4.7:1 (dark mode) / 4.6:1 (light mode) — PASS (AA large text)
- `--color-primary` on `--color-background`: 4.6:1 (dark mode) / 5.1:1 (light mode) — PASS
- `--color-star-filled` on `--color-surface`: verified ≥ 3:1 (large UI element) — PASS

### 4.3 Typography Scale

Base: **Inter** (Google Fonts, 2 weights: 400, 600)
Code/mono: **JetBrains Mono** (dev env only)

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 1.5 | Timestamps, metadata labels |
| `text-sm` | 14px | 400 | 1.5 | Secondary text, captions |
| `text-base` | 16px | 400 | 1.6 | Body copy, review text |
| `text-lg` | 18px | 600 | 1.4 | Card titles, section headers |
| `text-xl` | 20px | 600 | 1.3 | Movie title on detail page (mobile) |
| `text-2xl` | 24px | 600 | 1.3 | Movie title on detail page (desktop) |
| `text-3xl` | 30px | 700 | 1.2 | Page h1 headings |
| `text-4xl` | 36px | 700 | 1.1 | Hero / backdrop title |

Minimum body text size: 16px (body copy). Labels and metadata minimum: 12px only for non-essential supplementary text.

### 4.4 Spacing System

Based on 4px base unit (Tailwind default: `space-1 = 4px`):

| Token | Value | Common Usage |
|-------|-------|-------------|
| `space-1` | 4px | Icon gap, tight spacing |
| `space-2` | 8px | Button padding, input padding |
| `space-3` | 12px | Card internal spacing |
| `space-4` | 16px | Section gap, form field spacing |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Section margins |
| `space-12` | 48px | Large section gaps |
| `space-16` | 64px | Page-level vertical rhythm |

### 4.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Input fields, small badges |
| `rounded` | 8px | Buttons, small cards |
| `rounded-lg` | 12px | Movie cards, review cards |
| `rounded-xl` | 16px | Modals, main content cards |
| `rounded-full` | 9999px | Avatars, tags/chips |

---

## 5. Accessibility Specification

### 5.1 WCAG 2.1 AA Compliance Per Component

#### Global Requirements
- All pages must have a unique, descriptive `<title>` tag.
- Skip-to-main-content link as the first focusable element on every page: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`
- Landmark regions: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` used correctly.
- Heading hierarchy: h1 once per page, h2 for major sections, h3 for items within sections. No skipping levels.
- Language attribute: `<html lang="en">`.

#### Color Contrast (WCAG 1.4.3 / 1.4.11)
- Normal text (< 18px regular / < 14px bold): minimum 4.5:1 contrast ratio.
- Large text (≥ 18px regular / ≥ 14px bold): minimum 3:1 contrast ratio.
- UI components and graphical objects: minimum 3:1 against adjacent colors.
- Star rating icons: filled stars (#FCD34D on #0F1117): 8.2:1 — PASS. Empty stars: non-informative decoration, supplemented by aria-label for count.

#### Focus Management (WCAG 2.4.7 / 2.4.3)
- All interactive elements must have a visible focus indicator (`focus-visible` CSS pseudo-class).
- Focus ring: `outline: 2px solid var(--color-primary); outline-offset: 2px` — minimum 3:1 contrast.
- Never suppress focus indicators without replacing them.
- Modal dialogs: focus trapped inside when open; focus returns to trigger element on close.
- After route navigation (Next.js): focus moved to `<main>` or page `h1`.

#### Keyboard Navigation (WCAG 2.1.1)
- All functionality accessible via keyboard (Tab, Shift+Tab, Enter, Space, Arrow keys).
- Dropdown menus: Arrow keys navigate between items; Escape closes.
- Star rating widget: Left/Right arrows change selection; Tab moves to next interactive element.
- Review delete confirmation: Tab cycles between Cancel and Delete buttons; Escape closes without deleting.
- Filter panel: Tab through checkboxes; Space to check/uncheck.
- Movie cards: Enter/Space activates the card link.

#### Images (WCAG 1.1.1)
- Movie posters: `alt="[Movie Title] movie poster"` — always present.
- User avatars: `alt="[Display Name]'s profile picture"` — always present.
- Backdrop images: `role="img" aria-label="[Movie Title] backdrop"` or `alt=""` if purely decorative.
- TMDB logo attribution: `alt="Powered by TMDB"`.
- Star icons (display only): aria-hidden="true"; surrounding element carries the accessible label.

#### Forms (WCAG 1.3.1 / 3.3.1 / 3.3.2)
- All form inputs have visible, associated `<label>` elements (not placeholder-only).
- Required fields marked with `aria-required="true"` and visual indicator.
- Validation errors: `aria-invalid="true"` on the input; error message linked via `aria-describedby`.
- Character counter: `aria-live="polite"` so screen readers announce the count on change.
- Form submission errors: `role="alert"` or focus moved to the first error field.

#### Review Submission Form Specific:
```html
<form aria-label="Write a review for [Movie Title]">
  <label for="review-body">Your review</label>
  <textarea
    id="review-body"
    aria-required="true"
    aria-invalid="false"
    aria-describedby="review-body-counter review-body-error"
    maxlength="500"
  ></textarea>
  <span id="review-body-counter" aria-live="polite">
    450 / 500 characters remaining
  </span>
  <span id="review-body-error" role="alert" aria-hidden="true">
    Review cannot exceed 500 characters
  </span>
  <button type="submit">Submit Review</button>
</form>
```

#### Star Rating Widget Specific:
```html
<fieldset>
  <legend>Rate this movie (required)</legend>
  <div role="radiogroup" aria-labelledby="rating-legend">
    <label class="star-label">
      <input type="radio" name="movie-rating" value="1" aria-label="1 star" />
      <span aria-hidden="true">★</span>
    </label>
    <label class="star-label">
      <input type="radio" name="movie-rating" value="2" aria-label="2 stars" />
      <span aria-hidden="true">★</span>
    </label>
    <!-- ... 3, 4, 5 -->
  </div>
</fieldset>
```

#### Modals / Dialogs (WCAG 4.1.3)
```
Role: role="dialog" (non-blocking) or role="alertdialog" (confirmation, interruption)
aria-modal="true"
aria-labelledby="[dialog-title-id]"
aria-describedby="[dialog-description-id]"
Focus trap: Tab and Shift+Tab cycle within dialog only
Escape key: closes dialog, focus returns to trigger
```

#### Dynamic Content (WCAG 4.1.3)
- Review list updates (after submit): new review inserted at top; `aria-live="polite"` region announces "Review submitted successfully".
- TMDB API error banner: `role="status"` region.
- Toast notifications (Sonner): `role="status"` for info/success; `role="alert"` for error.
- Loading skeletons: `aria-busy="true"` on the container while loading.

#### Admin-Specific Accessibility
- Flag count badge on reviews: `<span aria-label="[N] flags reported">` — screen reader reads full context.
- Moderation action buttons differentiated by aria-label including review and author name.
- Confirmation dialogs for all destructive actions (hide, delete, restore).
- Audit log table: `<table>` with `<caption>`, `<th scope="col">` for all column headers.

### 5.2 Testing Protocol

| Tool | When | What |
|------|------|-------|
| `axe-core` (via `jest-axe`) | CI — every component test | Zero critical/serious violations |
| Chrome DevTools Accessibility Tree | Manual — per page | Landmark structure, heading order |
| Keyboard navigation test | Manual — per page | All interactive elements reachable |
| Screen reader test (NVDA + Firefox) | Manual — milestone builds | Review form, star widget, modals |
| Contrast ratio checker (WebAIM) | Design system review | All color pairs in Section 4.2 |

---

## 6. Responsive Breakpoints

Three breakpoints align with Tailwind CSS defaults:

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile (base) | 375px–767px | Single column; hamburger menu; filter panel in drawer; 2-column movie grid; stacked detail page |
| Tablet (`md`) | 768px–1279px | 3-column movie grid; filter panel collapsible sidebar; detail page: poster beside metadata |
| Desktop (`lg`) | 1280px+ | 4-column movie grid; persistent filter panel sidebar; full detail layout as wireframed above |

### 6.1 Breakpoint-Specific Behavior

**Header:**
- Mobile: Logo + icon buttons (search, avatar/login) + hamburger. Nav links in slide-out drawer.
- Tablet+: Logo + inline search bar (expanded) + nav links + avatar button.

**Search Bar:**
- Mobile: Icon button in header; expands to full-width overlay on tap.
- Tablet+: Inline expanded in header, always visible.

**Filter Panel:**
- Mobile: Hidden behind "Filters" button; slides up as bottom sheet.
- Tablet: Collapsible sidebar (toggle button).
- Desktop: Always-visible left sidebar (240px wide).

**Movie Grid:**
- Mobile: 2 columns.
- Tablet: 3 columns.
- Desktop: 4 columns.

**Movie Detail Page:**
- Mobile: Poster stacked above metadata; metadata below.
- Tablet+: Poster floated left (w-48), metadata beside it.

**Admin Dashboard:**
- Mobile: Summary cards stack vertically; admin nav becomes a hamburger menu.
- Desktop: 4-column stat cards; side-by-side panels.

**Review Cards:**
- All breakpoints: Full-width stacked cards. No horizontal layout change needed.

### 6.2 Touch Targets (Mobile Accessibility)

All interactive elements on mobile must have a minimum touch target of **44×44px** (WCAG 2.5.5 AAA recommendation, treated as AA requirement for this project):
- Buttons: `min-h-[44px] min-w-[44px]`
- Movie cards: sufficient padding
- Star rating: each star ≥ 44×44px on mobile (larger hit area than visual star size)
- Navigation links in drawer: `py-3` minimum

---

*Produced by ux-designer — 2026-05-23*
*Reviewed by tech-lead — 2026-05-23*
