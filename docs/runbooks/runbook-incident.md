# RUNBOOK: Incident Response — Movie Review App

**Owner:** devops-engineer
**Last Updated:** 2026-05-26
**Version:** 1.0
**Severity levels:** P1 = immediate action / P2 = fix within 2 hours / P3 = fix within business day

---

## Table of Contents

1. [INC-001: Service Down (frontend or backend unreachable)](#inc-001-service-down)
2. [INC-002: Database Connection Failure](#inc-002-database-connection-failure)
3. [INC-003: Authentication / OAuth Failure](#inc-003-authentication--oauth-failure)
4. [INC-004: High Error Rate (API 5xx)](#inc-004-high-error-rate)
5. [INC-005: Container Crash Loop](#inc-005-container-crash-loop)
6. [INC-006: Disk / Volume Full](#inc-006-disk--volume-full)
7. [Escalation Contacts](#escalation-contacts)

---

## INC-001: Service Down

**Severity:** P1
**Symptom:** Frontend at `http://<host>:3001/` returns connection refused or 5xx, OR backend at `http://<host>:3000/api/health` does not return 200.

### Triage Steps

1. Check container status:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   - If a service shows `Exit` or `unhealthy`, proceed to step 2.
   - If all containers show `running` / `healthy`, check logs for application errors (INC-004).

2. Inspect the failing container's logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=100 backend
   docker compose -f docker-compose.prod.yml logs --tail=100 frontend
   ```

3. Check host-level resources:
   ```bash
   docker stats --no-stream
   df -h
   free -m
   ```

### Common Causes and Actions

| Cause | Indicator | Action |
|-------|-----------|--------|
| Container OOM killed | `docker inspect` shows `OOMKilled: true` | Restart; increase memory limit if recurring |
| Startup crash (bad env var) | Logs show `Error: ... is required` at boot | Fix `.env.prod`, restart |
| Port conflict | Logs show `EADDRINUSE` | Kill the conflicting process; restart |
| Postgres not healthy yet | Backend logs show `ECONNREFUSED 5432` | Wait 30s; postgres is still starting |
| Recent bad deploy | Error appeared right after a deploy | Initiate rollback per `runbook-deploy.md` Section 5 |

### Restart a single service

```bash
docker compose -f docker-compose.prod.yml restart backend
# or
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Full stack restart (if single-service restart fails)

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

**Escalate to tech-lead if:** service remains down after a full stack restart and logs show no obvious cause.

---

## INC-002: Database Connection Failure

**Severity:** P1
**Symptom:** Backend logs contain `Can't reach database server` or Prisma `P1001`/`P1003` errors; API endpoints return 500 with `database` in the error message.

### Triage Steps

1. Check postgres container health:
   ```bash
   docker compose -f docker-compose.prod.yml ps postgres
   ```

2. Attempt a direct connection from within the backend container:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend \
     sh -c 'npx prisma db execute --stdin <<< "SELECT 1;"'
   ```

3. Check postgres logs for errors:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=50 postgres
   ```

4. Check disk usage — a full disk will cause postgres to reject writes:
   ```bash
   df -h
   ```

### Common Causes and Actions

| Cause | Indicator | Action |
|-------|-----------|--------|
| Postgres container stopped | `docker ps` does not show postgres | `docker compose -f docker-compose.prod.yml up -d postgres` |
| Wrong `DATABASE_URL` | Prisma shows auth error | Verify `.env.prod` credentials match `POSTGRES_USER`/`POSTGRES_PASSWORD` |
| Max connections exhausted | Postgres logs show `sorry, too many clients` | Restart backend to release connection pool; consider adding `connection_limit` to DATABASE_URL |
| Data volume corruption | Postgres logs show `invalid page in block` | Stop postgres; restore from last backup (see below) |
| Disk full | `df -h` shows `/` or the Docker volume mount at 100% | Free space (INC-006); restart postgres |

### Restore from backup

Prisma-managed databases do not include a built-in backup agent in this configuration. If the volume is corrupt:

1. Stop the stack: `docker compose -f docker-compose.prod.yml down`
2. Obtain the latest database dump from your backup storage location (operator responsibility — document your backup location here).
3. Remove the corrupted volume: `docker volume rm movie-review-app_postgres-data`
4. Start postgres only: `docker compose -f docker-compose.prod.yml up -d postgres`
5. Restore the dump: `docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres moviereview < /path/to/backup.sql`
6. Start remaining services: `docker compose -f docker-compose.prod.yml up -d`

**Escalate to database-architect immediately if** data volume corruption is suspected.

---

## INC-003: Authentication / OAuth Failure

**Severity:** P2
**Symptom:** Users cannot log in; `GET /api/auth/google` does not redirect to Google, OR Google returns `redirect_uri_mismatch` error, OR JWT operations return 401/403 unexpectedly.

### Triage Steps

1. Verify Google OAuth redirect:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/google
   ```
   Expected: `302`. If `500`, check backend logs for Google strategy initialization errors.

2. Check environment variables are set:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend \
     sh -c 'echo "CLIENT_ID=${GOOGLE_CLIENT_ID:0:8}... CALLBACK=${GOOGLE_CALLBACK_URL}"'
   ```
   The client ID should show the first 8 characters (not empty). The callback URL must match exactly what is registered in Google Cloud Console.

3. Test a JWT decode (replace `<token>` with a token from browser dev tools):
   ```bash
   # Decode without verifying signature (for inspection only)
   echo '<token>' | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
   ```

### Common Causes and Actions

| Cause | Indicator | Action |
|-------|-----------|--------|
| `GOOGLE_CALLBACK_URL` mismatch | Google shows `redirect_uri_mismatch` | Update the Authorized Redirect URI in Google Cloud Console to match `GOOGLE_CALLBACK_URL` in `.env.prod`; restart backend |
| Expired/revoked Google credentials | Backend logs: `invalid_client` from Google | Regenerate the OAuth secret in Google Cloud Console; update `.env.prod`; restart backend |
| `JWT_SECRET` changed after deploy | Users get 401 on valid tokens | All existing refresh tokens are now invalid; users must re-authenticate. This is expected after a secret rotation. |
| `JWT_SECRET` or `JWT_REFRESH_SECRET` empty | Backend logs: `secretOrPrivateKey must have a value` | Fix `.env.prod`; restart backend |
| Clock skew | JWT `iat` in the future | Sync system clock: `timedatectl set-ntp true` |

### If all auth is broken and a deploy just happened

Roll back per `runbook-deploy.md` Section 5. Auth issues caused by a code deploy are treated as P1.

---

## INC-004: High Error Rate

**Severity:** P2 (P1 if error rate exceeds 50%)
**Symptom:** Backend logs contain elevated frequency of `"level":"error"` lines; users report 500 errors.

### Triage Steps

1. Identify the volume of errors in the last 5 minutes:
   ```bash
   docker compose -f docker-compose.prod.yml logs --since=5m backend | grep '"level":"error"' | wc -l
   ```

2. Identify which endpoints are failing:
   ```bash
   docker compose -f docker-compose.prod.yml logs --since=5m backend | grep '"level":"error"'
   ```
   Look for repeated `url`, `method`, or `msg` fields to identify the failing route.

3. Check for an upstream dependency failure:
   ```bash
   # Check TMDB API reachability
   curl -s -o /dev/null -w "%{http_code}" \
     "https://api.themoviedb.org/3/configuration?api_key=<your-key>"
   # Expected: 200. If 401, the TMDB API key is invalid.
   # If connection timed out, TMDB is down — movie fetch/refresh will fail.
   ```

4. Check if the error rate started after a recent deploy:
   ```bash
   git log --oneline -5
   docker compose -f docker-compose.prod.yml logs backend | grep "Application is running"
   ```

### Common Causes and Actions

| Cause | Indicator | Action |
|-------|-----------|--------|
| Recent bad deploy | Errors started after restart | Roll back per `runbook-deploy.md` Section 5 |
| TMDB API down or rate-limited | Errors on `/api/movies` routes; TMDB returns 503 or 429 | No action needed — cached data still serves; errors will self-resolve when TMDB recovers |
| TMDB API key invalid | TMDB returns 401 | Verify `TMDB_API_KEY` in `.env.prod`; restart backend |
| Database query failure | Prisma errors in logs | See INC-002 |
| Unhandled exception in new code | Stack trace in logs | Roll back; raise a defect report |
| Redis unavailable | Logs show `ECONNREFUSED 6379` | `docker compose -f docker-compose.prod.yml restart redis` |

**Escalate to backend-engineer if** the error trace shows an unhandled application exception not related to infrastructure.

---

## INC-005: Container Crash Loop

**Severity:** P1
**Symptom:** `docker compose ps` shows a service repeatedly cycling between `starting` and `Exit`.

### Triage Steps

1. Get the last exit reason:
   ```bash
   docker inspect $(docker compose -f docker-compose.prod.yml ps -q backend) \
     --format '{{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}'
   ```

2. Read the last 200 lines of logs before the crash:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=200 backend
   ```

3. Look for patterns:
   - Exit code `137`: OOM kill — increase Docker memory limit
   - Exit code `1` with `Cannot find module`: build artifact missing — rebuild image
   - Exit code `1` with env var name: missing required environment variable — fix `.env.prod`
   - Prisma `P1001`: database not reachable — check INC-002

### Force-recreate after fixing the cause

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

---

## INC-006: Disk / Volume Full

**Severity:** P2
**Symptom:** Postgres refuses writes (`no space left on device`); Docker logs stop writing; build commands fail.

### Triage Steps

1. Check disk usage:
   ```bash
   df -h
   du -sh /var/lib/docker
   ```

2. Check Docker-specific usage:
   ```bash
   docker system df
   ```

### Immediate Actions

```bash
# Remove stopped containers, unused networks, dangling images, and build cache
docker system prune -f

# Remove specific dangling images
docker image prune -f

# List large volumes
docker volume ls
```

If the postgres data volume itself is consuming unexpected space, investigate with:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('moviereview'));"
```

**Long-term action:** Schedule a periodic `docker system prune -f` via cron or a systemd timer to prevent recurrence.

---

## Escalation Contacts

| Role | Escalate When |
|------|--------------|
| tech-lead | Service down > 15 min with no resolution; any P1 unresolved |
| backend-engineer | Unhandled application exception; logic errors in API responses |
| database-architect | Data corruption; migration failures; need for manual SQL |
| Product Owner | User-visible data loss or breach; SLA breach |

For all P1 incidents, notify tech-lead immediately regardless of whether you are actively working a fix.

---

*Produced by devops-engineer — 2026-05-26*
