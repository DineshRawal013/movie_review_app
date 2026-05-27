# Requirements Traceability Matrix (RTM)
**Project:** [Name]
**Version:** [increment on every meaningful update]
**Date:** YYYY-MM-DD
**Owner:** qa-engineer
**Status:** Baseline | In Progress | Final
**Purpose:** Trace every requirement from SRS → Design → Code → Test → Verified outcome.

> **Living document.** Updated whenever requirements change, code lands, or tests execute.

---

## How to read this document

- **Req ID** — From SRS. Format: `REQ-NNN` (functional) or `NFR-NNN` (non-functional).
- **Type** — Functional / Non-Functional
- **Priority** — P0 (must-have), P1 (should-have), P2 (nice-to-have)
- **SRS §** — Section in SRS where the requirement is defined
- **HLD §** — Section in HLD (architectural support)
- **LLD §** — Section in LLD (detailed design)
- **Code Module(s)** — File path(s) implementing this requirement
- **Test Case IDs** — TC-NNN identifiers covering this requirement
- **Status** — Not Started | Designed | In Build | Built | In Test | Passed | Failed | Deferred
- **Verified Date** — Date the last test execution passed
- **Notes** — Any context (deferral reasons, CR references, etc.)

---

## RTM Matrix

### Functional Requirements

| Req ID | Requirement Summary | Type | Pri | SRS § | HLD § | LLD § | Code Module(s) | Test Case IDs | Status | Verified | Notes |
|--------|--------------------|------|-----|-------|-------|-------|----------------|---------------|--------|----------|-------|
| REQ-001 | User can register with email | F | P0 | 3.1.1 | 3.2 | Auth §4.1 | src/auth/auth.service.ts | TC-001, TC-002 | In Test | — | |
| REQ-002 | Password min 12 chars + complexity | F | P0 | 3.1.2 | — | Auth §4.1 | src/auth/auth.validator.ts | TC-003 | Passed | YYYY-MM-DD | |
| REQ-003 | User can log in | F | P0 | 3.1.3 | 3.2 | Auth §5.2 | src/auth/auth.service.ts | TC-004, TC-005 | Built | — | |
| REQ-004 | User can log out | F | P0 | 3.1.4 | — | Auth §5.4 | src/auth/auth.service.ts | TC-006 | Designed | — | |
| REQ-005 | User can reset password via email | F | P1 | 3.1.5 | — | Auth §6.0 | src/auth/password-reset.ts | TC-007, TC-008 | Not Started | — | |
| REQ-010 | User can create a review | F | P0 | 3.2.1 | 3.4 (UC-1) | Reviews §5.1 | src/reviews/reviews.service.ts | TC-101, TC-102, TC-103 | Built | — | |
| REQ-011 | Review rating must be 1-5 | F | P0 | 3.2.1 | — | Reviews §3.1 | src/reviews/reviews.validator.ts | TC-104 | Built | — | |
| REQ-012 | Review body ≤500 chars | F | P0 | 3.2.1 | — | Reviews §3.1 | src/reviews/reviews.validator.ts | TC-105 | Built | — | |
| REQ-020 | Admin can delete any review | F | P1 | 3.3.1 | 5.1 (RBAC) | Reviews §5.4 | src/reviews/reviews.service.ts | TC-201 | Designed | — | |

### Non-Functional Requirements

| NFR ID | Requirement Summary | Type | Pri | SRS § | HLD § | Verification Method | Test Case IDs | Status | Verified | Notes |
|--------|--------------------|------|-----|-------|-------|--------------------|--------------|--------|----------|-------|
| NFR-001 | API p95 latency <300ms @ 1K RPS | NF | P0 | 4.1 | 5.2 | Load test | TC-LOAD-001 | Not Started | — | |
| NFR-010 | Passwords hashed with bcrypt cost ≥12 | NF | P0 | 4.2 | 5.1 | Code review + unit test | TC-SEC-001 | Passed | YYYY-MM-DD | |
| NFR-011 | All traffic TLS 1.2+ | NF | P0 | 4.2 | 5.1 | Infra config audit | TC-SEC-002 | Not Started | — | |
| NFR-020 | WCAG 2.1 AA compliant | NF | P0 | 4.3 | — | axe-core scan + manual a11y review | TC-A11Y-001..010 | Not Started | — | |
| NFR-030 | 99.9% uptime SLA | NF | P0 | 4.4 | 5.4 | 30-day production monitoring | TC-OPS-001 | N/A (post-launch) | — | |

---

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total requirements | NN |
| Requirements with design coverage (HLD or LLD §) | NN / NN (NN%) |
| Requirements with code coverage (linked module) | NN / NN (NN%) |
| Requirements with ≥1 test case | NN / NN (NN%) |
| Requirements passed | NN / NN (NN%) |
| Requirements failed | NN / NN (NN%) |
| Requirements deferred (with CR) | NN |

**Gates this RTM enables:**
- ✅ No orphan requirements (every REQ has a test case)
- ✅ No orphan tests (every TC traces back to a REQ)
- ✅ No orphan code (every module traces to ≥1 REQ — verified spot-check)

---

## Change Log

| Date | Version | Editor | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | qa-engineer | Baseline created from approved SRS+LLD |
| YYYY-MM-DD | 1.1 | qa-engineer | Added REQ-006 (CR-001 approved) |
| YYYY-MM-DD | 1.2 | qa-engineer | REQ-001 status: Built → In Test |

---

## Sign-Off (Baseline)

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [User] | [pending] | — |
| QA Engineer | qa-engineer | ✅ Drafted | YYYY-MM-DD |
