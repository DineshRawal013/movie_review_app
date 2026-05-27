# High-Level Design (HLD)
**Project:** [Name]
**Version:** 1.0
**Date:** YYYY-MM-DD
**Author:** solution-architect
**Approver:** [User]
**Status:** Draft | Under Review | Approved

---

## 1. Introduction
### 1.1 Purpose
### 1.2 Scope
### 1.3 References
- SRS: /docs/SRS.md (v1.0, approved YYYY-MM-DD)
- ADRs: /docs/ADRs/
### 1.4 Definitions

---

## 2. System Overview

### 2.1 System Context Diagram (C4 Level 1)
```
                ┌───────────────┐
   [End User] →─│   [System]    │─→ [Email Service]
                │               │─→ [Payment Gateway]
   [Admin] →───│               │─→ [Cloud Storage]
                └───────────────┘
```

### 2.2 Key Quality Attributes (mapped from SRS NFRs)
| Attribute | Target | Source NFR |
|-----------|--------|------------|
| Latency (p95) | <300ms | NFR-001 |
| Concurrent users | 10K | NFR-040 |
| Uptime | 99.9% | NFR-030 |
| RPO/RTO | 1h / 4h | NFR-031/32 |

---

## 3. Architecture

### 3.1 Architectural Style
**Choice:** [Monolith / Modular Monolith / Microservices / Serverless / Hybrid]

**Rationale:** [Why this style fits the team size, scale, and complexity. Reference ADR-001.]

### 3.2 Container Diagram (C4 Level 2)
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Web Client  │────▶│  API Server  │────▶│  PostgreSQL  │
│  (React SPA) │ HTTP│ (Node/Fastify)│ SQL │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ├────▶ [Redis] (cache, sessions)
                            ├────▶ [S3] (uploaded files)
                            └────▶ [Email Provider]
```

### 3.3 Component Breakdown
| Component | Responsibility | Tech |
|-----------|----------------|------|
| Web Client | UI rendering, client state | React 18 + TS + Vite |
| API Server | Business logic, validation, auth | Node 20 + Fastify + TS |
| Database | Persistent storage | PostgreSQL 16 |
| Cache | Sessions, rate limiting | Redis 7 |
| Object Storage | Uploaded media | AWS S3 |
| Email | Transactional email | Postmark / SES |

### 3.4 Data Flow — Critical Use Cases
**UC-1: User submits a review**
```
1. Client → POST /api/reviews → API Server
2. API validates token, body
3. API → INSERT into PostgreSQL (reviews)
4. API → cache.invalidate(`movie:${id}:reviews`)
5. API → return 201
6. Client updates UI optimistically
```

---

## 4. Technology Stack
| Layer | Choice | ADR |
|-------|--------|-----|
| Frontend | React 18 + TS | ADR-001 |
| Backend | Node.js 20 + Fastify | ADR-002 |
| Database | PostgreSQL 16 | ADR-003 |
| Cache | Redis 7 | ADR-004 |
| Auth | JWT short-lived + refresh | ADR-005 |
| Hosting | AWS (ECS Fargate + RDS) | ADR-006 |
| CI/CD | GitHub Actions | ADR-007 |
| Monitoring | CloudWatch + Sentry | ADR-008 |

---

## 5. Cross-Cutting Concerns

### 5.1 Security Architecture
- **AuthN:** Email + password, bcrypt hashing, JWT access (15min) + refresh (7d, HTTP-only cookie)
- **AuthZ:** RBAC — roles: guest, user, admin. Enforced in service layer.
- **Data at rest:** RDS encryption enabled, S3 SSE-S3
- **Data in transit:** TLS 1.2+ everywhere, HSTS enabled
- **Secrets:** AWS Secrets Manager (never in code/env files)
- **Threat model summary:** /docs/THREAT-MODEL.md

### 5.2 Observability
- **Logs:** Structured JSON via pino → CloudWatch. 30d hot, 1y cold.
- **Metrics:** Prometheus-compatible endpoint, scraped by CloudWatch Container Insights. RED method for services.
- **Traces:** OpenTelemetry → AWS X-Ray. 100% errors, 10% success.
- **Alerts:** Configured per-service; see /docs/runbooks/

### 5.3 Error Handling
- All errors caught at API boundary
- Standardized error response format (see API spec)
- 5xx errors logged with stack + correlation ID
- User sees friendly message + correlation ID for support

### 5.4 Deployment & Environments
| Env | Purpose | Hosting | Promotion |
|-----|---------|---------|-----------|
| Dev | Local | Docker Compose | — |
| Staging | QA + UAT | AWS (smaller scale) | On merge to main |
| Prod | Live | AWS (full scale) | On semver tag, manual approval |

---

## 6. Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| RDS connection exhaustion | High | Medium | PgBouncer + monitoring |
| Single AZ outage | High | Low | Multi-AZ from day 1 |
| Third-party email provider down | Medium | Medium | Queue + retry; fallback provider |

---

## 7. Assumptions & Constraints
- Team has Node.js / React experience
- AWS is the chosen cloud (per ADR-006)
- Year-1 user load ≤ 50K active users
- Budget cap for infra: $X/mo

---

## 8. Open Questions (for User)
1. [Question requiring user decision]
2. ...

---

## 9. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | YYYY-MM-DD | solution-architect | Initial draft |
| 1.0 | YYYY-MM-DD | solution-architect | Approved by [User] |

---

**Sign-Off**

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [User] | [pending] | — |
