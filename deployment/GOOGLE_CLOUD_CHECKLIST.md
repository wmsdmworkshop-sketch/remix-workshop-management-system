# DWIP Enterprise ERP — Google Cloud Deployment Checklist

**Sprint:** GCP-002  
**Status:** FINAL — Pre-Execution Gate

---

## Section A — Prerequisites

| # | Item | Check |
|---|---|---|
| A1 | GCP account with billing enabled | ☐ |
| A2 | `gcloud` CLI v450+ installed locally | ☐ |
| A3 | `gcloud auth login` completed | ☐ |
| A4 | `gcloud auth application-default login` completed | ☐ |
| A5 | GCP Project ID confirmed and available | ☐ |
| A6 | GitHub repo `wmsdmworkshop-sketch/remix-workshop-management-system` accessible | ☐ |
| A7 | Railway MySQL database is LIVE and accessible | ☐ |
| A8 | Railway DB host, user, password, database name confirmed | ☐ |
| A9 | Gemini API key available (optional) | ☐ |

---

## Section B — GCP Foundation (setup-gcp.sh)

| # | Item | Check |
|---|---|---|
| B1 | `chmod +x deployment/setup-gcp.sh` executed | ☐ |
| B2 | `./deployment/setup-gcp.sh --project=PROJECT_ID` run without errors | ☐ |
| B3 | All 7 GCP APIs enabled (confirm in Cloud Console) | ☐ |
| B4 | Artifact Registry `dwip-images` created in `asia-south1` | ☐ |
| B5 | Service account `dwip-cloudrun-sa@PROJECT_ID.iam.gserviceaccount.com` created | ☐ |
| B6 | IAM binding: `secretmanager.secretAccessor` on `dwip-cloudrun-sa` | ☐ |
| B7 | IAM binding: `cloudsql.client` on `dwip-cloudrun-sa` | ☐ |
| B8 | IAM binding: `run.developer` on Cloud Build SA | ☐ |
| B9 | IAM binding: `artifactregistry.writer` on Cloud Build SA | ☐ |
| B10 | IAM binding: `iam.serviceAccountUser` on Cloud Build SA (scoped to dwip SA) | ☐ |
| B11 | All 7 Secret Manager secret shells created | ☐ |

---

## Section C — Secret Manager Values

| # | Secret Name | Value Set | Verified Non-Empty |
|---|---|---|---|
| C1 | `DWIP_JWT_SECRET` | ☐ | ☐ |
| C2 | `DWIP_CUSTOMER_JWT_SECRET` | ☐ | ☐ |
| C3 | `DWIP_DB_HOST` | ☐ | ☐ |
| C4 | `DWIP_DB_USER` | ☐ | ☐ |
| C5 | `DWIP_DB_PASSWORD` | ☐ | ☐ |
| C6 | `DWIP_DB_DATABASE` | ☐ | ☐ |
| C7 | `DWIP_GEMINI_API_KEY` | ☐ | ☐ |

**Verify secrets populated:**
```bash
gcloud secrets versions list DWIP_JWT_SECRET --project=PROJECT_ID
# Should show: STATE=enabled, CREATED=...
```

---

## Section D — GitHub → Cloud Build Connection

| # | Item | Check |
|---|---|---|
| D1 | Navigate to Cloud Build → Triggers in GCP Console | ☐ |
| D2 | Click "Connect Repository" | ☐ |
| D3 | Authenticate with GitHub | ☐ |
| D4 | Select `wmsdmworkshop-sketch/remix-workshop-management-system` | ☐ |
| D5 | Confirm trigger `dwip-deploy-pilot` points to `deployment/cloudbuild.yaml` | ☐ |
| D6 | Set trigger substitutions: `_CLOUD_RUN_SA=dwip-cloudrun-sa@PROJECT_ID.iam.gserviceaccount.com` | ☐ |

---

## Section E — First Build & Deploy

| # | Item | Check |
|---|---|---|
| E1 | Commit all deployment files: `git add deployment/ .dockerignore` | ☐ |
| E2 | `git push origin main` executed | ☐ |
| E3 | Cloud Build triggered automatically | ☐ |
| E4 | Step 1 (lint) PASSED | ☐ |
| E5 | Step 2 (build-image) PASSED | ☐ |
| E6 | Step 3 (push-image) PASSED | ☐ |
| E7 | Step 4 (deploy-pilot) PASSED | ☐ |
| E8 | Step 5 (smoke-test-pilot) PASSED — health check HTTP 200 | ☐ |
| E9 | Pilot URL recorded: `https://dwip-pilot-HASH-el.a.run.app` | ☐ |

---

## Section F — Post-Deploy Verification

| # | Item | Command | Expected |
|---|---|---|---|
| F1 | Liveness probe | `curl PILOT_URL/api/health` | `{"status":"UP"}` HTTP 200 |
| F2 | Readiness probe | `curl PILOT_URL/api/ready` | `{"status":"READY","database":"CONNECTED"}` HTTP 200 |
| F3 | Security: X-Frame | `curl -I PILOT_URL/api/health \| grep X-Frame` | `DENY` |
| F4 | Security: CSP | `curl -I PILOT_URL/api/health \| grep Content-Security` | Present |
| F5 | Security: HSTS | `curl -I PILOT_URL/api/health \| grep Strict-Transport` | Present |
| F6 | Security: nosniff | `curl -I PILOT_URL/api/health \| grep X-Content-Type` | `nosniff` |
| F7 | Login API | POST `/api/login` with admin credentials | JWT token returned |
| F8 | HTTPS enforced | `curl http://...` | Redirect to HTTPS |
| F9 | Cloud Run logs active | Cloud Logging → Cloud Run revision | Logs visible |

---

## Section G — Monitoring Setup

| # | Item | Check |
|---|---|---|
| G1 | Create uptime check for `PILOT_URL/api/health` | ☐ |
| G2 | Create alert: HTTP 5xx rate > 5% for 5 minutes | ☐ |
| G3 | Create alert: Memory utilization > 80% for 5 minutes | ☐ |
| G4 | Create alert: Uptime check failure for 1 minute | ☐ |
| G5 | Alert notification channel set (email/SMS) | ☐ |

---

## Section H — Pilot Go-Live Sign-Off

| # | Signatory | Role | Signature |
|---|---|---|---|
| H1 | __________________ | DevOps Engineer | |
| H2 | __________________ | Workshop Operations Head | |
| H3 | __________________ | Information Security Officer | |
| H4 | __________________ | ERP Program Director | |
