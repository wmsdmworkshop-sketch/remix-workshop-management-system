# DWIP Enterprise — Database Users & Privileges

**Instance:** `wms-mysql-db` · project `giga-course-dp497` · region `asia-south1` · MySQL 8.0.45-google
**App schema:** `railway` (legacy name — the server is Cloud SQL, not Railway; see `src/config/env.ts`)

Last verified **2026-09-14** by reading live grants (`SHOW GRANTS`) against the instance.

---

## Current state

| User | Host | Effective grants | Notes |
| --- | --- | --- | --- |
| `root` | `%` | `USAGE ON *.*` + `cloudsqlsuperuser` | **what the app connects as** (`DB_USER=root`) |
| ~~`dwipadmin`~~ | — | — | **dropped 2026-09-14** — held `USAGE ON *.*` + `cloudsqlsuperuser`, i.e. identical to `root` |

`cloudsqlsuperuser` grants the following **on `*.*` with `GRANT OPTION`** (only `mysql.*` and `sys.*` are partially revoked):

> SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, SHUTDOWN, PROCESS, REFERENCES, INDEX, ALTER,
> SHOW DATABASES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT,
> CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, CREATE TABLESPACE,
> CREATE ROLE, DROP ROLE

**`dwipadmin` was dropped on 2026-09-14** (`gcloud sql users delete`), leaving `root` as the only
application account. It was removed because it was *not* least-privilege — it held the same
`cloudsqlsuperuser` role as `root`, so switching `DB_USER` between them would have been a lateral move
that cost a deploy window and bought nothing. Deleting an unused full-power credential was the cheaper
and larger win. Verified after deletion: 0 rows in `mysql.user`, 0 residual grants in `mysql.db` and
`mysql.tables_priv`, production healthy on the same revision (no deploy was needed — `DB_USER` was
always `root`).

### Blast radius of the current credential

Measured on the instance (2026-09-14):

| Schema | Tables | Size | Reachable by the app's credential? |
| --- | --- | --- | --- |
| `railway` | 183 | ≈358 MB | yes — the live business data |
| `railway_test` | 142 | ≈5 MB | **yes** — the isolated test schema, on the same instance |

Beyond data, `cloudsqlsuperuser` also allows `CREATE USER`, `DROP ROLE`, `GRANT OPTION`, `SHUTDOWN`,
`PROCESS`, `EVENT`, `TRIGGER` and `CREATE ROUTINE` on `*.*`.

**The argument for a scoped user is *evictability*, not confidentiality.** The app's own data lives in
`railway`, so a leaked credential exposes the business data either way. What a scoped user removes is the
ability to **create a new account or grant itself privileges** — which is what turns a leaked password
into *permanent* access. With `root`, rotating the password does not evict an attacker who already ran
`CREATE USER`; with `dwipapp`, rotation is genuinely evictive.

That is not hypothetical here: this credential was committed to git (`src/tests/smoke_rbac_all_roles_e2e.spec.ts`)
and sat there until 2026-09-14.

**Honest limits:** the app needs broad DDL on `railway` at every boot, so this is coarse scoping — "one
schema, no persistence mechanisms, no instance control" — not fine-grained least privilege. If `railway`
were the only schema and the credential were never shared, the marginal gain would be small.

**Cheapest win — done 2026-09-14:** the unused `dwipadmin` superuser was deleted: one fewer full-power
credential, no deploy, no failover. What remains optional is the scoped `dwipapp` user below.

---

## What the app actually needs

Derived from the DDL the server executes at boot, not guessed:

| Statement | Where |
| --- | --- |
| `CREATE TABLE IF NOT EXISTS …` | `src/db/sync.ts`, `server.ts` |
| `ALTER TABLE … ADD COLUMN` / `MODIFY COLUMN` | `src/db/sync.ts`, `server.ts`, `src/db/migrations/*` |
| `ALTER TABLE … DROP FOREIGN KEY` | `src/db/migrations/006_*`, `017_*` |
| `ALTER TABLE … ADD UNIQUE KEY` | `src/db/migrations/018_*` |
| `CREATE INDEX …` | `server.ts` |
| `CREATE OR REPLACE VIEW customer_job_cards_view` | `server.ts:787` |
| `SELECT` / `INSERT` / `UPDATE` / `DELETE` | throughout, incl. `syncLoad()` |

