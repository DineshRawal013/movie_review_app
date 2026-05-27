# Document Inventory — Movie Review Application

**Maintained by:** tech-lead
**Last Updated:** 2026-05-26 (Phase 9 — Handover complete; project closed)
**Version:** 1.7

This is the single source of truth for all SDLC artifacts. Updated at every phase gate.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| PLANNED | Artifact defined; work not started |
| DRAFT | Work in progress |
| REVIEW | Produced; awaiting tech-lead review |
| APPROVED | Signed off by Product Owner |
| COMPLETE | Final — project closed |
| SUPERSEDED | Replaced by a newer version |

---

## Artifact Registry

| # | Artifact | File Path | Owner | Phase | Status | Version | Sign-Off Date |
|---|----------|-----------|-------|-------|--------|---------|---------------|
| 1 | Project Charter | /docs/CHARTER.md | tech-lead | 1 – Initiation | COMPLETE | 1.0 | 2026-05-23 |
| 2 | Document Inventory | /docs/INVENTORY.md | tech-lead | 1 – Initiation | COMPLETE | 1.7 | 2026-05-26 |
| 3 | Software Requirements Specification | /docs/SRS.md | product-manager | 2 – Requirements | COMPLETE | 1.0 | 2026-05-23 |
| 4 | High-Level Design | /docs/HLD.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 5 | ADR-001: Frontend Framework | /docs/ADRs/ADR-001-frontend-framework.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6 | ADR-002: Backend Framework | /docs/ADRs/ADR-002-backend-framework.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6a | ADR-003: ORM / Database Access | /docs/ADRs/ADR-003-orm-database-access.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6b | ADR-004: Caching Strategy | /docs/ADRs/ADR-004-caching-strategy.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6c | ADR-005: TMDB Integration Pattern | /docs/ADRs/ADR-005-tmdb-integration-pattern.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6d | ADR-006: Authentication Middleware | /docs/ADRs/ADR-006-authentication-middleware.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 6e | ADR-007: Deployment Topology | /docs/ADRs/ADR-007-deployment-topology.md | solution-architect | 3 – Architecture | COMPLETE | 1.0 | 2026-05-23 |
| 7 | Low-Level Design | /docs/LLD.md | backend-engineer + database-architect | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 8 | Entity Relationship Diagram + Schema | /docs/ERD.md | database-architect | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 9 | OpenAPI Specification | /docs/api-spec.yaml | backend-engineer | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 10 | Wireframes | /docs/design/wireframes.md | ux-designer | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 10a | Design System | /docs/design/design-system.md | ux-designer | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 11 | Accessibility Specification | /docs/design/design-system.md (Section 4) | ux-designer | 4 – Detailed Design | COMPLETE | 1.0 | 2026-05-24 |
| 12 | Requirements Traceability Matrix | /docs/RTM.md | qa-engineer | 5 – RTM Baseline / 7 – Test | COMPLETE | 2.1 | 2026-05-26 |
| 13 | Master Test Plan | /docs/TEST-PLAN.md | qa-engineer | 5 – RTM Baseline | COMPLETE | 1.0 | 2026-05-24 |
| 14 | Test Cases (AUTH, MOVIES, REVIEWS, RATINGS, ADMIN, NFR) | /docs/test-cases/ | qa-engineer | 5 – RTM Baseline | COMPLETE | 1.0 | 2026-05-24 |
| 15 | Defect Reports (DEF-001 to DEF-009) | /docs/defects/ | qa-engineer | 7 – Test | COMPLETE | 1.0 | 2026-05-26 |
| 15a | System Test Report | /docs/test-reports/system-test-report.md | qa-engineer | 7 – Test | COMPLETE | 1.0 | 2026-05-26 |
| 16 | Release Notes v1.0.0 | /docs/RELEASE-NOTES.md | devops-engineer | 8 – Deploy | COMPLETE | 1.0 | 2026-05-26 |
| 16a | Deployment Runbook | /docs/runbooks/runbook-deploy.md | devops-engineer | 8 – Deploy | COMPLETE | 1.0 | 2026-05-26 |
| 16b | Incident Response Runbook | /docs/runbooks/runbook-incident.md | devops-engineer | 8 – Deploy | COMPLETE | 1.0 | 2026-05-26 |
| 17 | User Guide | /docs/USER-GUIDE.md | technical-writer | 9 – Handover | COMPLETE | 1.0 | 2026-05-26 |
| 18 | API Reference | /docs/API-REFERENCE.md | technical-writer | 9 – Handover | COMPLETE | 1.0 | 2026-05-26 |
| 19 | Project Closure + Lessons Learned | /docs/CLOSURE.md | tech-lead | 9 – Handover | COMPLETE | 1.0 | 2026-05-26 |
| 20 | Change Requests (post-SRS) | /docs/CHANGE-REQUESTS/ | tech-lead | Any (post Phase 2) | N/A | — | — |
| 21 | CLAUDE.md (project conventions) | /claude.md | tech-lead | All phases | COMPLETE | 1.1 | 2026-05-26 |

---

## Phase Gate Sign-Off Log

| Phase | Gate | Signed-Off Date | Notes |
|-------|------|----------------|-------|
| 1 – Initiation | Charter approved | 2026-05-23 | Approved |
| 2 – Requirements | SRS signed off | 2026-05-23 | Approved — SRS v1.0 locked |
| 3 – Architecture | HLD + ADRs signed off | 2026-05-23 | Approved — all 7 ADRs accepted |
| 4 – Detailed Design | Design package approved | 2026-05-24 | Approved — LLD, ERD, API spec, wireframes, design system |
| 5 – RTM Baseline | RTM + Test Plan signed off | 2026-05-24 | Approved — 94 requirements, 89 test cases baselined |
| 6 – Build | Build complete (internal) | 2026-05-26 | Approved by PO — all P0/P1 features merged; 88.82% coverage; CI green |
| 7 – Test | UAT signed off | 2026-05-26 | Approved — 73/73 tests pass; 3 low-priority defects formally deferred to v1.1 |
| 8 – Deploy | Go-Live signed off | 2026-05-26 | Approved — smoke tests pass; monitoring active; rollback documented |
| 9 – Handover | Project Closed | 2026-05-26 | CLOSED — Approved by Product Owner |

---

## Final Artifact Count

| Phase | Artifacts | Status |
|-------|-----------|--------|
| Phase 1 — Initiation | 2 | COMPLETE |
| Phase 2 — Requirements | 1 | COMPLETE |
| Phase 3 — Architecture | 8 (HLD + 7 ADRs) | COMPLETE |
| Phase 4 — Detailed Design | 5 (LLD, ERD, API spec, wireframes, design system) | COMPLETE |
| Phase 5 — RTM Baseline | 3 (RTM, Test Plan, Test Cases) | COMPLETE |
| Phase 6 — Build | Codebase (not doc artifact) | COMPLETE |
| Phase 7 — Test | 3 (Defects, System Test Report, RTM v2.1) | COMPLETE |
| Phase 8 — Deploy | 3 (Release Notes, Deploy Runbook, Incident Runbook) | COMPLETE |
| Phase 9 — Handover | 3 (User Guide, API Reference, Closure) | COMPLETE |
| **Total** | **21 documented artifacts** | **ALL COMPLETE** |

No Change Requests were raised. No scope deviations from SRS v1.0.

---

*Produced by tech-lead — 2026-05-23 | Updated to v1.7 — 2026-05-26 (Phase 9 Handover complete; all artifacts marked COMPLETE)*
