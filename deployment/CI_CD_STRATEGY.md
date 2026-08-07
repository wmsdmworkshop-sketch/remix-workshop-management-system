# DWIP Enterprise ERP — CI/CD Strategy

**Review:** GCP-002  
**Version:** RC1.1

---

## Pipeline Overview

```
Developer pushes code
        │
        ▼
GitHub (main branch)
        │  webhook
        ▼
Cloud Build Trigger: dwip-deploy-pilot
  ├─ [1] Lint        (tsc --noEmit)          → FAIL FAST
  ├─ [2] Build       (Docker multi-stage)    → SHA-tagged image
  ├─ [3] Push        (Artifact Registry)     → :SHA + :latest
  ├─ [4] Deploy      (gcloud run deploy)     → dwip-pilot ← auto
  └─ [5] Smoke Test  (curl /api/health)      → HTTP 200 gate

        Manual approval
        │
        ▼
gcloud run deploy dwip-prod (MANUAL ONLY)
  └─ Uses same SHA image from pilot validation
```

---

## Branching & Trigger Strategy

| Branch | Trigger | Action | Environment |
|---|---|---|---|
| `main` | Automatic (push) | Build → Push → Deploy → Smoke test | `dwip-pilot` |
| `main` | Manual `gcloud` | Deploy same validated image | `dwip-prod` |
| Any PR | ❌ No trigger | — | — |
| `hotfix/*` | Manual trigger | Emergency — push + deploy to pilot | `dwip-pilot` |

> **RC1.1 Rule:** Only `main` triggers deployment. No feature branches are deployed automatically.

---

## Version Strategy

### Image Tagging

Every build produces exactly two tags:

```
asia-south1-docker.pkg.dev/PROJECT/dwip-images/dwip:abc1234  ← immutable SHA tag
asia-south1-docker.pkg.dev/PROJECT/dwip-images/dwip:latest   ← mutable, used for cache-from
```

The **SHA tag** is what is deployed to Cloud Run. `latest` is only used for Docker layer cache.

### Revision Strategy

Cloud Run automatically creates a new revision on every deploy. Revisions are named:
```
dwip-pilot-00001-abc  ← first deploy
dwip-pilot-00002-def  ← second deploy
dwip-pilot-00003-ghi  ← third deploy (current)
```

Cloud Run retains the last 1000 revisions. Traffic is always routed to the `LATEST_READY_REVISION` unless manually overridden.

---

## Rollback Strategy

### Immediate Rollback (seconds)

```bash
# Route 100% to a known good revision
gcloud run services update-traffic dwip-pilot \
  --to-revisions=dwip-pilot-00002-def=100 \
  --region=asia-south1 \
  --project=PROJECT_ID
```

No redeployment required. Traffic switch is near-instantaneous.

### Image Rollback (< 2 minutes)

```bash
# Redeploy from a previous SHA if revision config is lost
gcloud run deploy dwip-pilot \
  --image=asia-south1-docker.pkg.dev/PROJECT/dwip-images/dwip:PREVIOUS_SHA \
  --region=asia-south1 \
  --project=PROJECT_ID
```

---

## Blue/Green Deployment (Available Now)

Cloud Run supports this natively via `--no-traffic` and traffic splits:

```bash
# Phase 1: Deploy new version with no traffic
gcloud run deploy dwip-pilot \
  --image=...dwip:NEW_SHA \
  --no-traffic \
  --tag=green

# Phase 2: Test green directly (no user impact)
curl https://green---dwip-pilot-HASH.run.app/api/health

# Phase 3: Canary — 10% to green
gcloud run services update-traffic dwip-pilot \
  --to-revisions=green=10,REVISION_CURRENT=90

# Phase 4: Full cutover
gcloud run services update-traffic dwip-pilot \
  --to-revisions=green=100
```

---

## Artifact Registry Lifecycle Policy

Retain only the last 10 images. Images older than 30 days are deleted.

```bash
# Set cleanup policy on Artifact Registry
gcloud artifacts repositories set-cleanup-policies dwip-images \
  --location=asia-south1 \
  --project=PROJECT_ID \
  --policy='{
    "name": "delete-old-images",
    "action": {"type": "Delete"},
    "condition": {"olderThan": "30d", "tagState": "untagged"}
  }'
```

---

## CI/CD Improvement Roadmap

| Phase | Improvement | Sprint |
|---|---|---|
| RC2 | Add `npm audit --audit-level=high` as lint step | GCP-003 |
| RC2 | Add integration test step (health + login API) | GCP-003 |
| RC2 | Workload Identity Federation for GitHub Actions | GCP-004 |
| RC2 | Parallel lint + security scan | GCP-003 |
| RC2 | Automated production promotion after 7-day pilot stability | GCP-005 |
| RC3 | Multi-region deployment (asia-south1 + asia-east1) | Future |

---

## Build Time Benchmarks

| Step | Duration | Notes |
|---|---|---|
| Lint (`tsc --noEmit`) | ~15s | No type errors in RC1.1 |
| Docker build (cold) | ~180s | npm ci + vite + esbuild |
| Docker build (warm cache) | ~60s | Layer cache hit on node_modules |
| Push to Artifact Registry | ~30s | 240 MB compressed |
| Cloud Run deploy | ~45s | Rolling update |
| Smoke test | ~10–50s | Depends on instance warmup |
| **Total (cold)** | **~320s (5.3 min)** | |
| **Total (warm)** | **~200s (3.3 min)** | |
