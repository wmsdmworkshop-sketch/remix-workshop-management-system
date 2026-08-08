# DWIP V1 – PRODUCTION DEPLOYMENT & BUILD METADATA AUDIT REPORT

**Target Environment:** Production (`Google Cloud Run`)  
**Production URL:** `https://wms-workshop-app-473233046183.asia-south1.run.app`  
**Audit Date:** 25/07/2026  
**Auditor:** Antigravity AI Coding Assistant  

---

## 1. Executive Summary

A comprehensive production deployment audit of the **DWIP V1 Enterprise Platform** deployed on Google Cloud Run (`wms-workshop-app`, `asia-south1`) was conducted to investigate why the production login screen footer displays:
- **Version:** `1.0.0 GA`
- **Commit:** `unknown`
- **Built:** `23/07/2026 14:56:42`

### Key Audit Findings
1. **Cloud Run Active Revision:** The production service is running Revision **`wms-workshop-app-00072-2vt`**, deployed on **`23/07/2026 14:58:38 IST`** (`2026-07-23T09:28:38Z`), serving **100% of live traffic**.
2. **Root Cause for `Commit: unknown`:** Both `.dockerignore` (Line 69) and `.gcloudignore` (Line 2) explicitly exclude `.git/`. During GCP Cloud Build (`gcloud run deploy --source .`), the source zip (`gs://run-sources-disco-processor-nqtlh-asia-south1/...`) sent to the build worker excludes the `.git` directory. When Vite bundles the React app, `execSync('git rev-parse HEAD')` inside `vite.config.ts` fails, throwing an exception handled by `catch (e)` which returns `'unknown'`.
3. **Build Timestamp Behavior:** The timestamp `23/07/2026 14:56:42` represents the exact **Vite bundle compile time** inside the Cloud Build worker during the build of Revision `00072-2vt` (1.5 minutes before Cloud Run revision activation).
4. **Codebase Version Sync:** The production container is running the code frozen on **July 23, 2026**. Subsequent local updates and offline resilience patches made on **July 24–25, 2026** are present in local source but have not yet been built into a new Cloud Run revision.

---

## 2. Environment & Pipeline Verification Summary

| Component | Target / Value | Audit Status |
| :--- | :--- | :--- |
| **GCP Project ID** | `disco-processor-nqtlh` (`473233046183`) | Verified |
| **GCP Region** | `asia-south1` (Mumbai) | Verified |
| **Cloud Run Service** | `wms-workshop-app` | Verified |
| **Active Revision** | `wms-workshop-app-00072-2vt` | Verified (100% Traffic) |
| **Artifact Container Image** | `asia-south1-docker.pkg.dev/disco-processor-nqtlh/cloud-run-source-deploy/wms-workshop-app@sha256:0715d3e2faaec24a6325aab01bcf984055f388fa3bd411d6c3a7e57025c9b89f` | Verified Digest |
| **Build ID** | `f23c3716-39ca-4989-b3ed-88dad7c82e4e` | Verified |
| **Production Login URL** | `https://wms-workshop-app-473233046183.asia-south1.run.app` | Verified Operational |

---

## 3. Step-by-Step Compliance Summary

* **Step 1 (Source & Script Inspection):** Inspected `package.json`, `Dockerfile`, `vite.config.ts`, `.dockerignore`, `.gcloudignore`, and `deployment/cloudbuild.yaml`.
* **Step 2 (Metadata Origin):** Traced `Version`, `Commit`, and `Built` values directly to `src/components/AuthScreen.tsx` and `vite.config.ts`.
* **Step 3 (Cloud Run Inspection):** Extracted live JSON metadata for Cloud Run service `wms-workshop-app` via `gcloud CLI`.
* **Step 4 (Pipeline Comparison):** Mapped Local Source → Git Commit → Docker Image → Artifact Registry → Cloud Run Revision → Production UI.
* **Step 5 (Metadata Generation Audit):** Identified hardcoded strings and dynamic fallback definitions.
* **Step 6 (Git Integration Audit):** Proven that exclusion of `.git` in `.gcloudignore` / `.dockerignore` causes `git rev-parse HEAD` failure.
* **Step 7 (Timestamp Audit):** Confirmed build timestamp is compile-time injected by Vite.
* **Step 8 (Artifact Generation):** Authored all 5 mandated audit documents.
* **Step 9 (Root Cause & Fix Blueprint):** Formulated safe deployment commands, risk analysis, and rollback procedures.
* **Step 10 (Governance):** Implemented strict freeze protocol; recommended user confirmation before deployment.
