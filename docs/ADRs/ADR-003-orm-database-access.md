# ADR-003 — ORM / Database Access Layer

**Status:** Accepted
**Date:** 2026-05-23
**Owner:** solution-architect
**Deciders:** solution-architect, tech-lead
**Phase:** 3 — Architecture

---

## Context

The Movie Review Application uses PostgreSQL 16 as its primary data store (locked in Phase 1 charter). The backend requires a database access layer that:
- Supports TypeScript with strong, auto-generated types derived from the database schema (reducing runtime type errors).
- Enforces parameterized queries exclusively — raw SQL string concatenation must be impossible or strongly discouraged (NFR-023).
- Generates and manages database migrations in a version-controlled, repeatable manner (supporting the Docker Compose deployment model).
- Is compatible with NestJS 10 (ADR-002 decision).
- Supports the data model described in the HLD: users, movies, reviews, ratings, refresh_tokens, audit_log, review_flags.
- Has good query performance for the access patterns: join-heavy movie detail queries, aggregate rating recalculation, cursor-based pagination.

Candidates evaluated: Prisma, TypeORM, Drizzle ORM.

---

## Decision

**Prisma ORM (Prisma Client + Prisma Migrate).**

---

## Rationale

1. **Auto-generated TypeScript types from schema:** Prisma generates fully-typed client code from `schema.prisma`. Every query result, input type, and relation is statically typed. This is the strongest TypeScript integration of the three candidates.

2. **Parameterized queries by default — no escape hatch without explicit raw query syntax:** Prisma's query engine compiles all model-based queries to parameterized SQL. Raw queries require explicit `prisma.$queryRaw` with tagged template literals (which also auto-parameterize). NFR-023 is satisfied at the framework level without relying on developer discipline.

3. **Prisma Migrate:** Schema migrations are defined in `schema.prisma` and tracked in `prisma/migrations/`. Each migration is a versioned, named SQL file committed to source control. Migrations are applied automatically at container startup via `prisma migrate deploy`. This matches the Docker Compose deployment model cleanly.

4. **NestJS integration:** `@nestjs/prisma` (community) or a simple custom `PrismaService` wrapping `PrismaClient` integrates naturally with NestJS DI. Well-documented pattern.

5. **Relation handling:** Prisma's `include` and `select` syntax makes eager-loading explicit and readable (e.g., fetching a review with its user and movie in a single query). No N+1 risk if relations are declared in the schema.

6. **Prisma Studio (dev tooling):** Browser-based DB inspector useful during development; not required in production.

7. **Connection pool:** Prisma manages a built-in connection pool (configurable via `DATABASE_URL` query params), sufficient for home-server scale.

---

## Consequences

**Positive:**
- Fully typed database access eliminates a class of runtime errors (field name typos, wrong types).
- Migration workflow is version-controlled and reproducible.
- Parameterized queries enforce NFR-023 without additional code review burden.
- Schema acts as the single source of truth for the data model, feeding Phase 4 ERD documentation.

**Negative:**
- Prisma adds a build step: `prisma generate` must run before the TypeScript compiler, which adds a small step to the Docker build. Managed via Dockerfile command ordering.
- Complex queries (e.g., window functions, CTEs) require `$queryRaw`. These are infrequent in this application but must be handled carefully.
- Prisma's schema language is its own DSL (not SQL). Team members must learn it, though it is straightforward.
- Prisma Migrate is opinionated; branching migrations with multiple developers can create conflicts. Mitigated by GitHub Flow (one active migration branch at a time).

**Neutral:**
- Prisma generates code rather than using reflection at runtime; the generated `@prisma/client` package is checked in to `node_modules` (or installed from npm). Build artifact is ~5 MB; acceptable.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|
| TypeORM | Mature; decorator-based entity definitions match NestJS style; Active Record + Data Mapper patterns; native PostgreSQL support | TypeScript types less automatically derived (decorators can fall out of sync with schema); migration reliability has been a known pain point in complex projects; query results are typed but require manual type annotation in more cases | Type safety weaker than Prisma; migration reliability concerns for production; ADR-023 enforcement requires more developer discipline |
| Drizzle ORM | Excellent TypeScript inference; SQL-first; smallest abstraction overhead; very fast; growing ecosystem | Younger project (stable but less battle-tested than Prisma/TypeORM); migration tooling (`drizzle-kit`) is less mature; NestJS integration patterns less established; fewer community examples | Ecosystem maturity risk; Prisma's stronger migration tooling is preferred for a structured SDLC project |
| Raw `pg` driver (node-postgres) | Maximum control; no abstraction overhead; full SQL power | All TypeScript types must be written and maintained manually; migration management is manual; very high risk of inconsistent parameterization practices (NFR-023 risk) | Unacceptable NFR-023 risk; disproportionate maintenance burden for this application's complexity |
| Knex.js query builder | More flexible than ORMs; TypeScript support; solid migration system | No automatic type inference from schema; types must be defined manually alongside queries; doesn't eliminate NFR-023 risk fully | TypeScript type inference inferior to Prisma; more boilerplate required |

---

*Produced by solution-architect — 2026-05-23*
