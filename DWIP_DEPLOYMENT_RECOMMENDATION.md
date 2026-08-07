# DWIP V1 – PRODUCTION DEPLOYMENT RECOMMENDATION & ACTION PLAN

**Status:** Recommendation & Governance Plan  
**Target URL:** `https://wms-workshop-app-473233046183.asia-south1.run.app`  
**Date:** 25/07/2026  

---

## 1. Governance Directive

> [!IMPORTANT]  
> **DO NOT REDEPLOY IMMEDIATELY.**  
> In accordance with DWIP Production Governance directives, no automated redeployment should occur without explicit user review and approval of the deployment plan and metadata fix blueprint below.

---

## 2. Root Cause & Solution Blueprint

### Root Cause Summary
1. `Commit: unknown` occurs because `.gcloudignore` and `.dockerignore` exclude `.git/`, preventing `execSync('git rev-parse HEAD')` inside `vite.config.ts` during Cloud Build container compilation.
2. `Built: 23/07/2026` reflects the exact build timestamp of Revision `wms-workshop-app-00072-2vt` deployed on July 23, 2026.

### Fix Blueprint for Build Metadata
Update `vite.config.ts` to accept an environment variable `VITE_GIT_COMMIT` passed directly during Cloud Build:

```ts
const commitHash = process.env.VITE_GIT_COMMIT || process.env.COMMIT_SHA || (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
})();
```

---

## 3. Recommended Deployment Commands

When approved for deployment, execute the following commands from the project root:

```bash
# 1. Capture current Git commit hash
COMMIT_HASH=$(git rev-parse HEAD)

# 2. Deploy source to Cloud Run with environment variable injection
gcloud run deploy wms-workshop-app \
  --source . \
  --region asia-south1 \
  --project disco-processor-nqtlh \
  --set-env-vars VITE_GIT_COMMIT=${COMMIT_HASH} \
  --quiet
```

---

## 4. Risk Assessment & Mitigations

| Risk | Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Service Interruption** | **Zero** | Cloud Run performs zero-downtime rolling updates; traffic shifts only after health probes pass. |
| **Cloud SQL Disruption** | **Zero** | Database schema and Cloud SQL connections remain frozen and untouched. |
| **Metadata Inconsistency** | **Low** | Environment variable injection ensures exact commit hash rendering in UI footer. |

---

## 5. Rollback Plan

If any issue arises during or after deployment:

1. Instantly revert traffic back to certified Revision `wms-workshop-app-00072-2vt`:
   ```bash
   gcloud run services update-traffic wms-workshop-app \
     --region asia-south1 \
     --to-revisions wms-workshop-app-00072-2vt=100
   ```
2. Verify production status:
   ```bash
   gcloud run services describe wms-workshop-app --region asia-south1
   ```

---

## 6. Pre-Deployment Verification Checklist

- [x] Cloud Run service `wms-workshop-app` described and active revision confirmed (`00072-2vt`).
- [x] Artifact Registry image digest verified (`sha256:0715d3e2faaec24a...`).
- [x] Root causes for `Commit: unknown` and `Built: 23/07/2026` identified line-by-line.
- [x] All 5 audit artifact reports generated and persisted.
- [ ] User review and approval received prior to triggering `gcloud run deploy`.
