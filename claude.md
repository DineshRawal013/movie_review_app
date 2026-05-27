# AI Dev Team — Operating Manual (Strict Waterfall SDLC)

This project uses an 11-agent SDLC team. **You (the human user) are the Product Owner & Sign-Off Authority.** Every phase ends with your approval; no phase begins without it.

## The Team

| Agent | SDLC Phase | Owns |
|-------|-----------|------|
| `tech-lead` | **All phases** | Orchestration, planning, integration, status, sign-offs |
| `product-manager` | Requirements | SRS, BRD, user stories, acceptance criteria |
| `solution-architect` | Architecture | HLD, ADRs, tech stack, NFR strategy |
| `ux-designer` | Design | User flows, wireframes, design system, a11y |
| `database-architect` | Design | ERD, schema, migrations, indexing |
| `backend-engineer` | Design + Build | API spec, server code, business logic |
| `frontend-engineer` | Build | UI code, client state, forms |
| `fullstack-engineer` | Build + Integration | End-to-end glue, dev tooling |
| `qa-engineer` | Test | Test Plan, Test Cases, RTM, defects, release sign-off |
| `devops-engineer` | Deploy + Ops | CI/CD, IaC, monitoring, runbooks |
| `technical-writer` | Documentation | User Manual, API Docs, Release Notes |

## The 9 Phases & Their Gates

```
1. INITIATION       → Project Charter                      [GATE: Charter approved]
2. REQUIREMENTS     → SRS                                  [GATE: SRS signed off]
3. ARCHITECTURE     → HLD + ADRs                           [GATE: HLD signed off]
4. DETAILED DESIGN  → LLD + ERD + API Spec + Wireframes    [GATE: Design package approved]
5. RTM BASELINE     → Requirements Traceability Matrix     [GATE: RTM + Test Plan signed off]
6. BUILD            → Code + Unit Tests + CI               [GATE: Build complete (internal)]
7. TEST             → System / Regression / Perf / UAT     [GATE: UAT signed off]
8. DEPLOY           → Production release                   [GATE: Go-Live signed off]
9. HANDOVER         → Docs + Training + Closure            [GATE: Project Closed]
```

## Document Inventory (single source of truth)

`tech-lead` maintains `/docs/INVENTORY.md` listing every doc, its owner, status, version, and sign-off date.

Mandatory artifacts:
- `/docs/CHARTER.md` — project charter
- `/docs/SRS.md` — Software Requirements Specification
- `/docs/HLD.md` — High-Level Design
- `/docs/ADRs/ADR-NNN-*.md` — Architecture Decision Records
- `/docs/LLD.md` — Low-Level Design (or split per module)
- `/docs/ERD.md` — Entity Relationship Diagram + schema notes
- `/docs/api-spec.yaml` — OpenAPI specification
- `/docs/design/` — wireframes, design system, a11y spec
- `/docs/TEST-PLAN.md` — Master Test Plan
- `/docs/RTM.md` — Requirements Traceability Matrix (LIVING DOC)
- `/docs/test-cases/` — individual test cases
- `/docs/defects/` — defect reports
- `/docs/RELEASE-NOTES.md` — per-release notes
- `/docs/USER-GUIDE.md` — end-user manual
- `/docs/API-REFERENCE.md` — generated API docs
- `/docs/runbooks/` — operational runbooks
- `/docs/CHANGE-REQUESTS/CR-NNN-*.md` — formal change requests after SRS lock
- `/docs/CLOSURE.md` — lessons learned, final RTM, project closure

## How to Start a Project

```
Use the tech-lead subagent to start a new project: [one-paragraph description].
```

`tech-lead` will:
1. Ask 1-3 sharp clarifying questions
2. Produce a Project Charter
3. Wait for your approval
4. Begin Phase 2 (Requirements) by invoking `product-manager`

## How Phase Gates Work

At every gate, `tech-lead` sends you a Sign-Off Request:

```
🛂 PHASE GATE: [Phase Name] — Awaiting Sign-Off

Deliverables produced:
- ✅ [doc 1] — /docs/[path]
- ✅ [doc 2] — /docs/[path]

Quality checks:
- [✅/⚠️/❌] [check item]

Decisions you approved during this phase:
- [decision] → [outcome]

Reply 'approved' to proceed to [next phase], or list changes needed.
```

Until you say **"approved"** (or equivalent), the next phase does not start.

## Change Request Protocol

After SRS sign-off, scope changes are formal. Any agent or you can raise a CR. `tech-lead` formats it, scopes the impact, and asks for your decision.

## Escalation Map

### Routed to YOU by tech-lead (batched at phase gates or when blocking)
- Project scope / charter
- Tech stack / architecture choices
- Build-vs-buy decisions
- Cost-impacting infra / services
- Scope tradeoffs
- Defect deferral
- Compliance & data residency
- Voice/tone for documentation
- UAT acceptance / GO-LIVE / Closure

### Direct to YOU (rare, only when blocking)
- Production incidents (devops, fullstack)
- Critical security findings (backend, qa)
- Discovered untestable requirement (qa)

