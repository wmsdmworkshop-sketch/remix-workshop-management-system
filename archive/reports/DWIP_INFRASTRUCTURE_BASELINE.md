# DWIP V1 – INFRASTRUCTURE BASELINE SPECIFICATION

**Service Name:** `wms-workshop-app`  
**GCP Project:** `disco-processor-nqtlh` (`473233046183`)  
**Region:** `asia-south1` (Mumbai)  

---

## 1. Google Cloud Run Configuration

```yaml
Service Name: wms-workshop-app
Active Revision: wms-workshop-app-00073-nkh
Concurrency: 80 requests / instance
Min Instances: 1 (Warm Standby)
Max Instances: 3 (Autoscaling Ceiling)
CPU Allocation: 1 CPU (Startup CPU Boost Enabled)
Memory Limit: 512 MiB
Timeout: 120 seconds
Container Port: 3001
Service Account: 473233046183-compute@developer.gserviceaccount.com
Ingress Policy: All (Public HTTPS via Google Frontend)
```

---

## 2. Google Cloud SQL Database Instance

```yaml
Instance Name: dwip-mysql-prod
Connection Name: disco-processor-nqtlh:asia-south1:dwip-mysql-prod
Database Engine: MySQL 8.0.35
Tier: db-custom-2-7680 (2 vCPU, 7.5 GB RAM)
Storage: 50 GB SSD (Autoresize Enabled)
High Availability: Enabled (Regional Failover)
Connection Type: Cloud SQL Unix Socket / Proxy
Database Name: remix_wms
```

---

## 3. Secret Manager & Environment Variables

| Variable Name | Source | Secret Name in GCP | Purpose |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Secret Manager | `DWIP_JWT_SECRET` | JWT Token Signature Key |
| `CUSTOMER_JWT_SECRET` | Secret Manager | `DWIP_CUSTOMER_JWT_SECRET` | Customer Portal JWT Key |
| `DB_PASSWORD` | Secret Manager | `DWIP_DB_PASSWORD` | Production MySQL Database Password |
| `DB_USER` | Secret Manager | `DWIP_DB_USER` | MySQL Username |
| `DB_DATABASE` | Secret Manager | `DWIP_DB_DATABASE` | Target Database Name (`remix_wms`) |
| `DB_SOCKET_PATH` | Secret Manager | `DWIP_DB_SOCKET_PATH` | Cloud SQL Socket (`/cloudsql/...`) |
| `GEMINI_API_KEY` | Secret Manager | `DWIP_GEMINI_API_KEY` | Gemini AI Assistant Key |
| `VITE_GIT_COMMIT` | Environment Var | Direct Injected | Git Commit Hash (`3a1dcd9...`) |

---

## 4. Cloud Monitoring & Alerting

* **Dashboard ID:** `6e924290-98c5-4340-9d24-d43fd6d8a0e6`
* **Configuration:** [monitoring/cloudrun-dashboard.json](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/monitoring/cloudrun-dashboard.json)
* **Tracked Metrics:** HTTP 5xx Error Rate, P50/P95/P99 Request Latencies, Container CPU & Memory Utilization, Cloud SQL Connections, Container Restarts.
