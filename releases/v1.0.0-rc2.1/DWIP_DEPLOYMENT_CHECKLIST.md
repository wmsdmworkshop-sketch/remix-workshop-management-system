# DWIP V1 – PRODUCTION DEPLOYMENT EXECUTION CHECKLIST

**Target Environment:** Production (`Google Cloud Run`)  
**Service Name:** `wms-workshop-app`  
**GCP Region:** `asia-south1`  
**Deployment Strategy:** Zero-Downtime Rolling Revision Update  

---

## 1. Pre-Deployment Phase (Verification & Minor Fix)

- [x] Verify Cloud Run current active revision (`wms-workshop-app-00072-2vt`).
- [x] Confirm Cloud SQL database state is active and schema is frozen.
- [ ] Update [vite.config.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/vite.config.ts) to support `process.env.VITE_GIT_COMMIT`:
  ```ts
  const commitHash = process.env.VITE_GIT_COMMIT || process.env.COMMIT_SHA || (() => {
    try {
      return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
      return 'unknown';
    }
  })();
  ```
- [ ] Receive explicit user authorization to execute deployment.

---

## 2. Deployment Execution Sequence

Execute the following commands in sequence from the project root:

### Step 2.1: Capture Git Commit Hash
```bash
COMMIT_HASH=$(git rev-parse HEAD)
echo "Deploying Git Commit: $COMMIT_HASH"
```

### Step 2.2: Execute Cloud Run Deployment
```bash
gcloud run deploy wms-workshop-app \
  --source . \
  --region asia-south1 \
  --project disco-processor-nqtlh \
  --set-env-vars VITE_GIT_COMMIT=${COMMIT_HASH} \
  --quiet
```

---

## 3. Post-Deployment Verification Sequence

- [ ] Check Cloud Run service status:
  ```bash
  gcloud run services describe wms-workshop-app --region asia-south1 --format="value(status.latestReadyRevisionName)"
  ```
- [ ] Verify production login screen UI footer at `https://wms-workshop-app-473233046183.asia-south1.run.app`:
  - Verify **Version:** `1.0.0 GA`
  - Verify **Commit:** Displays truncated commit hash (e.g., `3a1dcd9`) instead of `unknown`.
  - Verify **Built:** Displays latest deployment timestamp.
- [ ] Verify Vehicle Passport lookup for `KA32AC0835` in production browser DOM.

---

## 4. Emergency Rollback Protocol

If any anomaly or failure is detected post-deployment, execute instant rollback to Revision `00072-2vt`:

```bash
gcloud run services update-traffic wms-workshop-app \
  --region asia-south1 \
  --to-revisions wms-workshop-app-00072-2vt=100
```
*Rollback execution time: < 5 seconds.*
