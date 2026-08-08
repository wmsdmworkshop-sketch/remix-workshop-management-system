# DWIP V1 – DISASTER RECOVERY & BACKUP PLAN

**System:** Devanand Workshop Intelligence Platform (DWIP V1)  
**RPO Target (Recovery Point Objective):** `< 5 minutes`  
**RTO Target (Recovery Time Objective):** `< 15 minutes`  

---

## 1. Automated Database Backup Policy

* **Cloud SQL Automated Backups:** Configured daily at `02:00 IST`. Retained for 30 rolling days.
* **Point-In-Time Recovery (PITR):** Binary logging enabled on `dwip-mysql-prod`. Permits transaction-level point-in-time restoration to any millisecond within the past 7 days.
* **On-Demand Snapshots:** Triggered automatically prior to any infrastructure migration or deployment.

---

## 2. Container & Artifact Registry Redundancy

* **Container Image Retention:** Artifact Registry retains image tags for certified revisions (`wms-workshop-app-00072-2vt`, `wms-workshop-app-00073-nkh`).
* **Source Code Backup:** Multi-region Git origin repository (`main` branch & tag `v1.0.0-rc2.1`).
* **Release Artifact Archive:** All release documentation, certification reports, and schemas archived in workspace [releases/v1.0.0-rc2.1/](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/releases/v1.0.0-rc2.1/).

---

## 3. Disaster Scenarios & Recovery Workbooks

### Scenario A: Cloud Run Container Failure / Memory Crash
1. **Action:** Execute traffic diversion to standby revision (`wms-workshop-app-00072-2vt`) via `gcloud run services update-traffic wms-workshop-app --region=asia-south1 --to-revisions=wms-workshop-app-00072-2vt=100`.
2. **RTO:** `< 5 seconds`.

### Scenario B: Cloud SQL Database Outage
1. **Action:** Cloud SQL High Availability (HA) automatically triggers regional failover from `asia-south1-a` to `asia-south1-b`. Server fallback cache (`Fast fallback active`) maintains zero-downtime read access for workshop operators.
2. **RTO:** `< 30 seconds`.
