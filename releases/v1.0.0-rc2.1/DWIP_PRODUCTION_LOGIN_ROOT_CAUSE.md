# DWIP V1 – PRODUCTION DATABASE & AUTHENTICATION AUDIT REPORT

**Target Cloud SQL Instance:** `giga-course-dp497:asia-south1:wms-mysql-db` (`35.200.150.167`)  
**Production Database:** `railway`  
**GCP Project:** `disco-processor-nqtlh`  
**Audit Timestamp:** `25/07/2026`  

---

## 1. Executive Summary & Infrastructure Truth Findings

Direct read-only queries against the production Cloud SQL database instance (`35.200.150.167`) established empirical infrastructure facts:

1. **Active Database Name:** `railway` is the **ACTIVE production MySQL database**.
2. **Admin Account Status:** The `admin` user **EXISTS** in database `railway`, table **`users`** (`user_id = 55`, `role = 'admin'`, `is_active = 1`).
3. **Stored Password Hash Verification:**
   * Stored Hash: `$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.`
   * `admin123`: **`NO MATCH (FAIL)`**
   * `Admin@DWIP2026`: **`MATCH (SUCCESS)`** (The stored password hash in production is 100% valid for `Admin@DWIP2026`).

---

## 2. Empirical Database Query Evidence

### 2.1 Database List (`SHOW DATABASES;`)
```sql
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| railway            |
| sys                |
+--------------------+
```

### 2.2 Active Database Selection (`SELECT DATABASE();`)
```sql
+------------------+
| SELECT DATABASE()|
+------------------+
| railway          |
+------------------+
```

### 2.3 Table Directory in Database `railway` (`SHOW TABLES;`)
Database `railway` contains all production tables:
* `user_access_master`
* `users`
* `vehicle_master`
* `service_history`
* `invoices`
* `job_cards`
* `customers`
* `estimates`
* `warranty_claims`
* `amc_contracts`
* `fsb_executions`
* `goodwill_requests`

---

## 3. Account Inspection & Bcrypt Verification Evidence

### 3.1 Account Query (`SELECT * FROM users WHERE username = 'admin';`)

```json
{
  "user_id": 55,
  "username": "admin",
  "role": "admin",
  "is_active": 1,
  "password_hash": "$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL."
}
```

### 3.2 Bcrypt Hash Evaluation Results

| Candidate Password | Stored Production Hash | `bcrypt.compareSync()` Outcome |
| :--- | :--- | :--- |
| **`admin123`** | `$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.` | **`NO MATCH (FAIL)`** |
| **`Admin@DWIP2026`** | `$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.` | **`MATCH (SUCCESS)`** |

---

## 4. Secret Manager & Connection Configuration Audit

| Secret Key | Secret Manager Value | Status / Role |
| :--- | :--- | :--- |
| **`DWIP_DB_HOST`** | `35.200.150.167` | Production Cloud SQL IP |
| **`DWIP_DB_PORT`** | `3306` | Standard MySQL Port |
| **`DWIP_DB_USER`** | `root` | Database Superuser |
| **`DWIP_DB_PASSWORD`** | `WmsSecureMySQL2026!` | Production Password |
| **`DWIP_DB_DATABASE`** | `railway` | Active Production Database |
| **`DWIP_DB_SOCKET_PATH`** | `/cloudsql/giga-course-dp497:asia-south1:wms-mysql-db` | Unix Domain Socket Path |

---

## 5. Summary of Findings

1. The `admin` user is **present, active, and configured with password `Admin@DWIP2026`** in database `railway`, table `users`.
2. The password hash stored in production is valid and uncorrupted.
3. Database `railway` is the certified production database containing all 5 core tables (`user_access_master`, `users`, `vehicle_master`, `service_history`, `invoices`).
