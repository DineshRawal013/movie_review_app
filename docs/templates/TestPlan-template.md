# Master Test Plan
**Project:** [Name]
**Version:** 1.0
**Date:** YYYY-MM-DD
**Author:** qa-engineer
**Approver:** [User]
**Status:** Draft | Under Review | Approved

---

## 1. Introduction

### 1.1 Purpose
Defines the testing approach, scope, schedule, environments, and exit criteria for [Project].

### 1.2 References
- SRS: /docs/SRS.md
- HLD: /docs/HLD.md
- LLD: /docs/LLD.md
- RTM: /docs/RTM.md

### 1.3 Scope
**In scope:**
- Functional testing of all P0/P1 requirements
- Non-functional verification (performance, security, accessibility)
- Regression testing on each build
- UAT coordination

**Out of scope:**
- Penetration testing (handled by external vendor, if required)
- Beta testing with end users (separate plan)

---

## 2. Test Strategy

### 2.1 Test Levels
| Level | Owner | Goal | Coverage Target |
|-------|-------|------|-----------------|
| Unit | Developers | Verify isolated logic | ≥80% line coverage |
| Integration | qa-engineer + backend | Verify component interactions | All API contracts |
| System | qa-engineer | Verify end-to-end behavior | 100% P0/P1 user stories |
| UAT | User | Business acceptance | 100% P0 acceptance criteria |
| Performance | qa-engineer + devops | NFR verification | All performance NFRs |
| Security | qa-engineer + backend | OWASP Top 10 baseline + project NFRs | All security NFRs |
| Accessibility | qa-engineer + frontend | WCAG 2.1 AA | All public-facing screens |

### 2.2 Test Types
- **Functional** (happy path + negative + boundary)
- **Regression** (after every defect fix)
- **Smoke** (post-deploy quick sanity)
- **Sanity** (focused after small change)
- **Performance** (load, stress, soak)
- **Security** (OWASP baseline, dependency scan)
- **Accessibility** (axe-core + manual keyboard/screenreader)
- **Compatibility** (browser/device matrix)

---

## 3. Entry & Exit Criteria

### 3.1 Entry Criteria (System Test)
- [ ] Code complete for the test cycle scope
- [ ] Build deployed to test environment, green CI
- [ ] Smoke test passes
- [ ] Test data loaded
- [ ] No P0 defects open from previous cycle

### 3.2 Exit Criteria (Release-Ready)
- [ ] 100% P0 test cases executed
- [ ] ≥95% pass rate overall
- [ ] No P0 defects open
- [ ] No P1 defects open (or formally deferred with user approval + CR)
- [ ] All NFR test cases passed
- [ ] UAT signed off by User
- [ ] RTM 100% verified for P0 requirements

---

## 4. Test Environments

| Env | Purpose | Data | Access | Owner |
|-----|---------|------|--------|-------|
| Dev | Developer self-test | Synthetic seed | All engineers | devops |
| Staging | QA + UAT | Anonymized prod-like | QA + User | devops |
| Prod (post-launch) | Live | Real | Restricted | devops |

Test data refresh: [weekly / on demand / per cycle]

---

## 5. Test Schedule

| Phase | Start | End | Owner |
|-------|-------|-----|-------|
| Test case design | YYYY-MM-DD | YYYY-MM-DD | qa-engineer |
| Test data setup | YYYY-MM-DD | YYYY-MM-DD | qa + devops |
| Test cycle 1 (system) | YYYY-MM-DD | YYYY-MM-DD | qa |
| Defect fix cycle 1 | YYYY-MM-DD | YYYY-MM-DD | engineers |
| Test cycle 2 (regression) | YYYY-MM-DD | YYYY-MM-DD | qa |
| Performance testing | YYYY-MM-DD | YYYY-MM-DD | qa + devops |
| Security testing | YYYY-MM-DD | YYYY-MM-DD | qa + backend |
| UAT | YYYY-MM-DD | YYYY-MM-DD | User |
| Release sign-off | YYYY-MM-DD | YYYY-MM-DD | qa + User |

---

## 6. Roles & Responsibilities

| Role | Owner |
|------|-------|
| Test plan approval | User |
| Test case design | qa-engineer |
| Test execution (functional, regression) | qa-engineer |
| Defect logging | qa-engineer + any team member |
| Defect triage | tech-lead + qa-engineer |
| Defect fixing | backend / frontend / fullstack |
| Defect retest & closure | qa-engineer |
| UAT execution | User |
| Release recommendation | qa-engineer |
| Release approval | User |

---

## 7. Defect Management

### 7.1 Severity Definitions
- **P0 (Blocker)** — App unusable, data loss, security breach
- **P1 (Critical)** — Major feature broken, no reasonable workaround
- **P2 (Major)** — Feature impaired but workaround exists
- **P3 (Minor)** — Cosmetic, low impact

### 7.2 Defect Workflow
```
New → Triaged → Assigned → In Progress → Resolved → Retest → Closed
                                          ↓ (if fails retest)
                                       Reopened
```

### 7.3 SLAs
| Severity | Triage | Fix |
|----------|--------|-----|
| P0 | <2h | <24h |
| P1 | <8h | <3 days |
| P2 | <24h | next cycle |
| P3 | <72h | when scheduled |

---

## 8. Test Deliverables

- [Test Plan] (this document)
- [RTM] (separate, living)
- Test Case Specifications (per module, /docs/test-cases/)
- Test Execution Reports (per cycle, /docs/test-reports/)
- Defect Reports (/docs/defects/)
- Release Sign-Off Recommendation Letter (per release)

---

## 9. Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Test environment instability | Med | High | Daily smoke run + devops on standby |
| Late requirements changes | Med | High | Strict CR process; impact analysis required |
| Insufficient test data | Low | Med | Seed script + anonymized prod import |

---

## 10. Tools

| Purpose | Tool |
|---------|------|
| Test case management | Markdown in repo (/docs/test-cases/) |
| Defect tracking | GitHub Issues with labels |
| API testing | Postman / Bruno / curl scripts |
| Load testing | k6 |
| Accessibility | axe-core CLI + manual |
| Security scan | npm audit + Snyk + OWASP ZAP baseline |

---

## 11. Sign-Off
| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [User] | [pending] | — |
| QA Engineer | qa-engineer | Drafted | YYYY-MM-DD |
