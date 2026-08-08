# DWIP V1 RC2.1 – EMERGENCY ROLLBACK PROTOCOL

**Service Name:** `wms-workshop-app`  
**Current Active Revision:** `wms-workshop-app-00073-nkh` (100% Traffic)  
**Fallback Standby Revision:** `wms-workshop-app-00072-2vt` (Retained in Cloud Run)  

---

## 1. Rollback Execution Procedure

If any runtime anomaly or infrastructure failure is observed on Revision `00073-nkh`, execute immediate single-command rollback:

```bash
gcloud run services update-traffic wms-workshop-app \
  --region asia-south1 \
  --to-revisions wms-workshop-app-00072-2vt=100
```

### Rollback Characteristics
* **Execution Latency:** `< 5 seconds`
* **Downtime:** `Zero Downtime`
* **Database Impact:** `Zero Impact` (Cloud SQL schema is identical across both revisions)

---

## 2. Standby Revision Health Check

Revision `wms-workshop-app-00072-2vt` remains registered, ready, and retained in Artifact Registry (`sha256:0715d3e2faaec24a6...`), providing an instant fallback target if required.
