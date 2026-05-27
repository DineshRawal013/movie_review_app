# ADR-002 — Backend Framework Selection

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The Movie Review Application requires a backend API server that:
- Implements a RESTful JSON API (SRS Section 3, all FR endpoints).
- Handles Google OAuth 2.0 callback, JWT issuance, and token refresh (FR-030 to FR-037).
- Enforces authentication guards, role-based authorization (Admin), CSRF protection, and rate limiting.
- Integrates with PostgreSQL via an ORM (decision in ADR-003) and Redis.
- Proxies and caches TMDB API responses.
- Produces structured logs (NFR-053) and supports high unit test coverage (NFR-050, >= 80%).
- Is written entirely in TypeScript (CON-008).
- Runs in a Docker container under Docker Compose.

Candidates evaluated: Express (with/without frameworks), Fastify, NestJS.

---

## Decision

**NestJS 10 with TypeScript.**

---

## Rationale

1. **Architectural structure out of the box:** NestJS enforces a module/controller/service/guard pattern that maps directly to the application's bounded contexts (auth, movies, reviews, ratings, users, admin). This structure significantly reduces the risk of a sprawling, poorly organized codebase — critical for a project with 9+ bounded contexts.

2. **TypeScript native:** NestJS is designed from the ground up for TypeScript with full decorator support. Express and Fastify support TypeScript but require significant additional configuration to achieve the same type safety.

3. **Built-in dependency injection (DI):** DI makes unit testing straightforward — services can be instantiated with mock dependencies. This directly supports NFR-050 (>= 80% unit test coverage). Express requires manual wiring or a separate DI library.

4. **Passport.js integration:** `@nestjs/passport` provides first-class adapters for `passport-google-oauth20` and `passport-jwt`, exactly matching the auth requirements (FR-030 to FR-037). Minimal boilerplate vs. raw Express Passport integration.

5. **Built-in guards, interceptors, and pipes:** NestJS Pipes enforce DTO validation (review body <= 500 chars, NFR-023 parameterized queries via Prisma), Guards handle JWT and role-based authorization, Interceptors handle structured logging. These cross-cutting concerns are solved at the framework level.

6. **Throttler module:** `@nestjs/throttler` provides configurable rate limiting (NFR-025) with a Redis storage backend, directly addressing the auth and review-submission rate limit requirements.

7. **Config module with validation:** `@nestjs/config` with Joi schema validation ensures all required environment variables are present at startup (NFR-052, NFR-026).

8. **HTTP module for TMDB:** `@nestjs/axios` wraps Axios with NestJS DI, making the TMDB integration module testable and injectable.

9. **OpenAPI generation:** `@nestjs/swagger` auto-generates the OpenAPI 3.0 spec from controllers and DTOs, which feeds the `/docs/api-spec.yaml` artifact required in Phase 4.

---

## Consequences

**Positive:**
- Well-defined module boundaries reduce coupling between auth, movies, reviews, and admin.
- Built-in testing utilities (`@nestjs/testing`) make unit and integration tests straightforward.
- Swagger auto-generation reduces manual work for Phase 4 API spec.
- Guard/Interceptor/Pipe pipeline makes security layers auditable in isolation.

**Negative:**
- NestJS has a steeper learning curve than plain Express for developers unfamiliar with Angular-style decorator patterns.
- More abstraction layers than Express/Fastify; debugging requires understanding the NestJS lifecycle.
- Slightly higher memory footprint than Fastify due to the DI container (acceptable: home server has >= 4 GB RAM per ASM-004).

**Neutral:**
- NestJS runs on top of Express (default) or Fastify (optional adapter). Express is used as the default; Fastify adapter is a future option if throughput becomes a concern.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| Express + manual structure | Maximum flexibility; minimal overhead; huge ecosystem | Zero structure enforcement; auth, validation, DI must be assembled manually; high risk of inconsistent patterns; harder to test; significantly more setup work | Lacks structure for a 9-module application; the benefit of flexibility is outweighed by the cost of convention establishment |
| Fastify | Fastest Node.js HTTP framework; JSON schema validation built-in | Less mature ecosystem for OAuth/Passport integration; DI and module patterns must be added (e.g., via `@fastify/autoload`); less tooling for OpenAPI generation | Performance advantage is not material for home-server scale; missing ecosystem pieces increase risk |
| Hapi.js | Strong validation; good auth plugin ecosystem | Smaller community; less TypeScript tooling; fewer developers familiar with it; declining adoption trend | Community size and adoption trend represent a long-term maintenance risk |
| Koa | Lightweight, clean middleware pattern | No structure; requires complete DIY assembly of auth, DI, validation; same risk as Express without the compensating ecosystem | Same structural concerns as Express |

---

*Produced by solution-architect — 2026-05-23*
