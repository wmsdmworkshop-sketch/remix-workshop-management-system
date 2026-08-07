# DWIP Enterprise ERP — Cloud Run Setup Guide

## Document Information

| Field | Value |
|---|---|
| Application | DWIP Enterprise ERP RC1.1 |
| Target Platform | Google Cloud Run (Fully Managed) |
| Region | asia-south1 (Mumbai, India) |
| Database | Railway MySQL (Pilot) |
| Registry | Google Artifact Registry |
| CI/CD | Google Cloud Build |

---

## Prerequisites Checklist

Before starting, confirm these prerequisites are met:

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed: https://cloud.google.com/sdk/docs/install
- [ ] `docker` installed locally (for local image testing)
- [ ] `gcloud auth login` completed
- [ ] GitHub repository: `wmsdmworkshop-sketch/remix-workshop-management-system`
- [ ] Railway MySQL database running with pilot data loaded
- [ ] Railway MySQL public TCP host, port, user, password available

---

## Step 1 — Create GCP Project

```bash
# Option A: Create new project
gcloud projects create dwip-pilot-XXXXXX \
  --name="DWIP Pilot" \
  --set-as-default

# OR use an existing project
gcloud config set project YOUR_EXISTING_PROJECT_ID

# Confirm billing is enabled
gcloud billing projects describe YOUR_PROJECT_ID
```

---

## Step 2 — Run Foundation Setup Script

```bash
# Make script executable
chmod +x deployment/setup-gcp.sh

# Run with your project ID
./deployment/setup-gcp.sh --project=YOUR_PROJECT_ID
```

This script automatically:
1. Enables all required GCP APIs
2. Creates Artifact Registry repository `dwip-images`
3. Creates Cloud Run service account `dwip-cloudrun-sa`
4. Grants IAM roles to service accounts
5. Creates Secret Manager secret placeholders
6. Creates Cloud Build trigger (GitHub → main → pilot)

---

## Step 3 — Populate Secrets

After running the setup script, populate each Secret Manager secret with real values.

```bash
PROJECT_ID="YOUR_PROJECT_ID"

# JWT Secrets — generate secure random values
JWT_VAL=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
CUST_JWT_VAL=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

echo -n "$JWT_VAL"      | gcloud secrets versions add DWIP_JWT_SECRET          --data-file=- --project=$PROJECT_ID
echo -n "$CUST_JWT_VAL" | gcloud secrets versions add DWIP_CUSTOMER_JWT_SECRET --data-file=- --project=$PROJECT_ID

# Database credentials — from Railway dashboard
echo -n "YOUR_RAILWAY_DB_HOST"     | gcloud secrets versions add DWIP_DB_HOST     --data-file=- --project=$PROJECT_ID
echo -n "YOUR_RAILWAY_DB_USER"     | gcloud secrets versions add DWIP_DB_USER     --data-file=- --project=$PROJECT_ID
echo -n "YOUR_RAILWAY_DB_PASSWORD" | gcloud secrets versions add DWIP_DB_PASSWORD --data-file=- --project=$PROJECT_ID
echo -n "railway"                  | gcloud secrets versions add DWIP_DB_DATABASE --data-file=- --project=$PROJECT_ID

# Gemini API Key — from Google AI Studio
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add DWIP_GEMINI_API_KEY --data-file=- --project=$PROJECT_ID
```

---

## Step 4 — Connect GitHub to Cloud Build

1. Open https://console.cloud.google.com/cloud-build/triggers
2. Select your project
3. Click **Connect Repository**
4. Choose **GitHub** → Authenticate with GitHub
5. Select `wmsdmworkshop-sketch/remix-workshop-management-system`
6. Confirm the trigger `dwip-deploy-pilot` was created by the setup script
7. If not present, create it manually pointing to `deployment/cloudbuild.yaml`

---

## Step 5 — First Manual Deploy (Push to Main)

```bash
# From your local machine
cd c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system
git add .
git commit -m "feat: add Cloud Run deployment configuration"
git push origin main
```

Cloud Build will automatically:
1. Run `tsc --noEmit` (lint)
2. Build the Docker image
3. Push to Artifact Registry
4. Deploy to `dwip-pilot`
5. Run smoke test on `/api/health`

