# DWIP Enterprise ERP — Cloud Deployment README

> [!WARNING]
> **Read [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md) first — it is the authoritative runbook.**
> The "Quick Start" below bootstraps the planned GCP-001 topology (`dwip-pilot`, `dwip-images`,
> `dwip-cloudrun-sa`); **none of that exists in production**. Live production is the single service
> **`dwip-enterprise`** (project `giga-course-dp497`, region `asia-south1`, domain
> https://devanand.aivaahan.com), deployed image-only via [cloudbuild.yaml](./cloudbuild.yaml).
> Inline corrections are marked below; docs whose header carries a **SUPERSEDED** warning are
> planning artifacts, not descriptions of the running system.

## Sprint GCP-001 Deliverables

All Cloud Run deployment files are in the `deployment/` folder.

| File | Purpose |
|---|---|
| [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md) | **Authoritative deploy runbook** — the live `dwip-enterprise` service |
| [cloudbuild.yaml](./cloudbuild.yaml) | **The live CI/CD pipeline** — build → push → image-only deploy |
| [Dockerfile](./Dockerfile) | Production-hardened multi-stage build (node:22, port 3001, `build:rc1`) |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | Env var reference — see the note at its top about secret handling |
| [CLOUD_SQL_CONFIGURATION.md](./CLOUD_SQL_CONFIGURATION.md) | Cloud SQL notes — live instance `wms-mysql-db` |
| [DATABASE_USERS.md](./DATABASE_USERS.md) | DB users, privileges, and how to move the app off `root` |
| [SECURITY_BASELINE.md](./SECURITY_BASELINE.md) | Security controls — resource names partly stale |
| [DEPLOYMENT_DECISION.md](./DEPLOYMENT_DECISION.md) | ⚠️ **Superseded** — GCP-001 sprint decision record |
| [CI_CD_STRATEGY.md](./CI_CD_STRATEGY.md) | ⚠️ **Superseded** — planned pilot→prod promotion flow |
| [CLOUD_RUN_SETUP.md](./CLOUD_RUN_SETUP.md) | ⚠️ **Superseded** — planned `dwip-pilot` topology |
| [CLOUD_RUN_CONFIGURATION.md](./CLOUD_RUN_CONFIGURATION.md) | ⚠️ **Superseded** — planned `dwip-pilot`/`dwip-prod` services |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | ⚠️ **Superseded** — promotes `dwip-pilot` → `dwip-prod` |
| [GCP_RESOURCE_PLAN.md](./GCP_RESOURCE_PLAN.md) | ⚠️ **Superseded** — planning cost/resource estimate |
| [GOOGLE_CLOUD_CHECKLIST.md](./GOOGLE_CLOUD_CHECKLIST.md) | ⚠️ **Superseded** — pre-flight checklist for the above |
| [setup-gcp.sh](./setup-gcp.sh) | ⚠️ **Superseded** — would create duplicate resources; see its header |

---

## Quick Start

```bash
# 1. Authenticate with GCP
gcloud auth login
gcloud auth application-default login

# 2. Run foundation setup (creates APIs, Registry, SA, Secrets)
chmod +x deployment/setup-gcp.sh
./deployment/setup-gcp.sh --project=YOUR_PROJECT_ID

# 3. Populate secrets (see ENVIRONMENT_VARIABLES.md)
echo -n "YOUR_JWT_SECRET" | gcloud secrets versions add DWIP_JWT_SECRET --data-file=-

# 4. Connect GitHub → Cloud Build trigger in GCP Console

# 5. Push to main to trigger first build
git push origin main

# 6. Verify
PILOT_URL=$(gcloud run services describe dwip-enterprise --region=asia-south1 --project=giga-course-dp497 --format='value(status.url)')
curl $PILOT_URL/api/health
```

---

## Architecture Summary

| Component | Technology | Notes |
|---|---|---|
| **Runtime** | Node.js 22 LTS | Matches local development |
| **Framework** | Express 4.21.2 | Single entry point — `server.ts` (there is no `server/app.ts`) |
| **Frontend** | React 19 + Vite 6 | SPA served as static files from `dist/` |
| **Customer Portal** | React 19 (separate Vite build) | `dist/customer-portal/` |
| **Server Bundle** | esbuild → `dist/server.cjs` | CJS bundle, all deps external |
| **Database** | MySQL 8 via `mysql2` | Cloud SQL instance `wms-mysql-db` over public IP; schema keeps the legacy name `railway` |
| **Authentication** | JWT (HS256) — `jsonwebtoken` | Separate secrets for staff + customer |
| **Health Check** | `GET /api/health` → HTTP 200 | Only `/api/health` exists — `/api/ready` and `/api/metrics` are NOT registered in `server.ts` |
| **Port** | 3001 | Configurable via `PORT` env var |
| **Container Image** | `node:22-slim` + `dumb-init` | Non-root user `dwip`, PID 1 managed |
| **Registry** | Artifact Registry — asia-south1 | `asia-south1-docker.pkg.dev/giga-course-dp497/cloud-run-source-deploy/dwip-enterprise` |
| **Deployment** | Cloud Run (Fully Managed) | Region: asia-south1 (Mumbai) |
| **CI/CD** | Cloud Build | Trigger: push to `main` → pilot |
| **Secrets** | Cloud Run env vars | Plaintext env vars **on the running service** — not Secret Manager, and not in this repo |

---

## Build Verification

Production build `npm run build:rc1` was verified passing:

```
✅ Frontend SPA:        dist/assets/index-*.js   (3,418 kB | gzip: 586 kB)
✅ Customer Portal:     dist/customer-portal/     (493 kB | gzip: 132 kB)
✅ Server Bundle:       dist/server.cjs           (748 kB)
✅ Build Time:          ~83 seconds total
```

---

## Health Endpoints

| Endpoint | Route | Use |
|---|---|---|
| Liveness | `GET /api/health` | Cloud Run startup + liveness probe (also `GET /api/system/health-gateway`) |
| Readiness | — | **Not implemented** — `/api/ready` is not registered in `server.ts` |
| Metrics | — | **Not implemented** — `/api/metrics` is not registered in `server.ts` |

---

## Security Hardening Applied

| Control | Status |
|---|---|
| Non-root container user (`dwip`, UID 1001) | ✅ |
| dumb-init PID 1 (proper signal handling) | ✅ |
| Multi-stage build (no devDeps in image) | ✅ |
| `workshop_db.json` excluded from image | ✅ |
| No `.env` files in image | ✅ |
| Secrets via Secret Manager only | ⚠️ Not what production does — secrets are plaintext Cloud Run env vars |
| CSP, X-Frame-Options, HSTS, nosniff headers | ✅ (`server.ts`) |
| Gzip compression | ✅ (compression middleware) |
| Rate limiting on login | ✅ (express-rate-limit) |
| bcrypt password hashing | ✅ (certified) |

---

## Do NOT Modify

These files carry production-critical behaviour — change them only deliberately, then re-run
`npm run lint` and `npm run lint:fabrication`:

- `server.ts` — production entry point (and the only server entry point)
- `src/config/env.ts` — environment validation
- `src/db/index.ts` — database pool with retry logic

> `server/app.ts` and `health/health.controller.ts` were listed here historically but **do not
exist** — they were moved to `_quarantine/2026-08-31b/` during the 2026-08-31 cleanup.
