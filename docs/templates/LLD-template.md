# Low-Level Design (LLD)
**Project:** [Name]
**Module:** [e.g., Authentication / Reviews / Admin]
**Version:** 1.0
**Date:** YYYY-MM-DD
**Authors:** backend-engineer, database-architect (jointly)
**Approver:** [User]
**Status:** Draft | Under Review | Approved

---

## 1. Introduction
### 1.1 Purpose
Detailed design of the [Module] for implementation.
### 1.2 References
- SRS sections: 3.X
- HLD sections: §3, §5
- Related ADRs: ADR-NNN
### 1.3 Scope
What this LLD covers / does not cover.

---

## 2. Module Architecture

### 2.1 Internal Components
| Component | Responsibility | File(s) |
|-----------|----------------|---------|
| `AuthController` | HTTP route handlers | `src/auth/auth.controller.ts` |
| `AuthService` | Business logic | `src/auth/auth.service.ts` |
| `AuthRepository` | DB access | `src/auth/auth.repository.ts` |
| `AuthValidator` | Schema validation | `src/auth/auth.validator.ts` |

### 2.2 Class / Module Diagram (text-based ok)
```
AuthController
  └─ uses → AuthService
              ├─ uses → AuthRepository → PostgreSQL
              ├─ uses → PasswordHasher (bcrypt)
              └─ uses → TokenService (jsonwebtoken)
```

---

## 3. Data Model

### 3.1 Tables Owned by This Module
```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
```

### 3.2 Relationships
- `users.id` ← `reviews.user_id` (1:N, ON DELETE CASCADE)
- `users.id` ← `sessions.user_id` (1:N, ON DELETE CASCADE)

### 3.3 Migration Plan
- Forward: `001_create_users.sql`
- Rollback: `001_create_users_down.sql`

---

## 4. API Specification

### 4.1 Endpoints
| Method | Path | Description | Auth | Req ID |
|--------|------|-------------|------|--------|
| POST | /api/auth/register | Register new user | No | REQ-001 |
| POST | /api/auth/login | Authenticate, return tokens | No | REQ-002 |
| POST | /api/auth/refresh | Refresh access token | Cookie | REQ-003 |
| POST | /api/auth/logout | Invalidate refresh token | Yes | REQ-004 |
| GET | /api/auth/me | Get current user | Yes | REQ-005 |

### 4.2 Request/Response Schemas (TypeScript / Zod)
```typescript
const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(12)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^a-zA-Z0-9]/, "Must contain symbol"),
});

const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});
```

### 4.3 Error Codes
| HTTP | Code | When |
|------|------|------|
| 400 | VALIDATION_FAILED | Schema fails |
| 401 | UNAUTHORIZED | Bad credentials / expired token |
| 403 | FORBIDDEN | Authenticated but not allowed |
| 409 | DUPLICATE_EMAIL | Email already registered |
| 429 | RATE_LIMITED | Too many attempts |

---

## 5. Algorithms & Business Logic

### 5.1 Register Flow
```
1. Validate input (RegisterRequestSchema)
2. Check email uniqueness (case-insensitive)
   - If exists → 409 DUPLICATE_EMAIL
3. Hash password (bcrypt, cost 12)
4. Begin transaction:
   a. INSERT user
   b. Create email verification token (random 32 bytes, expires 24h)
   c. INSERT verification_tokens
5. Commit
6. Enqueue email verification job
7. Return 201 + UserResponse (no token; user must verify first)
```

### 5.2 Login Flow
```
1. Validate input
2. Rate limit check (max 5 attempts / 15 min / IP+email)
3. SELECT user WHERE email = $1 AND deleted_at IS NULL
   - If not found → 401 (do not reveal email exists)
4. bcrypt.compare(password, user.password_hash)
   - If false → 401 (increment rate limit counter)
5. If !email_verified → 403 EMAIL_NOT_VERIFIED
6. Generate:
   - Access token: JWT, 15min, payload { sub: user.id, role: user.role }
   - Refresh token: random 64 bytes, stored hashed in DB, expires 7d
7. Return 200 + access token (body) + refresh token (HTTP-only secure cookie)
```

### 5.3 Other flows
[Refresh, Logout, etc.]

---

## 6. Security Considerations

- Passwords hashed with bcrypt cost 12
- Login responses identical for "wrong email" and "wrong password" (prevent enumeration)
- Rate limit on login, register, password reset
- JWT signing key in AWS Secrets Manager; rotate quarterly
- Refresh tokens stored hashed (sha256) — never compare plain
- Account lockout after 10 failed attempts (15-min lock)

---

## 7. Performance Considerations

- Expected load: ~50 logins/sec peak
- Bcrypt cost 12 ≈ 200ms — acceptable for login (not on hot path)
- Email uniqueness check uses index `idx_users_email_active`
- Refresh token lookup: indexed by token hash

---

## 8. Testing Strategy (high-level)

- Unit tests: validators, password hashing, token generation
- Integration tests: full register/login flow against test DB
- Security tests: SQL injection, rate limiting, token expiry
- Coverage target: ≥85% (auth is security-critical)

(Detailed test cases live in /docs/test-cases/auth/)

---

## 9. Dependencies (External)
| Package | Version | Purpose |
|---------|---------|---------|
| fastify | ^4.x | Web framework |
| bcrypt | ^5.x | Password hashing |
| jsonwebtoken | ^9.x | JWT signing |
| zod | ^3.x | Schema validation |

---

## 10. Open Questions
1. [Question for tech-lead / user]

---

## 11. Sign-Off
| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [User] | [pending] | — |
