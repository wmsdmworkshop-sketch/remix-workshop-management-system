# DWIP V1 RC2.1 – DEPLOYMENT VERIFICATION REPORT

**Release Version:** DWIP V1 RC2.1  
**Target Environment:** Production (`Google Cloud Run`)  
**Production URL:** `https://wms-workshop-app-473233046183.asia-south1.run.app`  
**GCP Project:** `disco-processor-nqtlh` (`473233046183`)  
**GCP Region:** `asia-south1` (Mumbai)  
**Deployment Date:** 25/07/2026  

---

## 1. Revision & Container Image Specifications

```yaml
Service Name: wms-workshop-app
Promoted Revision: wms-workshop-app-00073-nkh
Traffic Allocation: 100% (Fully Promoted)
Revision Status: Ready (Active)
Deployment Timestamp: 2026-07-25T11:53:12.975833Z (17:23:12 IST)
Generation: 73
Canary Tag URL: https://rc2-1---wms-workshop-app-6n6wh6gjfa-el.a.run.app
```

### Container Artifact Registry Details
* **Container Image URI:**  
  `asia-south1-docker.pkg.dev/disco-processor-nqtlh/cloud-run-source-deploy/wms-workshop-app`
* **Container SHA Digest:**  
  `asia-south1-docker.pkg.dev/disco-processor-nqtlh/cloud-run-source-deploy/wms-workshop-app@sha256:80b727ad3e1244d1311ef54fb7bb634bced5e00a1414fd57af8af6b1c9551a0a`
* **Injected Git Commit Hash:** `3a1dcd941b8fda890ffae46700f46d4ea597d2c8` (Short: `3a1dcd9`)
* **Injected Build Timestamp:** `2026-07-25T11:45:00.000Z`

---

## 2. Injected Build Metadata Verification

The live production UI footer rendered at `https://wms-workshop-app-473233046183.asia-south1.run.app` was verified in the browser DOM:

| Metadata Field | Injected Value | Verified UI Footer Rendering | Status |
| :--- | :--- | :--- | :--- |
| **Release Version** | `1.0.0 GA` | `Version 1.0.0 GA • Production Release` | **VERIFIED** |
| **Git Commit Hash** | `3a1dcd9` | `Commit: 3a1dcd9` | **VERIFIED** (Resolved `unknown`) |
| **Build Timestamp** | `2026-07-25T11:45:00Z` | `Built: 7/25/2026, 5:15:00 PM` | **VERIFIED** |
| **Environment** | `production` | `Production Release` | **VERIFIED** |

---

## 3. Canary & Traffic Promotion Phasing Log

```
[Phase 1: Revision Build]  ──► Revision wms-workshop-app-00073-nkh created (0% traffic)
                                      │
[Phase 2: Canary Isolation] ──► Canary Tag rc2-1 attached (0% external public traffic)
                                      │
[Phase 3: Revision Verification] ► Direct revision smoke tests executed (100% PASS)
                                      │
[Phase 4: 10% Canary Split] ──► Traffic split: 90% (00072-2vt) / 10% (00073-nkh) (10/10 PASS)
                                      │
[Phase 5: 100% Promotion]   ──► Traffic promoted: 100% (wms-workshop-app-00073-nkh)
```
