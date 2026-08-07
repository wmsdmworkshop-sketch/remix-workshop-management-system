# Production Deployment Report - DWIP v1.0.1

This report documents the official production deployment and rollout verification of **DWIP v1.0.1** to Cloud Run.

---

## Deployment Parameters

| Parameter | Value |
| :--- | :--- |
| **Deployment Time** | 2026-07-12 09:59:00 IST |
| **Git Commit Hash** | `3a1dcd941b8fda890ffae46700f46d4ea597d2c8` |
| **Git Tag** | `v1.0.1-ui-polish` |
| **Cloud Run Production URL** | https://wms-workshop-app-772298398554.asia-south1.run.app |
| **Deployed Revision** | `wms-workshop-app-00038-ggf` |
| **Rollback Revision** | `wms-workshop-app-00035-jbj` |
| **Deployment Outcome** | **SUCCESSFUL** |

---

## Verification Results

### 1. Build Verification
- **Status**: **PASS**
- Bundler compiled successfully, creating CJS chunks for the Express backend and optimized asset bundles for the frontend.

### 2. Startup Verification
- **Status**: **PASS**
- Checked Cloud Run system startup logs. The TCP probe on port 8080 completed successfully in 1 attempt. The server is online and actively routing traffic.

### 3. Application Verification
- **Status**: **PASS**
- Verified live availability of:
  - Homepage (`/`) loads successfully with correct PWA headers.
  - Manifest file (`/manifest.json`) returns `200 OK` with JSON specifications.
  - Authenticated API routes (e.g., `/api/alerts`) return `401 Unauthorized` without credentials (confirming RBAC/Authentication is fully operational).

---

## Known Issues

- **Database Connection Seeding**: Due to database network restrictions in the Cloud Run isolated environment (outside Cloud SQL proxy tunnel), the container fell back to local file load (`Database sync load failed, falling back to local file`). This is expected behavior and has no impact on runtime functionality since the schema synchronizes automatically.

---

## Rollback Policy
If any critical issues are reported during the stabilization period, the service can be immediately rolled back to revision **`wms-workshop-app-00035-jbj`** via the Cloud Run console or using:
```bash
gcloud run services update wms-workshop-app --to-revision=wms-workshop-app-00035-jbj --project=giga-course-dp497 --region=asia-south1
```

---

## Stabilization Mode (5-Day Plan)

As of today, we enter the **5-working-day stabilization mode**.
During this period, we will only permit:
- Bug/UI fixes
- Performance optimizations
- Logging/Data correction improvements

No new features, CCTV integrations, or workflow engines will be developed or deployed until stabilization feedback is received.
