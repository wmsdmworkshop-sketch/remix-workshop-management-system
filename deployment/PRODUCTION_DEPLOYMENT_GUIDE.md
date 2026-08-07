# DWIP Enterprise ERP — Production Deployment Guide

**Application:** DWIP Enterprise ERP RC1.1  
**Platform:** Google Cloud Run (asia-south1)  
**Document Type:** Operational Runbook  
**Audience:** DevOps Engineer, Deployment Manager, Release Manager

---

## Deployment Architecture Overview

```
GitHub (main branch)
        │
        ▼ push event
Google Cloud Build
  ├─ [1] Lint (tsc --noEmit)
  ├─ [2] Docker Build (multi-stage)
  ├─ [3] Push → Artifact Registry (asia-south1)
  ├─ [4] Deploy → Cloud Run: dwip-pilot
  └─ [5] Smoke Test /api/health

        Manual Approval
        │
        ▼ gcloud run deploy
Cloud Run: dwip-prod
```

---

## Pre-Deployment Checklist

### Infrastructure
- [ ] GCP project created with billing enabled
- [ ] All APIs enabled (run `./deployment/setup-gcp.sh`)
- [ ] Artifact Registry repository `dwip-images` exists
- [ ] Service account `dwip-cloudrun-sa` created with correct roles
- [ ] All 7 Secret Manager secrets populated with real values

### Database
- [ ] Railway MySQL database is RUNNING and ACCESSIBLE
- [ ] Secret `DWIP_DB_HOST` contains correct Railway host
- [ ] Readiness check `GET /api/ready` returns `READY` locally

### Security
- [ ] JWT secrets are 64+ char random values
- [ ] No `.env` file committed to Git
- [ ] `workshop_db.json` excluded from Docker image (`.dockerignore`)
- [ ] `DB_SSL=true` for Railway connection

### CI/CD
- [ ] GitHub repository connected to Cloud Build
- [ ] Cloud Build trigger `dwip-deploy-pilot` active
- [ ] `deployment/cloudbuild.yaml` present in repo

---

## Deployment Procedure — Pilot

### Trigger (Automatic)
Push to `main` branch triggers Cloud Build automatically.

```bash
git push origin main
```

Monitor at: https://console.cloud.google.com/cloud-build/builds

### Manual Trigger
```bash
gcloud builds submit \
  --config=deployment/cloudbuild.yaml \
  --project=YOUR_PROJECT_ID \
  --substitutions=_REGION=asia-south1,_REPO_NAME=dwip-images
```

---

## Deployment Procedure — Production

> [!CAUTION]
> Production deployment is **ALWAYS MANUAL**. No automation. Requires explicit command approval.

```bash
# Step 1: Identify the verified image SHA from pilot
gcloud run services describe dwip-pilot \
  --region=asia-south1 \
  --project=YOUR_PROJECT_ID \
  --format='value(spec.template.spec.containers[0].image)'

# Step 2: Deploy that exact SHA to production
IMAGE="asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/dwip-images/dwip:VERIFIED_SHA"

gcloud run deploy dwip-prod \
  --image=$IMAGE \
  --region=asia-south1 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=2 \
  --max-instances=10 \
  --concurrency=100 \
  --set-env-vars="NODE_ENV=production,TRUST_PROXY=1" \
  --set-secrets="JWT_SECRET=DWIP_JWT_SECRET:latest,CUSTOMER_JWT_SECRET=DWIP_CUSTOMER_JWT_SECRET:latest,DB_HOST=DWIP_DB_HOST:latest,DB_USER=DWIP_DB_USER:latest,DB_PASSWORD=DWIP_DB_PASSWORD:latest,DB_DATABASE=DWIP_DB_DATABASE:latest,GEMINI_API_KEY=DWIP_GEMINI_API_KEY:latest" \
  --service-account="dwip-cloudrun-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --project=YOUR_PROJECT_ID
```

---

## Post-Deployment Verification

