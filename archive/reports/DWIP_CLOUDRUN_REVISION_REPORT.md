# DWIP V1 – CLOUD RUN REVISION & CONTAINER AUDIT REPORT

**Service Name:** `wms-workshop-app`  
**GCP Project:** `disco-processor-nqtlh` (`473233046183`)  
**Region:** `asia-south1` (Mumbai)  
**Audit Date:** 25/07/2026  

---

## 1. Active Cloud Run Revision Specification

```yaml
Service: wms-workshop-app
Active Revision: wms-workshop-app-00072-2vt
Traffic Allocation: 100%
Revision Status: Ready (Active)
Deployment Timestamp: 2026-07-23T09:28:38.051811Z (14:58:38 IST)
Generation: 72
```

### Container Image Details
* **Container Registry URI:**  
  `asia-south1-docker.pkg.dev/disco-processor-nqtlh/cloud-run-source-deploy/wms-workshop-app`
* **Full Image Digest:**  
  `asia-south1-docker.pkg.dev/disco-processor-nqtlh/cloud-run-source-deploy/wms-workshop-app@sha256:0715d3e2faaec24a6325aab01bcf984055f388fa3bd411d6c3a7e57025c9b89f`
* **Build ID:** `f23c3716-39ca-4989-b3ed-88dad7c82e4e`
* **Build Source Location:** `gs://run-sources-disco-processor-nqtlh-asia-south1/services/wms-workshop-app/1784798631.928068-e3da00fb964d4d4db408664e57e5b686.zip`

---

## 2. Live Environment Variables & Secret Manager Mapping

The live Cloud Run service container is configured with the following production environment variable bindings:

| Environment Variable | Source Type | Secret / Value Reference |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret Manager | `DWIP_JWT_SECRET:latest` |
| `CUSTOMER_JWT_SECRET` | Secret Manager | `DWIP_CUSTOMER_JWT_SECRET:latest` |
| `DB_SOCKET_PATH` | Secret Manager | `DWIP_DB_SOCKET_PATH:latest` |
| `DB_PASSWORD` | Secret Manager | `DWIP_DB_PASSWORD:latest` |
| `DB_DATABASE` | Secret Manager | `DWIP_DB_DATABASE:latest` |
| `DB_USER` | Secret Manager | `DWIP_DB_USER:latest` |
| `GEMINI_API_KEY` | Secret Manager | `DWIP_GEMINI_API_KEY:latest` |
| `UAT_ACCESS_TOKEN` | Direct Value | `dwip-uat-secret-2026` |
| `NODE_ENV` | Direct Value | `production` |

---

## 3. Infrastructure & Instance Settings

| Resource Parameter | Configured Value | Compliance Status |
| :--- | :--- | :--- |
| **CPU Limit** | `1 vCPU` | Adequate |
| **Memory Limit** | `512 MiB` | Adequate |
| **Minimum Instances** | `1` (Min Scale = 1) | Cold-start protection active |
| **Maximum Instances** | `3` (Max Scale = 3) | Operational cost cap active |
| **Concurrency** | `80 requests / instance` | Optimal |
| **Startup CPU Boost** | `Enabled` (`true`) | Fast boot enabled |
| **Cloud SQL Connections** | `disco-processor-nqtlh:asia-south1:dwip-mysql-prod` | Cloud SQL Auth Proxy bound |
| **Service Account** | `473233046183-compute@developer.gserviceaccount.com` | Compute Engine default SA |

---

## 4. Recent Cloud Run Revision History

| Revision Name | Status | Creation Time (UTC) | Image SHA (Truncated) | Traffic |
| :--- | :--- | :--- | :--- | :--- |
| **`wms-workshop-app-00072-2vt`** | **ACTIVE** | **2026-07-23 09:28:12** | `sha256:0715d3e2faa...` | **100%** |
| `wms-workshop-app-00071-6k9` | Inactive | 2026-07-23 09:21:02 | `sha256:4e23c6746f6...` | 0% |
| `wms-workshop-app-00070-t92` | Inactive | 2026-07-23 09:01:30 | `sha256:d6234b37c93...` | 0% |
| `wms-workshop-app-00069-7fk` | Inactive | 2026-07-23 08:54:35 | `sha256:5a874d6399b...` | 0% |
| `wms-workshop-app-00068-5pj` | Inactive | 2026-07-23 07:55:03 | `sha256:bfa8fcc9607...` | 0% |

---

## 5. Revision Audit Conclusion

The running Cloud Run revision `wms-workshop-app-00072-2vt` is healthy, serving 100% of production traffic, and connected to Cloud SQL. It was built and activated on **July 23, 2026 at 14:58 IST**.
