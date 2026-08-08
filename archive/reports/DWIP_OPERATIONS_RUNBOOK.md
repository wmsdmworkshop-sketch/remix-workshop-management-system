# DWIP V1 – PRODUCTION OPERATIONS RUNBOOK

**Target Service:** `wms-workshop-app` (Google Cloud Run, `asia-south1`)  
**Production URL:** `https://wms-workshop-app-473233046183.asia-south1.run.app`  

---

## 1. Routine Health Check Procedure

Run the automated health check script or execute curl command:

```bash
# 1. Version Endpoint Check
curl -s https://wms-workshop-app-473233046183.asia-south1.run.app/api/version

# 2. Operational Health Check
curl -s https://wms-workshop-app-473233046183.asia-south1.run.app/api/health
```

---

## 2. Log Collection & Troubleshooting Command Reference

```bash
# Query recent logs for active revision
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=wms-workshop-app AND resource.labels.revision_name=wms-workshop-app-00073-nkh" --project=disco-processor-nqtlh --limit=50

# Query HTTP 5xx errors across service
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=wms-workshop-app AND httpRequest.status>=500" --project=disco-processor-nqtlh --limit=20
```

---

## 3. Hotfix Release & Deployment Workflow

1. **Checkout Hotfix Branch:** `git checkout -b hotfix/v1.0.1-description v1.0.0-rc2.1`
2. **Apply Minimal Fix:** Apply code fix without modifying database schema or API signatures.
3. **Build & Deploy Candidate Revision:**
   ```bash
   gcloud run deploy wms-workshop-app \
     --source . \
     --region asia-south1 \
     --project disco-processor-nqtlh \
     --no-traffic \
     --set-env-vars VITE_GIT_COMMIT=$(git rev-parse HEAD) \
     --quiet
   ```
4. **Smoke Test Revision URL:** Test against candidate revision URL (`0%` public traffic).
5. **Promote Traffic:**
   ```bash
   gcloud run services update-traffic wms-workshop-app \
     --region asia-south1 \
     --to-revisions=<NEW_REVISION_NAME>=100
   ```

---

## 4. Emergency Traffic Rollback Procedure

If any critical issue occurs, execute single-command rollback to certified standby revision `wms-workshop-app-00072-2vt` or `00073-nkh`:

```bash
gcloud run services update-traffic wms-workshop-app \
  --region asia-south1 \
  --to-revisions=wms-workshop-app-00072-2vt=100
```
