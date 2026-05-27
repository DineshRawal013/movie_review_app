# Software Requirements Specification (SRS)
**Project:** [Project Name]
**Version:** 1.0
**Date:** YYYY-MM-DD
**Author:** product-manager
**Approver:** [User]
**Status:** Draft | Under Review | Approved | Locked

---

## 1. Introduction

### 1.1 Purpose
[Why does this document exist? Who is it for?]

### 1.2 Scope
[What the system does, what it does NOT do, boundaries.]

### 1.3 Definitions, Acronyms, Abbreviations
| Term | Definition |
|------|------------|
| ... | ... |

### 1.4 References
- Project Charter: /docs/CHARTER.md
- [Other reference docs]

### 1.5 Overview
[Roadmap of the rest of this document.]

---

## 2. Overall Description

### 2.1 Product Perspective
[Where does this fit? Standalone? Replacement? Component of a larger system?]

### 2.2 Product Functions (Summary)
- F1: [...]
- F2: [...]

### 2.3 User Classes & Characteristics
| User Class | Description | Technical Skill | Frequency |
|-----------|-------------|----------------|-----------|
| Guest | Unauthenticated visitor | Low | High |
| Registered User | Authenticated user | Low-Med | High |
| Admin | Manages content | Med-High | Low |

### 2.4 Operating Environment
- Client: [browsers, mobile, desktop]
- Server: [OS, runtime, cloud/on-prem]

### 2.5 Design & Implementation Constraints
[Languages, frameworks the user mandated; regulatory constraints; hardware limits.]

### 2.6 Assumptions & Dependencies
[Things assumed true; external systems we depend on.]

---

## 3. Functional Requirements

### 3.1 [Module Name — e.g., Authentication]

#### REQ-001: User registration
**Priority:** P0
**Description:** The system shall allow a new user to register using email and password.
**Inputs:** email (string, valid format), password (≥12 chars, ≥1 upper, ≥1 number, ≥1 symbol)
**Processing:** Hash password (bcrypt cost 12). Create user record. Send verification email.
**Outputs:** 201 + user object (no password) OR 400 + validation errors.
**Acceptance Criteria:**
- [ ] Given valid email/password, when POST /api/auth/register, then user created and verification email sent
- [ ] Given existing email, when POST /api/auth/register, then 409 returned
- [ ] Given weak password, when POST /api/auth/register, then 400 with specific errors

#### REQ-002: User login
... (same structure)

### 3.2 [Module Name — e.g., Reviews]
... (continue for every module)

---

## 4. Non-Functional Requirements

### 4.1 Performance
| NFR ID | Requirement | Measurement |
|--------|-------------|-------------|
| NFR-001 | API response time p95 < 300ms | Synthetic load test 1K RPS |
| NFR-002 | Page load (LCP) < 2.5s on 4G | Lighthouse CI |

### 4.2 Security
| NFR ID | Requirement |
|--------|-------------|
| NFR-010 | Passwords hashed with bcrypt (cost ≥ 12) |
| NFR-011 | All traffic over TLS 1.2+ |
| NFR-012 | Session tokens expire after 15 minutes |
| NFR-013 | OWASP Top 10 baseline compliance |

### 4.3 Usability
| NFR ID | Requirement |
|--------|-------------|
| NFR-020 | WCAG 2.1 AA compliance |
| NFR-021 | All forms keyboard-navigable |

### 4.4 Reliability
| NFR ID | Requirement |
|--------|-------------|
| NFR-030 | 99.9% uptime SLA (max 8.76h/yr downtime) |
| NFR-031 | RPO ≤ 1 hour |
| NFR-032 | RTO ≤ 4 hours |

### 4.5 Scalability
| NFR ID | Requirement |
|--------|-------------|
| NFR-040 | Support 10,000 concurrent users without degradation |
| NFR-041 | Linear horizontal scaling up to 50K users |

### 4.6 Maintainability
| NFR ID | Requirement |
|--------|-------------|
| NFR-050 | Unit test coverage ≥ 80% |
| NFR-051 | All public APIs documented (OpenAPI) |

### 4.7 Compatibility
| NFR ID | Requirement |
|--------|-------------|
| NFR-060 | Last 2 versions of Chrome, Firefox, Safari, Edge |
| NFR-061 | iOS 16+, Android 11+ |

### 4.8 Legal & Compliance
[GDPR, CCPA, accessibility law, industry-specific regs.]

---

## 5. External Interface Requirements

### 5.1 User Interfaces
[High-level — detailed designs in /docs/design/]

### 5.2 Hardware Interfaces
[If applicable.]

### 5.3 Software Interfaces
[Third-party APIs: payment gateway, email service, etc.]

### 5.4 Communication Interfaces
[Protocols: HTTPS, WebSocket, etc.]

---

## 6. Out of Scope (Explicit Non-Goals)
- [Feature explicitly NOT in v1]
- [Behavior we are intentionally NOT supporting]

---

## 7. Acceptance Criteria (Project-Level)
The product is accepted when:
- [ ] All P0 functional requirements pass UAT
- [ ] All P0 NFRs are verified
- [ ] No P0 or P1 defects open
- [ ] User documentation complete and reviewed
- [ ] Production deployment stable for ≥48h

---

## 8. Appendices

### A. Glossary
### B. Open Issues / TBD
### C. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | YYYY-MM-DD | product-manager | Initial draft |
| 1.0 | YYYY-MM-DD | product-manager | Approved by [User] |

---

**Sign-Off**

| Role | Name | Signature/Approval | Date |
|------|------|--------------------|------|
| Product Owner | [User] | [pending] | — |
