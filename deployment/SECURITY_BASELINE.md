# DWIP Enterprise ERP — Security Baseline

> [!NOTE]
> **Partly superseded.** The controls described here broadly still apply, but the
> resource names are from the planned GCP-001 topology: the service account is
> `772298398554-compute@developer.gserviceaccount.com` (not `dwip-cloudrun-sa`), and the AI
> provider is NVIDIA Nemotron (`NEMOTRON_API_KEY`) — the `GEMINI_API_KEY` row below is obsolete.
> **The secret-storage rows are also wrong:** production holds `JWT_SECRET`,
> `CUSTOMER_JWT_SECRET`, `DB_PASSWORD`, `DB_HOST` etc. as **plaintext Cloud Run environment
> variables on the running service** — Secret Manager and `dwip-cloudrun-sa` are not in use.
> See [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md) for current infrastructure facts.

**Version:** RC1.1  
**Review:** GCP-002  
**Standard:** Google Cloud Security Foundations + OWASP Top 10

---

## 1. Identity & Access Management

### Service Accounts

| Account | Purpose | Roles | Scope |
|---|---|---|---|
| `dwip-cloudrun-sa` | Cloud Run runtime identity | `secretmanager.secretAccessor`, `cloudsql.client` | Project |
| `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` | CI/CD pipeline | `run.developer`, `artifactregistry.writer`, `iam.serviceAccountUser` (SA-scoped) | Project + SA |

### IAM Security Rules
- ✅ No service account keys issued (no JSON key files)
- ✅ Cloud Build uses the default Cloud Build SA (short-lived credentials)
- ✅ Cloud Run uses a dedicated SA — not the Compute Engine default SA
- ✅ `run.developer` used instead of `run.admin` — cannot delete services
- ✅ Secret accessor role — can read secrets only, cannot create or delete

---

## 2. Secret Management

| Secret | Storage | Rotation | Access |
|---|---|---|---|
| `JWT_SECRET` | Secret Manager | Manual on compromise | dwip-cloudrun-sa only |
| `CUSTOMER_JWT_SECRET` | Secret Manager | Manual on compromise | dwip-cloudrun-sa only |
| `DB_PASSWORD` | Secret Manager | Manual on DB password change | dwip-cloudrun-sa only |
| `DB_HOST` | Secret Manager | On infrastructure change | dwip-cloudrun-sa only |
| `DB_USER` | Secret Manager | On infrastructure change | dwip-cloudrun-sa only |
| `DB_DATABASE` | Secret Manager | On infrastructure change | dwip-cloudrun-sa only |
| `NEMOTRON_API_KEY` | Secret Manager / Cloud Run env var | As per NVIDIA NIM policy | dwip service account only |

### Rules
- ✅ Secrets never in environment variables (`--set-env-vars`) — always `--set-secrets`
- ✅ Secrets never in Dockerfile or Docker image layers
- ✅ Secrets never in Git (`.gitignore` covers `.env`)
- ✅ Secret Manager automatic replication — survives regional failure
- ✅ All secret access is audit-logged by GCP

---

## 3. Container Security

| Control | Status | Evidence |
|---|---|---|
| Non-root user | ✅ ENFORCED | `USER dwip` (UID 1001) in Dockerfile |
| No secrets in image | ✅ ENFORCED | `.dockerignore` excludes all `.env*` |
| No business data in image | ✅ ENFORCED | `workshop_db.json` excluded (10.5 MB) |
| No dev dependencies in runtime | ✅ ENFORCED | `npm ci --omit=dev` in runner stage |
| Signal handling | ✅ ENFORCED | `dumb-init` as PID 1 |
| Read-only filesystem | ❌ NOT SET | Cloud Run containers are read-only by default ✅ |
| No privileged mode | ✅ N/A | Cloud Run never allows privileged containers |

---

## 4. Network Security

| Control | Status |
|---|---|
| HTTPS enforced | ✅ Cloud Run terminates TLS; HTTP → HTTPS redirect automatic |
| HSTS enabled | ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains` (NODE_ENV=production) |
| Content Security Policy | ✅ `default-src 'self'; script-src 'self' 'unsafe-inline'` |
| X-Frame-Options | ✅ `DENY` |
| X-Content-Type-Options | ✅ `nosniff` |
| X-XSS-Protection | ✅ `1; mode=block` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ `camera=(self), geolocation=(self), microphone=()` |
| CORS | ✅ Allowlist-only: Cloud Run URL + `ADDITIONAL_CORS_ORIGINS` |
| VPC | ❌ Not required for Cloud SQL over public TCP with SSL |
| Cloud Armor | ❌ Not provisioned (RC1.1 pilot) — RECOMMENDED for production |

---

## 5. Application Security (Verified in RC1.1 Certification)

| Control | Status |
|---|---|
| Password hashing | ✅ bcrypt (cost factor 10+) |
| JWT signing | ✅ HS256, 64-char secret minimum |
| Rate limiting | ✅ `express-rate-limit` on auth endpoints |
| SQL injection | ✅ Parameterized queries via `mysql2` |
| Input validation | ✅ Express JSON body limit 10 MB |
| Dependency audit | ⚠️ `--no-audit` flag used in build — REVIEW: run `npm audit` before production |

---

## 6. Data Security

| Control | Status |
|---|---|
| Database transit encryption | ✅ `DB_SSL=true` — Cloud SQL provides TLS |
| Database at-rest encryption | ✅ Cloud SQL encrypts at rest |
| PII in logs | ⚠️ `customer_mobile` and `vrn` MAY appear in error logs — review |
| Backup encryption | ✅ Cloud SQL automated encrypted backups |

---

## 7. Audit & Compliance

| Control | Status |
|---|---|
| Cloud Audit Logs | ✅ Auto-enabled — all API calls logged |
| Secret access logs | ✅ Every Secret Manager access logged |
| Container deploy logs | ✅ Cloud Build logs retained in Cloud Logging |
| Application logs | ✅ All `console.log/error` captured in Cloud Logging |
| Log retention | 30 days (default) — recommended: 90 days for production |

---

## 8. Gaps & Recommendations

| Gap | Priority | Sprint |
|---|---|---|
| `npm audit` not run in CI pipeline | 🔴 HIGH | Before production |
| Cloud Armor WAF not configured | 🟡 MEDIUM | RC2 production |
| Structured JSON logging (not plain text) | 🟡 MEDIUM | RC2 |
| Workload Identity Federation (replace Cloud Build SA key) | 🟡 MEDIUM | RC2 |
| PII audit in logs | 🟡 MEDIUM | RC2 |
| Log retention policy (30 → 90 days) | 🟢 LOW | Before production |
| Secret rotation schedule (quarterly) | 🟢 LOW | Post-pilot |
| Dependency pinning (exact versions, not ^) | 🟢 LOW | RC2 |
