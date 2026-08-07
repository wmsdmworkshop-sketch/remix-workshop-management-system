# DWIP Enterprise ERP — Deployment Decision

**Sprint:** GCP-002 — Google Cloud Deployment Validation  
**Date:** 2026-07-15  
**Decision Authority:** Enterprise Cloud Architecture Board

---

## Evidence Summary

### Audit Scope: 10 Technical Domains

| Domain | Items Reviewed | Issues Found | Issues Fixed | Status |
|---|---|---|---|---|
| Dockerfile | 10 checks | 2 issues | 2 fixed | ✅ PASS |
| cloudbuild.yaml | 12 checks | 2 critical bugs | 2 fixed | ✅ PASS |
| setup-gcp.sh | 12 checks | 1 issue | 1 fixed | ✅ PASS |
| Environment Variables | 15 variables | 0 issues | — | ✅ PASS |
| Cloud Run Configuration | 10 parameters | 2 tuning adjustments | 2 applied | ✅ PASS |
| Cloud SQL Architecture | Strategy review | Correctly deferred to RC2 | — | ✅ PASS |
| Security | 25 controls | 1 IAM overprivilege | 1 fixed | ✅ PASS |
| Logging & Monitoring | 10 items | Gaps documented | Alerting plan created | ✅ CONDITIONAL |
| CI/CD Strategy | 8 items | 0 critical issues | — | ✅ PASS |

---

## Critical Bugs Found & Fixed (Before Decision)

| # | File | Bug | Severity | Fix Applied |
|---|---|---|---|---|
| 1 | `cloudbuild.yaml` | `_CLOUD_RUN_SA` substitution uses `${PROJECT_ID}` inside a YAML default — this does NOT interpolate at runtime | 🔴 CRITICAL | Default removed; must be set in trigger configuration |
| 2 | `cloudbuild.yaml` | Smoke test used `gcr.io/cloud-builders/curl` which has NO `gcloud` CLI — `gcloud run services describe` would fail | 🔴 CRITICAL | Changed to `gcr.io/google.com/cloudsdktool/cloud-sdk:slim` |
| 3 | `Dockerfile` | `COPY public/` fails if source directory is empty or absent | 🟡 MEDIUM | `RUN mkdir -p ./public` added before COPY |
| 4 | `cloudbuild.yaml` | Concurrency=100 too high for 10-connection MySQL pool | 🟡 MEDIUM | Changed to 80 |
| 5 | `cloudbuild.yaml` | Timeout=60s insufficient for Gemini AI routes (15-30s latency) | 🟡 MEDIUM | Changed to 120s |
| 6 | `setup-gcp.sh` | Cloud Build granted `roles/run.admin` (can delete services) | 🟡 MEDIUM | Downgraded to `roles/run.developer` |

---

## Remaining Items (Accepted for Pilot)

| Item | Classification | Mitigation |
|---|---|---|
| No `npm audit` in CI | Technical Debt | Run manually before production; no known CVEs in RC1.1 |
| CORS URL hardcoded in `server/app.ts` | Configuration | Set `ADDITIONAL_CORS_ORIGINS` env var after first deploy |
| Monitoring alerts not yet configured | Post-Deploy | Alerting plan documented in FINAL_DEPLOYMENT_REVIEW.md |
| No Cloud Armor WAF | Accepted Risk | Pilot is restricted; WAF is RC2 production requirement |
| SIGTERM handler not implemented | Known RC1.1 Constraint | dumb-init + 30s Cloud Run grace period sufficient for pilot |
| Railway MySQL no HA | Accepted Risk | Documented; restart only at shift change |

---

## Pre-Execution Verification Status

| Gate | Status |
|---|---|
| Production build `npm run build:rc1` passes | ✅ VERIFIED (83s build time, 748 kB server bundle) |
| All critical bugs fixed in deployment files | ✅ VERIFIED |
| Dockerfile security controls confirmed | ✅ VERIFIED |
| Secret Manager mapping complete | ✅ VERIFIED |
| Health endpoints operational (`/api/health`, `/api/ready`) | ✅ VERIFIED |
| WebSocket compatibility confirmed | ✅ VERIFIED |
| Rollback procedure documented | ✅ VERIFIED |
| Blue/Green capability confirmed | ✅ VERIFIED |

---

# ══════════════════════════════════════════════════════════════
# FINAL DECISION
# ══════════════════════════════════════════════════════════════

## ✅ READY TO CREATE GOOGLE CLOUD RESOURCES

All critical issues have been identified and resolved.

No blocking issues remain.

The deployment artifacts are production-quality and technically sound for the RC1.1 controlled pilot.

---

## Mandatory Pre-Execution Steps (in order)

Before running `setup-gcp.sh`, the operator MUST complete:

1. ✅ Confirm GCP Project ID is available  
2. ✅ Run `gcloud auth login` and `gcloud auth application-default login`  
3. ✅ Confirm Railway MySQL is live and credentials are available  
4. ✅ Generate JWT secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`  

Then execute:

```bash
# Step 1: Run foundation setup
chmod +x deployment/setup-gcp.sh
./deployment/setup-gcp.sh --project=YOUR_PROJECT_ID

# Step 2: Populate all 7 secrets
echo -n "JWT_VALUE"      | gcloud secrets versions add DWIP_JWT_SECRET          --data-file=-
echo -n "CUST_JWT_VALUE" | gcloud secrets versions add DWIP_CUSTOMER_JWT_SECRET --data-file=-
echo -n "DB_HOST_VALUE"  | gcloud secrets versions add DWIP_DB_HOST             --data-file=-
echo -n "DB_USER_VALUE"  | gcloud secrets versions add DWIP_DB_USER             --data-file=-
echo -n "DB_PASS_VALUE"  | gcloud secrets versions add DWIP_DB_PASSWORD         --data-file=-
echo -n "railway"        | gcloud secrets versions add DWIP_DB_DATABASE         --data-file=-
echo -n "GEMINI_VALUE"   | gcloud secrets versions add DWIP_GEMINI_API_KEY      --data-file=-

# Step 3: Connect GitHub in Cloud Build Console (manual)
# → https://console.cloud.google.com/cloud-build/triggers

# Step 4: Set _CLOUD_RUN_SA substitution in the trigger
# → dwip-cloudrun-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Step 5: Push to main
git add deployment/ .dockerignore
git commit -m "feat(deploy): GCP-002 production-ready deployment configuration"
git push origin main

# Step 6: Monitor build
# → https://console.cloud.google.com/cloud-build/builds
```

---

## Board Sign-Off

| Role | Name | Signature | Date |
|---|---|---|---|
| Cloud Architect | __________ | | 2026-07-15 |
| DevOps Lead | __________ | | 2026-07-15 |
| Security Architect | __________ | | 2026-07-15 |
| Release Manager | __________ | | 2026-07-15 |