### Decided by Agents Themselves (no need to bother you)
- Internal implementation details
- Library version picks (within approved stack)
- Code organization within their layer
- Internal naming conventions

## Default Assumptions (override if needed)

Unless you specify otherwise, the team assumes:
- **Web application** (responsive, desktop-first)
- **TypeScript** for new JavaScript code
- **PostgreSQL** as the default database
- **REST APIs** with JSON
- **JWT + refresh token** authentication
- **English** for all UI copy
- **WCAG 2.1 AA** accessibility minimum
- **GDPR-aware** data handling (even if not in EU)
- **Boring tech** wins (proven over trendy)
- **Docker + GitHub Actions** for CI/CD by default

Override any of these in your initial brief or via a Change Request.

## Decision Style

When the team needs a decision, you'll see this format:

```
🚨 DECISION NEEDED: [Topic]

Context: [1-2 sentences]

Options:
A) [Option] — Pros: [...] / Cons: [...] / Cost: [...]
B) [Option] — Pros: [...] / Cons: [...] / Cost: [...]
C) [Option] — Pros: [...] / Cons: [...] / Cost: [...]

Recommendation: [option] because [reason]

What do you want to do?
```

You can:
- Pick one ("A" or "go with B")
- Ask for more options
- Defer with rationale ("decide in Phase 4")
- Say "you decide" — and the team will, documented as an ADR/decision log

## Status Reports

After each work cycle (or on demand), `tech-lead` reports:

```
## Status — [phase] — [date]

✅ Completed since last update:
- [item] (owner)

🔧 In progress:
- [item] — owner: [agent] — ETA: [date]

🚨 Blocked / Decisions needed:
- [batched decisions]

📋 Next up:
- [item]

🛂 Next gate: [phase name] — ETA: [date]
```

## Project-Specific Conventions

> Final decisions locked at Phase 9 Handover — 2026-05-26. Do not override without a Change Request.

- **Project name:** Movie Review App
- **Tech stack:** NestJS 10 + TypeScript (backend), Next.js 14 + TypeScript (frontend)
- **Database:** PostgreSQL 16 via Prisma ORM 5 (migrations managed by `prisma migrate deploy`)
- **Auth strategy:** Google OAuth 2.0 + JWT (httpOnly cookies, SameSite=Strict, CSRF double-submit token)
  - Access token: 15 minutes, RS256 / HS256, cookie name `access_token`
  - Refresh token: 7 days, stored hashed in PostgreSQL `refresh_tokens` table, cookie name `refresh_token`
  - CSRF token: non-httpOnly cookie name `csrf_token`; sent as `X-CSRF-Token` header on all state-changing requests
- **Deployment target:** Docker Compose (single-host, self-hosted home server), GitHub Actions CI/CD
  - Services: nginx (reverse proxy + TLS), frontend (Next.js, port 3000), backend (NestJS, port 4000), db (PostgreSQL, port 5432), redis (Redis 7, port 6379), backup (pg_dump cron)
  - Production compose file: `docker-compose.prod.yml`
- **Caching:** Redis 7 — TMDB responses TTL=3600s; refresh token revocation set; rate limit counters
- **API style:** REST + JSON; base path `/api`; OpenAPI 3.1.0 spec at `/docs/api-spec.yaml`
- **Naming conventions:** snake_case in DB, camelCase on wire, camelCase in JS/TS
- **Branching model:** GitHub Flow (trunk + short-lived feature branches)
- **Versioning:** SemVer — current release v1.0.0
- **Test coverage target:** >= 80% backend statement coverage (achieved: 88.82% at v1.0.0)
- **Accessibility standard:** WCAG 2.1 Level AA
- **TMDB image base URL:** `https://image.tmdb.org/t/p/` (w500 for posters, original for backdrops, w185 for cast profiles)

## Quality Gates (Definition of Done per phase)

| Phase | DoD |
|-------|-----|
| Requirements | All P0/P1 stories have acceptance criteria; NFRs quantified; user signs off |
| Architecture | Every NFR mapped to an architectural decision; all ADRs accepted |
| Design | All requirements traceable to a design element; all API contracts defined |
| RTM Baseline | 100% of P0/P1 reqs have ≥1 planned test case; test plan exit criteria approved |
| Build | All P0/P1 stories merged; unit test coverage ≥ 80%; lint/build/CI green |
| Test | UAT pass rate ≥ 95%; no P0/P1 defects open; NFRs verified |
| Deploy | Smoke tests pass in prod; monitoring active; rollback verified |
| Handover | All docs published; RTM 100% verified; runbooks reviewed |

## What This Process Is Good For

- Regulated industries (finance, healthcare, gov)
- Fixed-scope, fixed-price contracts
- Outsourced development with clear deliverables
- Projects where audit trail matters
- Teams new to working together

## What This Process Trades Off

- Speed of early iteration (requirements lock comes early)
- Late discovery of UX issues (you don't see working software until Phase 6)
- Change cost (CRs add overhead)

If you want lighter / faster, switch the team to Agile/Iterative mode — but for now, this is **strict waterfall**.
