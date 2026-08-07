# DWIP Enterprise ERP — GCP Resource Plan

## Resource Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GCP Project: dwip-pilot-XXXXXX              │
│                     Region: asia-south1 (Mumbai)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   GitHub Repo (wmsdmworkshop-sketch)                             │
│         │ push to main                                            │
│         ▼                                                         │
│   Cloud Build (dwip-deploy-pilot trigger)                        │
│     ├─ Lint → Build → Push → Deploy → Smoke Test                │
│         │                                                         │
│         ▼                                                         │
│   Artifact Registry (dwip-images)                                │
│     └─ dwip:latest, dwip:{SHORT_SHA}                             │
│         │                                                         │
│         ▼                                                         │
│   Cloud Run: dwip-pilot          Cloud Run: dwip-prod            │
│     ├─ min-instances: 1            ├─ min-instances: 2           │
│     ├─ max-instances: 3            ├─ max-instances: 10          │
│     ├─ memory: 512Mi               ├─ memory: 1Gi                │
│     ├─ cpu: 1                      ├─ cpu: 2                     │
│     └─ port: 3001                  └─ port: 3001                 │
│         │                                                         │
│         ▼                                                         │
│   Secret Manager (7 secrets)                                     │
│     ├─ DWIP_JWT_SECRET                                           │
│     ├─ DWIP_CUSTOMER_JWT_SECRET                                  │
│     ├─ DWIP_DB_HOST                                              │
│     ├─ DWIP_DB_USER                                              │
│     ├─ DWIP_DB_PASSWORD                                          │
│     ├─ DWIP_DB_DATABASE                                          │
│     └─ DWIP_GEMINI_API_KEY                                       │
│         │                                                         │
│         ▼ (external, not in GCP)                                 │
│   Railway MySQL (Pilot Database)                                 │
│     └─ Database: railway                                          │
│                                                                   │
│   Cloud Logging (structured logs from Cloud Run)                 │
│   Cloud Monitoring (uptime checks, dashboards, alerts)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## GCP Resources Required

| Resource | Name | Configuration | Purpose |
|---|---|---|---|
| Cloud Run Service | `dwip-pilot` | 512Mi / 1 CPU / 1-3 instances | Controlled pilot |
| Cloud Run Service | `dwip-prod` | 1Gi / 2 CPU / 2-10 instances | Full production |
| Artifact Registry Repo | `dwip-images` | Docker / asia-south1 | Container image store |
| Cloud Build Trigger | `dwip-deploy-pilot` | GitHub main → cloudbuild.yaml | CI/CD pipeline |
| Secret Manager | `DWIP_*` (7 secrets) | Automatic replication | Credential store |
| Service Account | `dwip-cloudrun-sa` | secretAccessor, cloudsql.client | Runtime identity |
| Cloud Logging | Default | Auto-enabled with Cloud Run | Structured log storage |
| Cloud Monitoring | Uptime Check | `/api/health` every 60s | Availability alerts |

---

## RC2 Resources (NOT in scope for RC1.1 pilot)

| Resource | Purpose |
|---|---|
| Cloud SQL for MySQL (2nd Gen) | Replace Railway MySQL |
| Cloud Storage bucket | Asset/report/document storage |
| Serverless VPC Connector | Private Cloud SQL connectivity |
| Cloud CDN | Frontend SPA acceleration |
| Cloud Armor | WAF and DDoS protection |
| Firebase Auth | Social login for customer portal |

---

## Cost Estimate

> **Disclaimer:** All estimates are based on GCP published pricing (asia-south1, INR at ₹83 = $1 USD, July 2026).
> Actual costs will vary based on traffic patterns.

### Scenario 1 — Controlled Pilot (4 Workshops, Day Shift Only)

| Resource | Config | Monthly Cost (USD) | Monthly Cost (INR) |
|---|---|---|---|
| Cloud Run — dwip-pilot | 1 min instance, 512Mi, ~500 req/day | ~$5 | ~₹415 |
| Artifact Registry | ~2 GB stored | ~$0.20 | ~₹17 |
| Cloud Build | ~30 builds × 10 min | ~$1.50 | ~₹125 |
| Secret Manager | 7 secrets, ~30 access/day | ~$0.05 | ~₹4 |
| Cloud Logging | Pilot volume < 1 GB/month | Free tier | ₹0 |
| Cloud Monitoring | 1 uptime check | Free tier | ₹0 |
| **TOTAL — PILOT** | | **~$7 / month** | **~₹580 / month** |

---

### Scenario 2 — Production (10 Workshops, Full Day Operation)

| Resource | Config | Monthly Cost (USD) | Monthly Cost (INR) |
|---|---|---|---|
| Cloud Run — dwip-prod | 2 min instances, 1Gi, ~5,000 req/day | ~$40 | ~₹3,320 |
| Artifact Registry | ~5 GB stored | ~$0.50 | ~₹42 |
| Cloud Build | ~60 builds × 10 min | ~$3 | ~₹249 |
| Secret Manager | 7 secrets, ~500 access/day | ~$0.10 | ~₹8 |
| Cloud Logging | ~5 GB/month | ~$2.50 | ~₹208 |
| Cloud Monitoring | 3 uptime checks, alerts | ~$2 | ~₹166 |
| **TOTAL — PRODUCTION** | | **~$48 / month** | **~₹3,984 / month** |

---

### Scenario 3 — High Scale (50 Workshops, Multi-Region)

| Resource | Config | Monthly Cost (USD) | Monthly Cost (INR) |
|---|---|---|---|
| Cloud Run — dwip-prod | 5 min instances, 2Gi, ~50,000 req/day | ~$200 | ~₹16,600 |
| Cloud SQL for MySQL | db-n1-standard-2, HA, 100 GB | ~$150 | ~₹12,450 |
| Artifact Registry | ~10 GB stored | ~$1 | ~₹83 |
| Cloud Build | ~120 builds × 10 min | ~$6 | ~₹498 |
| Cloud CDN | ~50 GB/month egress | ~$5 | ~₹415 |
| Secret Manager | 15 secrets, ~5,000 access/day | ~$0.30 | ~₹25 |
| Cloud Logging | ~50 GB/month | ~$25 | ~₹2,075 |
| Cloud Monitoring | Full dashboard + alerts | ~$10 | ~₹830 |
| **TOTAL — HIGH SCALE** | | **~$397 / month** | **~₹32,951 / month** |

---

## Cost Optimization Recommendations

1. **Cloud Run minimum instances**: Keep at 1 for pilot (avoids cold starts, small cost)
2. **Artifact Registry cleanup**: Set a lifecycle policy to delete images older than 30 days
3. **Log retention**: Set log retention to 30 days for pilot, 90 days for production
4. **Free tier**: Cloud Logging (first 50 GB/month), Cloud Monitoring basic checks are FREE
5. **Committed Use**: After 6 months in production, consider 1-year committed use for ~25% discount
