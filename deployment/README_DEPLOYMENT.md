# DWIP Enterprise ERP — Cloud Deployment README

## Sprint GCP-001 Deliverables

All Cloud Run deployment files are in the `deployment/` folder.

| File | Purpose |
|---|---|
| [Dockerfile](./Dockerfile) | Production-hardened multi-stage container build |
| [cloudbuild.yaml](./cloudbuild.yaml) | Google Cloud Build CI/CD pipeline |
| [setup-gcp.sh](./setup-gcp.sh) | One-shot GCP foundation setup script |
| [CLOUD_RUN_SETUP.md](./CLOUD_RUN_SETUP.md) | Step-by-step Cloud Run setup guide |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | Complete env var reference |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | Operational deployment runbook |
| [GCP_RESOURCE_PLAN.md](./GCP_RESOURCE_PLAN.md) | Resource architecture and cost estimates |

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
PILOT_URL=$(gcloud run services describe dwip-pilot --region=asia-south1 --format='value(status.url)')
curl $PILOT_URL/api/health
```

---

## Architecture Summary

| Component | Technology | Notes |
|---|---|---|
| **Runtime** | Node.js 22 LTS | Matches local development |
| **Framework** | Express 4.21.2 | `server.ts` → `server/app.ts` |
| **Frontend** | React 19 + Vite 6 | SPA served as static files from `dist/` |
| **Customer Portal** | React 19 (separate Vite build) | `dist/customer-portal/` |
| **Server Bundle** | esbuild → `dist/server.cjs` | CJS bundle, all deps external |
| **Database** | MySQL 8 via `mysql2` | Railway (pilot) / Cloud SQL (RC2) |
| **Authentication** | JWT (HS256) — `jsonwebtoken` | Separate secrets for staff + customer |
| **Health Check** | `GET /api/health` → HTTP 200 | `GET /api/ready` tests DB connection |
| **Port** | 3001 | Configurable via `PORT` env var |
| **Container Image** | `node:22-slim` + `dumb-init` | Non-root user `dwip`, PID 1 managed |
| **Registry** | Artifact Registry — asia-south1 | `asia-south1-docker.pkg.dev/PROJECT/dwip-images/dwip` |
| **Deployment** | Cloud Run (Fully Managed) | Region: asia-south1 (Mumbai) |
| **CI/CD** | Cloud Build | Trigger: push to `main` → pilot |
| **Secrets** | Secret Manager | 7 secrets, all injected via `--set-secrets` |

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
| Liveness | `GET /api/health` | Cloud Run startup + liveness probe |
| Readiness | `GET /api/ready` | DB connectivity check |
| Metrics | `GET /api/metrics` | Memory and uptime telemetry |

---

## Security Hardening Applied

| Control | Status |
|---|---|
| Non-root container user (`dwip`, UID 1001) | ✅ |
| dumb-init PID 1 (proper signal handling) | ✅ |
| Multi-stage build (no devDeps in image) | ✅ |
| `workshop_db.json` excluded from image | ✅ |
| No `.env` files in image | ✅ |
| Secrets via Secret Manager only | ✅ |
| CSP, X-Frame-Options, HSTS, nosniff headers | ✅ (server/app.ts) |
| Gzip compression | ✅ (compression middleware) |
| Rate limiting on login | ✅ (express-rate-limit) |
| bcrypt password hashing | ✅ (certified) |

---

## Do NOT Modify

These files are part of the **frozen RC1.1 architecture** and must not be changed:

- `server.ts` — production entry point
- `server/app.ts` — Express middleware chain
- `src/config/env.ts` — environment validation
- `src/db/index.ts` — database pool with retry logic
- `health/health.controller.ts` — health check endpoints
