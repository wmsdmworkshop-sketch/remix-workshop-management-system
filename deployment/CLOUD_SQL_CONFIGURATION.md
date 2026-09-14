# DWIP Enterprise ERP — Cloud SQL Configuration

> [!NOTE]
> **Live database:** Cloud SQL instance **`wms-mysql-db`**, reached over **public IP** with the
> credentials supplied as plaintext Cloud Run env vars (`DB_HOST`, `DB_PORT`, `DB_USER`,
> `DB_PASSWORD`, `DB_DATABASE`) — no Cloud SQL connector or Unix socket is in use.
> The schema is still named `railway` (legacy name). The `dwip-prod` commands and the socket-based
> plan below were never applied; the live service is `dwip-enterprise`.
> See [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md).

**Review:** GCP-002  
**Status:** LIVE — Cloud SQL is the current production database. The RC2 plan below is retained as a historical record.  
**Current Production Database:** Google Cloud SQL for MySQL 8, reached over TCP with `DB_SSL=true`. The schema is still named `railway` — a legacy name from the app's original Railway.app hosting (see `src/config/env.ts`).

---

## Historical — RC1.1 Pilot Railway MySQL Configuration (no longer in use)

### Connection Parameters

```
Host:      [Railway TCP public host] → Secret: DWIP_DB_HOST
Port:      3306                       → Env var: DB_PORT=3306
User:      [Railway user]             → Secret: DWIP_DB_USER
Password:  [Railway password]         → Secret: DWIP_DB_PASSWORD
Database:  railway                    → Secret: DWIP_DB_DATABASE
SSL:       true                       → Env var: DB_SSL=true
```

### (Historical) Railway MySQL Reliability Characteristics

| Feature | Railway Status | Notes |
|---|---|---|
| Daily backups | ✅ Yes | 7-day retention |
| SSL encryption | ✅ Yes | Mandatory |
| High Availability | ❌ No | Single instance |
| Read Replicas | ❌ No | Not available |
| PITR | ❌ No | Not available |
| Latency to Cloud Run (asia-south1) | ~8–15ms | Acceptable for pilot |

### Pilot Risk Acceptance

The following risks are accepted for the RC1.1 controlled pilot:

1. **No HA on Railway MySQL** — Single workshop shift continuity is acceptable; restart only at shift change
2. **No read replicas** — Pilot traffic volume does not require read scaling
3. **Public TCP endpoint** — Mitigated by SSL + Secret Manager credential storage

---

## RC2 Plan — Cloud SQL for MySQL

### Target Configuration

```bash
# Create Cloud SQL instance for production
gcloud sql instances create dwip-mysql-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=asia-south1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --retained-backups-count=7 \
  --retained-transaction-log-days=7 \
  --no-assign-ip \
  --network=default \
  --project=PROJECT_ID
```

### Cloud SQL RC2 Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Version | MYSQL_8_0 | Matches the existing schema |
| Tier | db-n1-standard-2 | 2 vCPU, 7.5 GB RAM — production workload |
| Storage | 100 GB SSD, auto-increase | Source dump is 3.3 GB; headroom for growth |
| Availability | REGIONAL (HA) | Automatic failover, 99.95% SLA |
| Backups | Daily at 02:00 AM | Low-traffic window |
| PITR | 7-day transaction log | Point-in-time recovery enabled |
| Network | Private IP only | No public IP — Serverless VPC Connector required |

### VPC Connector for Cloud Run → Cloud SQL Private

```bash
# Create Serverless VPC Connector
gcloud compute networks vpc-access connectors create dwip-connector \
  --region=asia-south1 \
  --network=default \
  --range=10.8.0.0/28 \
  --project=PROJECT_ID

# Update Cloud Run to use VPC connector + Unix socket
gcloud run services update dwip-prod \
  --vpc-connector=dwip-connector \
  --vpc-egress=private-ranges-only \
  --update-secrets="DB_SOCKET_PATH=DWIP_DB_SOCKET_PATH:latest" \
  --remove-env-vars="DB_HOST,DB_PORT,DB_SSL" \
  --region=asia-south1
```

### Cloud SQL Connection String (RC2)

```env
# Replace TCP with Unix socket (faster, no SSL overhead)
DB_SOCKET_PATH=/cloudsql/PROJECT_ID:asia-south1:dwip-mysql-prod
DB_USER=[service user]
DB_PASSWORD=[secret]
DB_DATABASE=dwip
# DB_HOST, DB_PORT, DB_SSL — NOT SET when using socket
```

### RC2 Database Migration Steps

```
1. Freeze writes on Railway (during shift change — Sunday 2 AM)
2. mysqldump from Railway → GCS bucket
3. Import into Cloud SQL via Cloud SQL Import
4. Validate row counts: SELECT COUNT(*) on all tables
5. Run /api/ready readiness check against new Cloud SQL
6. Update secrets: DWIP_DB_SOCKET_PATH, remove DWIP_DB_HOST
7. Deploy new Cloud Run revision (uses socket)
8. Traffic split 10% → new, monitor for 30 min
9. Traffic split 100% → new
10. Decommission Railway database after 7-day monitoring period
```

### Cloud SQL Backup Policy (RC2)

| Backup Type | Frequency | Retention | Method |
|---|---|---|---|
| Automated backup | Daily at 02:00 AM | 7 days | Cloud SQL managed |
| PITR | Continuous | 7 days of transaction logs | Cloud SQL managed |
| On-demand backup | Before any migration | Indefinite | Manual `gcloud sql backups create` |
| Export to GCS | Weekly | 30 days | Cloud Scheduler + `gcloud sql export sql` |