**Not used anywhere in app or migration code:** `DROP TABLE`, `TRUNCATE`, `CREATE TRIGGER`,
`CREATE PROCEDURE`, `CREATE FUNCTION`, `CREATE DATABASE`.

---

## Recommended: a scoped `dwipapp` user

Replaces a `*.*` + `GRANT OPTION` superuser with an account confined to one schema. It keeps every DDL
privilege the boot migrations need, and removes the ability to create users, grant privileges, read
other schemas, or shut the instance down.

### Step 1 — create the user (run as `root`)

```sql
CREATE USER 'dwipapp'@'%' IDENTIFIED BY '<password>';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW
  ON `railway`.* TO 'dwipapp'@'%';
```

`DROP` is included only because `CREATE OR REPLACE VIEW` requires it — and it is scoped to `railway`,
so it cannot touch other schemas. If a boot step reports a missing privilege, add the narrowest fix:

```sql
GRANT CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON `railway`.* TO 'dwipapp'@'%';
```

### Step 2 — prove it locally FIRST

Do not point production at a new user untested. The local dev server runs the **same** boot path
(`scripts/sync_now.ts` → `syncLoad()` → `runMigrations()`), so it exercises every statement above:

1. Set `DB_USER=dwipapp` and `DB_PASSWORD=<password>` in `.env`.
2. `npm run dev` (2–3 min; it is slow by design — see [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md)).
3. Watch for any `ER_TABLEACCESS_DENIED_ERROR` / `ER_ACCESS_DENIED_ERROR` in the boot log. A clean run
   to `Workshop Server running on http://localhost:8080` means the grant set is sufficient.

### Step 3 — switch production

```bash
gcloud run services update dwip-enterprise \
  --region=asia-south1 \
  --project=giga-course-dp497 \
  --update-env-vars=DB_USER=dwipapp,DB_PASSWORD='<password>'
```

> ⚠️ **`--update-env-vars` merges; `--set-env-vars` replaces the entire set.** The service has 16 env
> vars — using `--set-env-vars` would drop `DB_HOST`, `JWT_SECRET`, `CUSTOMER_JWT_SECRET`,
> `NEMOTRON_API_KEY` and the rest, taking production down. Same hazard called out in
> [cloudbuild.yaml](./cloudbuild.yaml).

### Step 4 — verify

```bash
curl -fsS https://dwip-enterprise-npoyvb3q7a-el.a.run.app/api/health
```

Expect HTTP 200 with `database: Healthy — "MySQL Cloud SQL connected"`, then confirm a real login.
Also check the new revision's logs for DDL errors — the boot path runs migrations, so a privilege gap
shows up there rather than in `/api/health`.

### Rollback

```bash
gcloud run services update dwip-enterprise \
  --region=asia-south1 --project=giga-course-dp497 \
  --update-env-vars=DB_USER=root,DB_PASSWORD='<current root password>'
```

The root password was rotated on 2026-09-14; keep it in the password manager, not in the repo.

---

## Status

| Item | State |
| --- | --- |
| Leaked `root` password | rotated 2026-09-14 |
| Hardcoded credential in `src/tests/smoke_rbac_all_roles_e2e.spec.ts` | removed |
| Unused `dwipadmin` superuser | **deleted 2026-09-14** |
| Scoped `dwipapp` user (least privilege / evictability) | **not done** — proposal above |

---

## Auditing privileges

```bash
# Which users exist
gcloud sql users list --instance=wms-mysql-db --project=giga-course-dp497

# Effective grants (run against the instance)
SHOW GRANTS FOR 'dwipapp'@'%';
```

Note: `information_schema.SCHEMA_PRIVILEGES` / `USER_PRIVILEGES` **do not** show privileges a user
inherits through a role such as `cloudsqlsuperuser` — they will misleadingly report "no privileges".
Use `SHOW GRANTS FOR <user>` and `SHOW GRANTS FOR <role>` instead.
