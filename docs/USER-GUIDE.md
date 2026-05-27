# User Guide — Movie Review Application

**Document ID:** USER-GUIDE-1.0
**Owner:** technical-writer
**Status:** COMPLETE
**Version:** 1.0
**Date:** 2026-05-26
**Application Version:** v1.0.0
**Produced by:** technical-writer (Phase 9 — Handover)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started — Account Setup (Google OAuth)](#2-getting-started--account-setup-google-oauth)
   - 2.1 [Requirements](#21-requirements)
   - 2.2 [Creating Your Account](#22-creating-your-account)
   - 2.3 [Signing Back In](#23-signing-back-in)
   - 2.4 [Signing Out](#24-signing-out)
3. [Browsing Movies](#3-browsing-movies)
   - 3.1 [The Home Page](#31-the-home-page)
   - 3.2 [Trending and Popular Sections](#32-trending-and-popular-sections)
   - 3.3 [Pagination](#33-pagination)
4. [Searching and Filtering Movies](#4-searching-and-filtering-movies)
   - 4.1 [Using the Search Bar](#41-using-the-search-bar)
   - 4.2 [Filtering by Genre and Year](#42-filtering-by-genre-and-year)
   - 4.3 [Removing Filters](#43-removing-filters)
   - 4.4 [No Results Found](#44-no-results-found)
5. [Movie Detail Pages](#5-movie-detail-pages)
6. [Writing, Editing, and Deleting Reviews](#6-writing-editing-and-deleting-reviews)
   - 6.1 [Writing a Review](#61-writing-a-review)
   - 6.2 [Editing Your Review](#62-editing-your-review)
   - 6.3 [Deleting Your Review](#63-deleting-your-review)
7. [Rating Movies](#7-rating-movies)
   - 7.1 [Submitting a Star Rating](#71-submitting-a-star-rating)
   - 7.2 [Updating Your Rating](#72-updating-your-rating)
   - 7.3 [Removing Your Rating](#73-removing-your-rating)
8. [Flagging Reviews](#8-flagging-reviews)
9. [Managing Your Profile](#9-managing-your-profile)
   - 9.1 [Viewing Your Profile](#91-viewing-your-profile)
   - 9.2 [Viewing Another User's Profile](#92-viewing-another-users-profile)
10. [Privacy and GDPR — Data Deletion](#10-privacy-and-gdpr--data-deletion)
    - 10.1 [What Data We Store](#101-what-data-we-store)
    - 10.2 [Deleting Your Account (Right to Erasure)](#102-deleting-your-account-right-to-erasure)
    - 10.3 [Privacy Policy](#103-privacy-policy)
11. [Accessibility](#11-accessibility)
12. [Troubleshooting](#12-troubleshooting)
13. [Admin Panel Guide](#13-admin-panel-guide)

---

## 1. Introduction

The Movie Review Application is a web platform that lets you discover films sourced from The Movie Database (TMDB), submit star ratings and text reviews, and read what other community members think. The application is English-only and designed to run as a self-hosted web service on a home server.

**User roles in the application:**

| Role | Who They Are | What They Can Do |
|------|-------------|-----------------|
| Guest | Any visitor, not signed in | Browse movies, read reviews and ratings, search and filter |
| Registered User | Signed in with Google | All Guest actions plus: submit/edit/delete own reviews and ratings, flag reviews, manage profile |
| Admin | Registered User with elevated privilege | All Registered User actions plus: manage the movie catalogue, moderate reviews, manage user roles |

This guide covers the Registered User experience. The Admin Panel is covered in [Section 13](#13-admin-panel-guide).

---

## 2. Getting Started — Account Setup (Google OAuth)

### 2.1 Requirements

- A modern web browser (Chrome, Firefox, Safari, or Edge — latest two versions).
- A Google account.
- JavaScript must be enabled.

No password is required. The application uses Google's OAuth 2.0 sign-in, so your Google credentials are never shared with this application.

### 2.2 Creating Your Account

Your account is created automatically the first time you sign in. There is no separate registration form.

1. Navigate to the application's home page.
2. Click **Sign in with Google** in the navigation header.
3. You are redirected to Google's sign-in page. Choose the Google account you want to use.
4. Review and accept the permissions requested (the application requests access to your name, email address, and profile photo only).
5. Google redirects you back to the application. Your account is created and you are signed in immediately.
6. Your display name and avatar are pulled automatically from your Google profile.

If the sign-in fails or you cancel at the Google page, you are returned to the sign-in page with an error message. No partial account is created.

### 2.3 Signing Back In

On subsequent visits, repeat the same steps. If you use the same Google account, your existing account and all your reviews and ratings are retrieved automatically.

Your session is maintained via a secure cookie. If you close the browser, you may be asked to sign in again after the session expires (sessions last up to 7 days from your last activity). The application silently refreshes short-lived tokens in the background while you are active.

### 2.4 Signing Out

1. Click your avatar or display name in the navigation header.
2. Select **Sign out**.
3. You are signed out immediately and returned to the home page as a Guest.

Signing out invalidates your session. If you share a computer, always sign out when finished.

---

## 3. Browsing Movies

### 3.1 The Home Page

The home page displays a grid of movie cards sourced from TMDB. Each card shows:

- Movie poster image
- Title
- Release year
- Community average star rating (or "No ratings yet" if no ratings have been submitted)

Click any card to open the movie's detail page.

### 3.2 Trending and Popular Sections

The home page prominently features a **Trending / Popular** section at the top, showing currently popular movies from TMDB's popular movies list. This list is refreshed from TMDB approximately once per hour; you may see a brief "data may be outdated" notice if TMDB is temporarily unavailable, in which case cached data is displayed.

### 3.3 Pagination

The browse list is paginated. Use the **Previous** and **Next** controls at the bottom of the page, or click a page number, to load more results. Each page shows up to 20 movies by default.

---

## 4. Searching and Filtering Movies

### 4.1 Using the Search Bar

The search bar is accessible from every page in the navigation header.

1. Click the search bar and type the title (or partial title) of a movie.
2. Press **Enter** or click the search icon.
3. Matching movies appear as cards within 2 seconds.

If no local results are found, the application searches TMDB live and caches the results.

### 4.2 Filtering by Genre and Year

On the browse and search results pages you can narrow results using filters:

- **Genre filter:** Select a genre from the dropdown (e.g., Action, Drama, Comedy). Only movies tagged with that genre are shown.
- **Year range filter:** Enter a "From" and/or "To" year to filter movies by release date. For example, entering From: 2000 and To: 2010 shows only movies released in that decade.

Filters can be combined: you can apply a genre filter and a year range at the same time.

### 4.3 Removing Filters

Active filters appear as tags or chips below the search bar. Each active filter has an **X** button. Click it to remove that individual filter and restore the broader result set. Removing all filters returns you to the unfiltered browse view.

### 4.4 No Results Found

If a search returns no movies, a message such as "No movies found for '[your query]'" is displayed. This is not an error — try a different spelling or use fewer words.

---

## 5. Movie Detail Pages

Click any movie card to open its detail page. The detail page displays:

- **Title and year**
- **Poster and backdrop images**
- **Release date** and **genres**
- **Synopsis** (overview from TMDB)
- **Aggregate community rating** — the mean star rating from all community submissions, rounded to one decimal place, and the total number of ratings
- **Community reviews** — all submitted reviews, sorted newest first, each showing the reviewer's name, avatar, star rating, review text, and submission date/time
- **Trailer link** (when available from TMDB, links to YouTube)

If you are a Guest, a prompt invites you to sign in to leave a review. If you are a Registered User, the review submission form is displayed inline.

Each movie has a unique URL in the form `/movies/{id}`. You can bookmark or share this URL directly.

---

## 6. Writing, Editing, and Deleting Reviews

You must be signed in to write a review. Each user may submit one review per movie.

### 6.1 Writing a Review

1. Open a movie's detail page.
2. Scroll down to the **Write a Review** section.
3. Type your review in the text box. A live character counter shows how many characters remain (maximum 500).
4. Click **Submit Review**.

Your review appears immediately in the reviews list. The review includes your display name, avatar, and the submission date/time.

Validation rules:
- The review must be between 1 and 500 characters.
- Blank or whitespace-only reviews are rejected with a validation message.
- If you try to submit more than 500 characters, the client blocks the submission and shows "Review cannot exceed 500 characters". The server also enforces this limit.

### 6.2 Editing Your Review

1. Locate your review on the movie's detail page.
2. Click the **Edit** button on your review card.
3. Modify the text in the edit form.
4. Click **Save**.

Your updated review is displayed immediately. An "edited" indicator and the edit timestamp appear on the review card so other users know it has been updated.

### 6.3 Deleting Your Review

1. Locate your review on the movie's detail page.
2. Click the **Delete** button on your review card.
3. Confirm the deletion in the confirmation dialog.

The review is permanently removed and no longer appears on the page. Deletion cannot be undone.

---

## 7. Rating Movies

Star ratings are independent of text reviews. You can rate a movie without writing a review, and vice versa. Each user may submit one rating per movie.

### 7.1 Submitting a Star Rating

1. Open a movie's detail page.
2. Locate the star rating widget (five stars).
3. Hover over the stars to preview your selection.
4. Click the star that represents your rating (1 = lowest, 5 = highest).

The aggregate community rating updates immediately to reflect your contribution.

The star rating widget is keyboard-accessible: tab to the widget, then use the arrow keys to select a star, and press Enter or Space to confirm.

### 7.2 Updating Your Rating

Click a different star on the same movie's detail page. Your existing rating is replaced and the aggregate updates accordingly.

### 7.3 Removing Your Rating

Click the currently selected star (the one you previously clicked) or look for a **Remove rating** option below the widget. Your rating is removed and the aggregate recalculates.

---

## 8. Flagging Reviews

If you encounter a review that you believe violates community standards or is otherwise inappropriate, you can flag it for admin review.

1. Locate the review on the movie's detail page.
2. Click the **Flag** button (the flag icon) on the review card.
3. The flag is recorded immediately and the review appears in the admin moderation queue.

Each user can flag a given review only once. Flagging a review does not remove it from public view — it draws admin attention to it. If you accidentally flag a review, click the flag icon again to remove your flag.

---

## 9. Managing Your Profile

### 9.1 Viewing Your Profile

1. Click your avatar or display name in the navigation header.
2. Select **My Profile** (or navigate directly to `/profile`).

Your profile page displays:

- Your Google display name and avatar
- Your member-since date
- A list of all reviews you have submitted, each with a link to the corresponding movie page

### 9.2 Viewing Another User's Profile

Navigate to `/users/{userId}` where `{userId}` is the user's internal ID. You can reach another user's profile by clicking their name or avatar on a review card. Public profiles show the user's display name, avatar, member-since date, and their submitted reviews.

Email addresses are never displayed on public profiles.

---

## 10. Privacy and GDPR — Data Deletion

### 10.1 What Data We Store

The application stores only the minimum personal data required to provide the service:

| Data Item | Source | Stored? | Displayed Publicly? |
|-----------|--------|---------|-------------------|
| Google user ID | Google OAuth | Yes | No |
| Display name | Google profile | Yes | Yes (on reviews, profile) |
| Email address | Google profile | Yes | No (internal only) |
| Profile photo URL | Google profile | Yes | Yes (avatar on reviews, profile) |
| Reviews you write | You | Yes | Yes |
| Star ratings you submit | You | Yes | Aggregated only |
| Account creation date | Generated | Yes | Yes (profile page) |

No payment data, location data, or additional PII is collected.

### 10.2 Deleting Your Account (Right to Erasure)

You have the right to permanently erase your account and all associated data at any time. This complies with GDPR Article 17 (Right to Erasure).

When you delete your account, the following data is permanently erased:

- Your user account record
- All reviews you have submitted (removed from all movie pages immediately)
- All star ratings you have submitted (aggregate ratings recalculate automatically)
- All active sessions and refresh tokens (you are signed out on all devices)
- All review flags you have submitted

**To delete your account:**

1. Navigate to your profile page (`/profile`).
2. Scroll to the bottom and click **Delete my account**.
3. Read the confirmation message carefully.
4. Type the confirmation text if prompted, then click **Confirm Delete**.

You are signed out immediately and your data is permanently erased. This action cannot be undone.

> Note (v1.0 known behaviour): The account deletion transaction erases all associated data correctly. A future v1.1 release will refine the internal soft-delete behaviour of the user record itself.

### 10.3 Privacy Policy

A full privacy policy is linked from the application footer. Navigate to `/privacy` to read it at any time. The privacy policy describes what data is collected, how it is used, and your rights as a data subject.

---

## 11. Accessibility

The Movie Review Application is designed to meet WCAG 2.1 Level AA accessibility standards.

- **Keyboard navigation:** All interactive elements (buttons, links, forms, star rating widget) are reachable and operable using the keyboard alone. Use Tab to move forward and Shift+Tab to move backward through interactive elements.
- **Screen reader support:** All non-decorative images (movie posters, avatars) have descriptive alt text. Form inputs are labelled. The star rating widget uses `role="radiogroup"` with individual star buttons labelled by their value (e.g., "Rate 3 out of 5").
- **Focus indicators:** Visible focus outlines appear on all interactive elements when navigating by keyboard.
- **Colour contrast:** The application uses a colour palette that meets the 4.5:1 contrast ratio for normal text and 3:1 for large text.

If you encounter an accessibility barrier, please report it to the application administrator.

---

## 12. Troubleshooting

**I clicked "Sign in with Google" but nothing happened.**
Ensure pop-ups are not blocked for this site. The Google OAuth flow opens in the same tab (redirect, not a pop-up), so this is usually a JavaScript issue. Ensure JavaScript is enabled in your browser.

**My session expired while I was on the page.**
The application silently refreshes your session in the background. If your refresh token has expired (after 7 days of inactivity), you are redirected to the sign-in page with the message "Your session has expired. Please sign in again." Simply sign in again.

**I submitted a review but it does not appear.**
If you already have a review for this movie, the form will show an error ("You have already submitted a review for this movie"). You can edit your existing review using the Edit button on your review card.

**The movie I am looking for does not appear in search results.**
Try a slightly different spelling or a shorter search term. If the movie is not in the local catalogue, the application will search TMDB live. If TMDB is temporarily unavailable, try again in a few minutes.

**I see "Movie data is temporarily unavailable."**
This means the application cannot reach TMDB at the moment. Cached data is displayed where available. The issue is usually resolved within a few minutes.

**I accidentally deleted my review — can it be recovered?**
No. Review deletion is permanent. Please be certain before confirming deletion.

---

## 13. Admin Panel Guide

This section is intended for users with Admin role only.

The Admin panel is accessible from the navigation header when you are signed in as an Admin. It provides three sections: **Moderation**, **Movies**, and **Users**.

### 13.1 Review Moderation

Navigate to **Admin > Moderation**.

The moderation queue lists all reviews in the system. Use the filter controls to view:
- **All** — every review, including hidden ones
- **Flagged** — reviews that registered users have flagged as inappropriate
- **Recent** — most recently submitted reviews

Each review card in the queue shows the review text, author, submission date, and the number of flags it has received.

**Available moderation actions:**

| Action | Effect | Reversible? |
|--------|--------|------------|
| Hide | Makes the review invisible to the public but keeps it in the database | Yes — use Restore |
| Restore | Makes a previously hidden review visible again | Yes — use Hide |
| Delete | Permanently removes the review from the database | No |

All moderation actions are recorded in an immutable audit log with the action type, target review ID, admin ID, and timestamp. To view the audit log, navigate to **Admin > Audit Log**.

### 13.2 Movie Management

Navigate to **Admin > Movies**.

**Adding a movie from TMDB:**
1. Click **Add Movie**.
2. Search for the movie by title using the TMDB search field.
3. Select the correct result from the list.
4. Click **Confirm**. The movie's metadata is fetched from TMDB and cached in the local database.

The movie immediately becomes discoverable in browse and search views.

**Refreshing movie metadata:**
If a movie's information from TMDB is outdated, click the **Sync** button on the movie's row in the admin movie list. The latest TMDB data is fetched and the local record is updated.

**Removing a movie:**
Click the **Remove** button on a movie's row. A confirmation dialog warns you that all associated reviews and ratings will also be permanently deleted. Type the confirmation text and click **Confirm Remove**. This action cannot be undone.

### 13.3 User Management

Navigate to **Admin > Users**.

The user list shows all registered users with their display name, email, member-since date, and current admin status.

**Promoting a user to Admin:**
1. Find the user in the list (use the search bar if needed).
2. Click **Promote to Admin**.
3. Confirm the action.

**Demoting an Admin:**
1. Find the admin user in the list.
2. Click **Revoke Admin**.
3. Confirm the action.

You cannot revoke your own admin status if you are the only remaining admin. The system will display an error: "Cannot revoke admin status: you are the only administrator."

---

*Produced by technical-writer — 2026-05-26*
*Reviewed by tech-lead — 2026-05-26*
