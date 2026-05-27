# Project Charter — Movie Review Application

**Document ID:** CHARTER-1.0
**Owner:** tech-lead
**Status:** Awaiting Sign-Off
**Version:** 1.0
**Date:** 2026-05-23
**Product Owner:** rawaldinesh13@dsu.ac.kr

---

## 1. Project Purpose

Build a web-based Movie Review Application that allows authenticated users to discover movies, write and publish reviews with star ratings, read peer reviews, and manage personal watchlists. Movie metadata (titles, posters, descriptions, cast, genres) is sourced from The Movie Database (TMDB) external API. Authentication is handled exclusively via Google OAuth — no local credential store. The application is self-hosted on the Product Owner's home server.

---

## 2. Goals & Objectives

| # | Goal | Measurable Outcome |
|---|------|--------------------|
| G-1 | Allow users to discover and search movies | Search returns relevant TMDB results in < 2 s |
| G-2 | Allow authenticated users to submit reviews | Review form submits successfully; stored in DB |
| G-3 | Allow users to rate movies (1–5 stars) | Aggregate rating visible on movie detail page |
| G-4 | Allow users to maintain a personal watchlist | Add/remove persists across sessions |
| G-5 | Serve a responsive, accessible UI | WCAG 2.1 AA compliance verified by qa-engineer |
| G-6 | Operate reliably on self-hosted infrastructure | 99% uptime during normal household internet operation |

---

## 3. Scope

### 3.1 In Scope

- User authentication via Google OAuth 2.0 (sign-in / sign-out / session management)
- Movie search and browse powered by TMDB API
- Movie detail page (metadata from TMDB + aggregated community reviews)
- Review creation, editing, and deletion (authenticated users only)
- Star rating system (1–5 stars) tied to reviews
- Personal watchlist (add / remove / view)
- User profile page (display name, avatar from Google, their reviews)
- Responsive web UI (desktop-first, mobile-responsive)
- WCAG 2.1 AA accessibility
- Admin capability to moderate (delete) reviews
- Self-hosted deployment on home server via Docker Compose
- CI/CD pipeline via GitHub Actions
- GDPR-aware data handling (user data export / delete on request)

### 3.2 Out of Scope

- Mobile native apps (iOS / Android)
- Social features (follow / friend system, DMs)
- Video streaming or trailer playback (links to external sources only)
- Payment or subscription model
- Multi-language UI (English only for v1.0)
- Recommendation engine or ML-based personalization
- Integration with any movie platform other than TMDB
- Local / credential-based authentication (email + password)
- Dedicated CDN or cloud hosting (home server only for v1.0)

---

## 4. Stakeholders

| Role | Name / Contact | Responsibility |
|------|---------------|----------------|
| Product Owner | rawaldinesh13@dsu.ac.kr | Sign-off authority; sets priorities; UAT |
| Tech Lead | tech-lead agent | Orchestration, gates, integration, delivery |
| Development Team | Agent team (see CLAUDE.md) | Design, build, test, deploy |
| End Users | Public visitors + registered reviewers | Primary system users |

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| All P0/P1 user stories implemented | 100% |
| Unit test coverage | >= 80% |
| UAT pass rate | >= 95% of test cases |
| Open P0/P1 defects at release | 0 |
| Page load time (home, search, detail) | < 2 s on localhost / LAN |
| WCAG 2.1 AA violations | 0 critical, 0 serious |
| TMDB API integration uptime dependency | Graceful degradation on TMDB outage |
| Successful Docker Compose deployment on home server | Verified by smoke test |

---

## 6. High-Level Timeline

| Phase | Description | Estimated Duration |
|-------|-------------|-------------------|
| 1. Initiation | Project Charter | 1 day |
| 2. Requirements | SRS, user stories, NFRs | 2–3 days |
| 3. Architecture | HLD, ADRs, tech stack | 2–3 days |
| 4. Detailed Design | LLD, ERD, API spec, wireframes | 3–5 days |
| 5. RTM Baseline | RTM v1.0, Master Test Plan | 1–2 days |
| 6. Build | Code, unit tests, CI | 7–10 days |
| 7. Test | System / regression / UAT | 3–5 days |
| 8. Deploy | Prod provisioning, smoke tests | 1–2 days |
| 9. Handover | Docs, runbooks, closure | 1–2 days |
| **Total (estimated)** | | **~21–33 days** |

All estimates assume single-threaded agent work with no major scope changes. Phase gates add buffer between phases.

---

## 7. Approved Tech Stack Defaults

These defaults are locked at charter stage. Changes after SRS sign-off require a formal Change Request.

| Concern | Decision |
|---------|----------|
| Language | TypeScript throughout (frontend + backend) |
| Database | PostgreSQL |
| API style | REST with JSON |
| Authentication | Google OAuth 2.0 (no local credential store) |
| Movie metadata | TMDB API (external) |
| Deployment | Self-hosted home server via Docker Compose |
| CI/CD | GitHub Actions |
| Accessibility | WCAG 2.1 AA minimum |
| Data handling | GDPR-aware (user data export / deletion on request) |
| DB naming | snake_case |
| Wire / JS/TS naming | camelCase |
| Branching model | GitHub Flow (trunk + short-lived feature branches) |
| Versioning | SemVer (MAJOR.MINOR.PATCH) |
| Session / tokens | JWT + refresh token (issued post-Google OAuth handshake) |
| Container orchestration | Docker Compose (single-host, home server scale) |

---

## 8. Risks & Assumptions

### 8.1 Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-1 | TMDB API rate limits or breaking changes | Medium | High | Cache TMDB responses in DB; degrade gracefully on API failure |
| R-2 | Google OAuth credential misconfiguration | Low | High | Document setup steps in runbook; test in staging before prod |
| R-3 | Home server downtime (power, internet) | Medium | Medium | Out of scope to mitigate for v1.0; document restart runbook |
| R-4 | Scope creep beyond v1.0 boundaries | Medium | Medium | Formal Change Request required after SRS sign-off |
| R-5 | GDPR non-compliance for user data | Low | High | GDPR-aware patterns applied from design phase |
| R-6 | Single developer / agent bottleneck | Low | Medium | Parallel agent work where safe (Phase 4, Phase 6) |

### 8.2 Assumptions

- Product Owner has a TMDB API key (free tier) and can provide it during build phase.
- Product Owner has a Google Cloud project with OAuth 2.0 credentials (or can create one).
- Home server runs a modern Linux OS, has Docker and Docker Compose installed (or installable).
- Home server has a stable internet connection sufficient for self-hosting.
- No SLA or uptime guarantee beyond "best effort on personal hardware."
- No budget constraints on open-source tooling; TMDB free tier is sufficient for development.
- English is the sole UI language for v1.0.
- The Product Owner is both the admin user and the primary tester for UAT.

---

## 9. Constraints

- Deployment target is fixed: home server only (no cloud migration in v1.0).
- Authentication is Google OAuth only — no fallback local auth.
- Movie data source is TMDB only — no other data providers.
- UI language is English only for v1.0.

---

## 10. Definition of Done (Project Level)

The project is complete when:
1. All P0/P1 user stories are implemented and pass UAT.
2. Application is running on the home server with smoke tests green.
3. All SDLC artifacts are published under `/docs/`.
4. RTM shows 100% requirement-to-test-case coverage for P0/P1.
5. Product Owner has signed off on closure.

---

*Produced by tech-lead — 2026-05-23*
