# Deploy runbook — `dwip-enterprise` (production)

**Service:** `dwip-enterprise` · **Region:** `asia-south1` · **Project:** `giga-course-dp497`
**Domain:** https://devanand.aivaahan.com · **Direct:** https://dwip-enterprise-npoyvb3q7a-el.a.run.app

This service is live and customer-facing. Deploys are a **human gate** — do not
automate. Follow the pre-flight gates before running the pipeline.

---

## Live baseline (as of last check, revision `dwip-enterprise-00056-9tj`)

| Setting        | Value                                                              |
|----------------|-------------------------------------------------------------------|
| Image repo     | `asia-south1-docker.pkg.dev/giga-course-dp497/cloud-run-source-deploy/dwip-enterprise` |
| Port           | `3001` (containerPort)                                             |
| Resources      | 1 CPU / 512Mi                                                      |
| Concurrency    | 80 · maxScale 3 · startup-cpu-boost on · timeout 300s             |
| Service acct   | `772298398554-compute@developer.gserviceaccount.com`              |
| Env vars       | `DB_HOST DB_PORT DB_USER DB_PASSWORD DB_DATABASE JWT_SECRET CUSTOMER_JWT_SECRET NODE_ENV ADDITIONAL_CORS_ORIGINS` |
| Cloud SQL      | `wms-mysql-db` over **public IP**, creds as plaintext env vars (no connector) |

The pipeline preserves all of the above — it only swaps the container image.

---

## Pre-flight gates (all must pass)

1. **Tests green.** Run the real suite against the test DB and confirm it passes.
   The recent test-infra fixes were made while Docker was down and are unverified:
   ```
   docker compose up -d        # test MySQL on 127.0.0.1:3307
   npm run db:setup:test
   npm run test
   ```
2. **Right branch, clean-ish tree.** You are on `release/v1.1.0`. Commit or stash
   the intended changes; the untracked scratch files (`db_schema.txt`,
   `describe_tables.cjs`, `bucket_iam_backup.json`, `dev/`, …) are excluded from
   the build by `.gcloudignore` / `.dockerignore` but should not be committed.
3. **Correct gcloud identity.**
   ```
   gcloud config set project giga-course-dp497
   gcloud auth list   # active account must be wmsdmworkshop@gmail.com
   ```
4. **Cloud Build SA has deploy rights** (one-time; needed because the live service
   was previously deployed from a laptop, not Cloud Build):
   ```
   PROJECT=giga-course-dp497
   NUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
   gcloud projects add-iam-policy-binding $PROJECT \
     --member="serviceAccount:${NUM}@cloudbuild.gserviceaccount.com" \
     --role="roles/run.admin"
   gcloud iam service-accounts add-iam-policy-binding \
     ${NUM}-compute@developer.gserviceaccount.com --project $PROJECT \
     --member="serviceAccount:${NUM}@cloudbuild.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   # Artifact Registry writer is usually already present for the build SA.
   ```

---

## Deploy

```
gcloud builds submit --config deployment/cloudbuild.yaml \
  --substitutions=_TAG=$(git rev-parse --short HEAD) \
  --project giga-course-dp497
```

The pipeline builds with `deployment/Dockerfile` (port 3001), pushes the image
tagged with the git short SHA, and deploys image-only to `dwip-enterprise`.

**Alternative (local Docker, when the daemon is running):**
```
TAG=$(git rev-parse --short HEAD)
IMG=asia-south1-docker.pkg.dev/giga-course-dp497/cloud-run-source-deploy/dwip-enterprise:$TAG
gcloud auth configure-docker asia-south1-docker.pkg.dev
docker build -f deployment/Dockerfile -t $IMG .
docker push $IMG
gcloud run deploy dwip-enterprise --image $IMG \
  --region asia-south1 --project giga-course-dp497
```

---

## Verify

```
# New revision is Ready and serving 100%
gcloud run services describe dwip-enterprise --region asia-south1 \
  --project giga-course-dp497 \
  --format="value(status.latestReadyRevisionName, status.traffic[0].revisionName)"

# Health endpoint
curl -fsS https://dwip-enterprise-npoyvb3q7a-el.a.run.app/api/health
# expect: {"status":"UP"}   (Dockerfile HEALTHCHECK hits /api/health)
```

Then smoke-test login on https://devanand.aivaahan.com.

---

## Rollback

Traffic-shift back to the known-good revision (instant, no rebuild):
```
gcloud run services update-traffic dwip-enterprise --region asia-south1 \
  --project giga-course-dp497 \
  --to-revisions dwip-enterprise-00056-9tj=100
```