Monitor progress at: https://console.cloud.google.com/cloud-build/builds

---

## Step 6 — Verify Deployment

```bash
PROJECT_ID="YOUR_PROJECT_ID"
REGION="asia-south1"

# Get the pilot service URL
PILOT_URL=$(gcloud run services describe dwip-pilot \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo "Pilot URL: $PILOT_URL"

# Health check
curl $PILOT_URL/api/health
# Expected: {"status":"UP","timestamp":"..."}

# Readiness check (tests DB connectivity)
curl $PILOT_URL/api/ready
# Expected: {"status":"READY","database":"CONNECTED","timestamp":"..."}

# Security headers
curl -I $PILOT_URL/api/health
# Look for: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, etc.
```

---

## Step 7 — Configure Uptime Monitoring

```bash
PROJECT_ID="YOUR_PROJECT_ID"
PILOT_URL="https://YOUR_PILOT_URL"  # from step 6

# Create uptime check (checks every 60 seconds from multiple regions)
gcloud monitoring uptime-checks create http dwip-pilot-uptime \
  --display-name="DWIP Pilot Health Check" \
  --uri="${PILOT_URL}/api/health" \
  --period=60 \
  --timeout=10 \
  --project=$PROJECT_ID

echo "✅ Uptime monitoring configured."
```

---

## Step 8 — Deploy to Production (Manual Only)

Production deployment is **never automated**. It requires a manual `gcloud run deploy` command.

```bash
PROJECT_ID="YOUR_PROJECT_ID"
REGION="asia-south1"
IMAGE_SHA="YOUR_VERIFIED_IMAGE_SHA"  # from Artifact Registry after pilot validation

gcloud run deploy dwip-prod \
  --image="asia-south1-docker.pkg.dev/${PROJECT_ID}/dwip-images/dwip:${IMAGE_SHA}" \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3001 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=2 \
  --max-instances=10 \
  --concurrency=100 \
  --timeout=60 \
  --set-env-vars="NODE_ENV=production,TRUST_PROXY=1" \
  --set-secrets="JWT_SECRET=DWIP_JWT_SECRET:latest,\
CUSTOMER_JWT_SECRET=DWIP_CUSTOMER_JWT_SECRET:latest,\
DB_HOST=DWIP_DB_HOST:latest,\
DB_USER=DWIP_DB_USER:latest,\
DB_PASSWORD=DWIP_DB_PASSWORD:latest,\
DB_DATABASE=DWIP_DB_DATABASE:latest,\
GEMINI_API_KEY=DWIP_GEMINI_API_KEY:latest" \
  --service-account="dwip-cloudrun-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project=$PROJECT_ID
```

---

## Rollback Procedure

```bash
PROJECT_ID="YOUR_PROJECT_ID"
REGION="asia-south1"

# List recent revisions
gcloud run revisions list \
  --service=dwip-pilot \
  --region=$REGION \
  --project=$PROJECT_ID

# Route 100% traffic to a previous good revision
gcloud run services update-traffic dwip-pilot \
  --to-revisions=dwip-pilot-00002-abc=100 \
  --region=$REGION \
  --project=$PROJECT_ID

echo "✅ Rolled back. Pilot now serving from previous revision."
```

---

## Cloud Run Service Parameters

| Parameter | Pilot | Production |
|---|---|---|
| Memory | 512 Mi | 1 Gi |
| CPU | 1 | 2 |
| Min Instances | 1 | 2 |
| Max Instances | 3 | 10 |
| Concurrency | 100 | 100 |
| Timeout | 60s | 60s |
| Health Check | `/api/health` | `/api/health` |
| Readiness Check | `/api/ready` | `/api/ready` |

---

## Health Endpoints

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `GET /api/health` | Liveness — is the process alive? | `{"status":"UP","timestamp":"..."}` HTTP 200 |
| `GET /api/ready` | Readiness — is the DB connected? | `{"status":"READY","database":"CONNECTED"}` HTTP 200 |
| `GET /api/metrics` | Runtime metrics (memory, uptime) | JSON HTTP 200 |