```bash
# Get deployed URL
URL=$(gcloud run services describe dwip-pilot --region=asia-south1 --project=YOUR_PROJECT_ID --format='value(status.url)')

# 1. Liveness
curl -s $URL/api/health | python -m json.tool

# 2. Readiness (DB connection test)
curl -s $URL/api/ready | python -m json.tool

# 3. Security headers
curl -sI $URL/api/health | grep -E "X-Frame|X-Content|CSP|HSTS|X-XSS"

# 4. Response time
curl -s -o /dev/null -w "Time: %{time_total}s\nHTTP: %{http_code}\n" $URL/api/health

# 5. HTTPS enforced
curl -s -o /dev/null -w "%{http_code}" http://$(echo $URL | sed 's|https://||')/api/health
# Should redirect (301) or fail — HTTP must not serve content
```

---

## Rollback Procedure

### Identify Revisions
```bash
gcloud run revisions list \
  --service=dwip-pilot \
  --region=asia-south1 \
  --project=YOUR_PROJECT_ID \
  --sort-by='~createTime' \
  --limit=5
```

### Instant Rollback
```bash
# Route 100% to previous revision
gcloud run services update-traffic dwip-pilot \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=asia-south1 \
  --project=YOUR_PROJECT_ID
```

### Gradual Rollback (Canary)
```bash
# Route 10% to old, 90% to new — to test without full rollback
gcloud run services update-traffic dwip-pilot \
  --to-revisions=OLD_REVISION=10,NEW_REVISION=90 \
  --region=asia-south1 \
  --project=YOUR_PROJECT_ID
```

---

## Monitoring

### Cloud Logging
```bash
# Live logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=dwip-pilot" \
  --project=YOUR_PROJECT_ID

# Error logs only
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --project=YOUR_PROJECT_ID \
  --limit=50
```

### Cloud Monitoring Dashboard
Navigate to: https://console.cloud.google.com/monitoring

Key metrics to watch:
- `run.googleapis.com/request_count` — total requests per second
- `run.googleapis.com/request_latencies` — p50, p95, p99 latency
- `run.googleapis.com/container/memory/utilizations` — memory %
- `run.googleapis.com/container/cpu/utilizations` — CPU %

---

## Secret Rotation

```bash
PROJECT_ID="YOUR_PROJECT_ID"

# Generate new JWT secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

# Add new version (old version still active until Cloud Run restarts)
echo -n "$NEW_SECRET" | gcloud secrets versions add DWIP_JWT_SECRET --data-file=- --project=$PROJECT_ID

# Update Cloud Run to use new version (:latest picks it up automatically)
gcloud run services update dwip-pilot \
  --region=asia-south1 \
  --update-secrets="JWT_SECRET=DWIP_JWT_SECRET:latest" \
  --project=$PROJECT_ID
# This triggers a rolling restart — no downtime

# Disable old version (after confirming new version works)
gcloud secrets versions disable VERSION_NUMBER --secret=DWIP_JWT_SECRET --project=$PROJECT_ID
```

---

## Startup & Shutdown Behavior

### Startup
1. Cloud Run sends HTTP traffic after container passes liveness probe (`/api/health` HTTP 200)
2. `validateEnvironment()` runs at startup — process exits with code 1 if secrets are missing
3. Database pool is initialized lazily on first query
4. WebSocket server starts on the same HTTP port

### Shutdown (SIGTERM)
1. Cloud Run sends `SIGTERM` to container (30s grace period)
2. `dumb-init` (PID 1) forwards signal to Node.js
3. Node.js should begin graceful drain
4. Existing connections complete, new connections rejected

> [!NOTE]
> Current RC1.1 does NOT have an explicit `SIGTERM` handler for graceful drain.
> Cloud Run's 30-second grace period is sufficient for the pilot workload.
> A proper `process.on('SIGTERM')` handler with `server.close()` is recommended for RC2.

---

## Incident Response

| Symptom | Likely Cause | Action |
|---|---|---|
| Container startup fails | Missing secret | Check Cloud Logging for `MISSING` env var output |
| HTTP 503 on all routes | DB unreachable | Check `GET /api/ready` — if NOT_READY, Railway MySQL is down |
| HTTP 401 on login | Wrong JWT_SECRET version | Verify secret version in Secret Manager |
| Memory OOM | Traffic spike | Increase `--memory` to 1Gi via `gcloud run services update` |
| Build fails at lint | TypeScript error | Fix error locally, push fix commit |
| Build fails at push | Artifact Registry auth | Re-run `setup-gcp.sh` to fix IAM bindings |
