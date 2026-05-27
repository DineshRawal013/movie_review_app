# ADR-001 — Frontend Framework Selection

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The Movie Review Application requires a web frontend that:
- Delivers public-facing pages (browse, movie detail, search results) fast enough to meet NFR-001 (< 2s page load on LAN).
- Is written entirely in TypeScript (CON-008).
- Supports WCAG 2.1 AA accessibility (NFR-030 to NFR-034).
- Integrates smoothly with a NestJS REST backend over standard HTTP.
- Runs inside a Docker container as part of a Docker Compose deployment on a home server.

The candidate frameworks evaluated are React (CRA/Vite SPA), Next.js (React meta-framework), Vue 3, and Svelte/SvelteKit.

---

## Decision

**Next.js 14 (App Router) with React 18 and TypeScript.**

---

## Rationale

Next.js is chosen over the alternatives for the following reasons:

1. **Server-Side Rendering (SSR) and Static Generation:** Public pages (browse, movie detail, search results) benefit significantly from SSR — content is available in the initial HTML payload, reducing Time-to-First-Contentful-Paint and meeting the < 2s load time NFR-001 without requiring the client to fetch all data after hydration.

2. **TypeScript first-class support:** Next.js ships TypeScript configuration out of the box. React 18 + TypeScript has the deepest ecosystem support (typed component libraries, tooling, AI assistant knowledge).

3. **File-based routing:** Matches the URL structure specified in the SRS (`/movies/{tmdb-id}`, `/profile`, `/users/{userId}`, `/admin`). Zero manual routing configuration.

4. **Image optimization:** `next/image` handles movie poster lazy loading, responsive sizes, and enforces `alt` text at the TypeScript type level (supports NFR-032).

5. **API Routes (optional escape hatch):** Next.js API routes can proxy backend calls if needed during development, without committing to BFF pattern.

6. **Ecosystem and community maturity:** Next.js is the dominant React meta-framework (2024–2025). Extensive library compatibility. Long-term support by Vercel; framework is independent of Vercel hosting.

7. **Docker compatibility:** Next.js produces a standalone build (`output: 'standalone'`) that runs in an Alpine Node.js image with minimal dependencies.

---

## Consequences

**Positive:**
- SSR reduces frontend-perceived load time, directly supporting NFR-001.
- Incremental Static Regeneration (ISR) can be used in a future version to cache rendered pages.
- Mature accessibility patterns available via React Aria / Headless UI.
- `next/image` reduces poster image payload size automatically.

**Negative:**
- Next.js App Router (React Server Components) introduces a conceptual split between server and client components; developers must understand when to use `"use client"` directive. This adds initial learning overhead.
- Bundle size is larger than a pure Svelte application (acceptable for this use case).
- SSR adds latency compared to a pre-rendered static page (mitigated by the LAN deployment target).

**Neutral:**
- Requires Node.js runtime container (same runtime as the backend, simplifying base image choice).

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| React (Vite SPA) | Simpler setup, fast HMR | No SSR; all data fetching client-side; page loads fail NFR-001 without extra optimization | NFR-001 risk; no SSR without significant additional work |
| Vue 3 + Nuxt | SSR support, good DX | TypeScript support slightly less mature than React ecosystem; smaller team familiarity; less library support for accessibility component primitives | Team default is React/Next.js stack; Vue would be a departure from established team conventions |
| Svelte / SvelteKit | Smallest bundle, excellent performance | Smaller ecosystem; fewer typed component libraries; less team familiarity; tooling (e.g., axe-core integration) less mature | Ecosystem risk for a v1.0 production delivery timeline |
| Angular | Strong TypeScript, DI container | High boilerplate; steep learning curve; overkill for this application size; bundle size | Complexity disproportionate to project scale |

---

*Produced by solution-architect — 2026-05-23*
