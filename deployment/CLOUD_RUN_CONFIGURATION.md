# DWIP Enterprise ERP — Cloud Run Service Configuration

**Review:** GCP-002 — Final Configuration Specification  
**Region:** asia-south1 (Mumbai, India)

---

## Service: `dwip-pilot`

### gcloud deploy command

```bash
gcloud run deploy dwip-pilot \
  --image=asia-south1-docker.pkg.dev/PROJECT_ID/dwip-images/dwip:SHA \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3001 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=3 \
  --concurrency=80 \
  --timeout=120 \
  --set-env-vars="NODE_ENV=production,TRUST_PROXY=1,DB_SSL=true,DB_PORT=3306" \
  --set-secrets="\
JWT_SECRET=DWIP_JWT_SECRET:latest,\
CUSTOMER_JWT_SECRET=DWIP_CUSTOMER_JWT_SECRET:latest,\
DB_HOST=DWIP_DB_HOST:latest,\
DB_USER=DWIP_DB_USER:latest,\
DB_PASSWORD=DWIP_DB_PASSWORD:latest,\
DB_DATABASE=DWIP_DB_DATABASE:latest,\
GEMINI_API_KEY=DWIP_GEMINI_API_KEY:latest" \
  --service-account=dwip-cloudrun-sa@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID
```

### Configuration Rationale

| Parameter | Value | Rationale |
|---|---|---|
| `--memory=512Mi` | 512 Mi | Node.js heap for 8,403-line server + WebSocket map + 10 MySQL conn pool |
| `--cpu=1` | 1 vCPU | Node.js is single-threaded; 1 CPU is optimal below 80 RPS |
| `--min-instances=1` | 1 | Keeps 1 container warm — eliminates cold starts for pilot users |
| `--max-instances=3` | 3 | 4 workshops × ~8 concurrent users × 3 = safe headroom at 80 concurrency |
| `--concurrency=80` | 80 | MySQL pool = 10 connections. At 80 concurrency, DB queueing is minimal. 100 was too high. |
| `--timeout=120` | 120s | Gemini AI routes can take 15-30s. Report generation routes can reach 45-60s. 60s was insufficient. |
| `--allow-unauthenticated` | true | DWIP handles its own JWT-based auth — Cloud Run IAM auth would double-authenticate |
| `DB_SSL=true` | true | Railway MySQL requires SSL encrypted connections |
| `TRUST_PROXY=1` | 1 | Cloud Run is behind a Google load balancer; tells Express to trust X-Forwarded-For |

---

## Service: `dwip-prod`

### gcloud deploy command

```bash
gcloud run deploy dwip-prod \
  --image=asia-south1-docker.pkg.dev/PROJECT_ID/dwip-images/dwip:VERIFIED_SHA \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3001 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=2 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=120 \
  --set-env-vars="NODE_ENV=production,TRUST_PROXY=1,DB_SSL=true,DB_PORT=3306" \
  --set-secrets="\
JWT_SECRET=DWIP_JWT_SECRET:latest,\
CUSTOMER_JWT_SECRET=DWIP_CUSTOMER_JWT_SECRET:latest,\
DB_HOST=DWIP_DB_HOST:latest,\
DB_USER=DWIP_DB_USER:latest,\
DB_PASSWORD=DWIP_DB_PASSWORD:latest,\
DB_DATABASE=DWIP_DB_DATABASE:latest,\
GEMINI_API_KEY=DWIP_GEMINI_API_KEY:latest" \
  --service-account=dwip-cloudrun-sa@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID
```

---

## Health Check Endpoints

| Endpoint | Route | Cloud Run Use |
|---|---|---|
| Liveness | `GET /api/health` → `{"status":"UP","timestamp":"..."}` | Startup + liveness probe |
| Readiness | `GET /api/ready` → `{"status":"READY","database":"CONNECTED"}` | DB connectivity |
| Metrics | `GET /api/metrics` → memory/uptime JSON | Operational telemetry |

Cloud Run performs liveness checks via its own HTTP probe — the Dockerfile HEALTHCHECK is for local `docker run` only.

---

## WebSocket Support

Cloud Run fully supports WebSockets. DWIP uses two WebSocket endpoints:

| Endpoint | Purpose |
|---|---|
| `ws://HOST/api/live` | Live voice chat / technician broadcast |
| `ws://HOST/api/customer/live-progress` | Customer job status live updates |

WebSocket connections follow the HTTP upgrade protocol. Cloud Run supports these natively with no additional configuration.

> **Note:** WebSocket connections count against the concurrency limit. Each open WebSocket connection consumes 1 concurrency slot.

---

## Autoscaling Behavior

```
Traffic pattern → Cloud Run autoscaler behavior:

Normal shift (08:00–18:00):
  ~30 concurrent users × 4 workshops = ~120 active requests
  = 2 instances at 80 concurrency

Peak (10:00–12:00, 15:00–17:00):
  ~50 concurrent → Cloud Run scales to 3 instances

Off-shift (18:00–08:00):
  min-instances=1 keeps 1 warm instance running
  Cost: ~$4/month for the warm instance
```

---

## Traffic Management (Blue/Green / Canary)

```bash
# Deploy new revision without routing traffic
gcloud run deploy dwip-pilot \
  --image=asia-south1-docker.pkg.dev/PROJECT_ID/dwip-images/dwip:NEW_SHA \
  --no-traffic \
  --tag=canary

# Route 10% to canary
gcloud run services update-traffic dwip-pilot \
  --to-revisions=dwip-pilot-CANARY=10,CURRENT=90

# Full cutover if stable
gcloud run services update-traffic dwip-pilot \
  --to-revisions=dwip-pilot-CANARY=100

# Emergency rollback
gcloud run services update-traffic dwip-pilot \
  --to-revisions=PREVIOUS_GOOD_REVISION=100
```

---

## CORS Configuration

The hardcoded Cloud Run CORS origin in `server/app.ts` is:
```
https://wms-workshop-app-772298398554.asia-south1.run.app
```

> [!IMPORTANT]
> After the first Cloud Run deployment, the actual URL will be different. Update `server/app.ts` with the real pilot URL OR add it to `ADDITIONAL_CORS_ORIGINS` environment variable before pilot go-live.

```bash
# Add real pilot URL to CORS without modifying code
gcloud run services update dwip-pilot \
  --update-env-vars="ADDITIONAL_CORS_ORIGINS=https://REAL_PILOT_URL.run.app" \
  --region=asia-south1
```
