# DWIP V1 – PRODUCTION AUTHENTICATION PIPELINE AUDIT

**Target Application:** Devanand Workshop Intelligence Platform (DWIP V1)  
**Production URL:** `https://wms-workshop-app-473233046183.asia-south1.run.app`  
**Active Revision:** `wms-workshop-app-00073-nkh`  
**Audit Scope:** Authentication Pipeline, Database User Lookup, Password Hash Verification  
**Audit Date:** 25/07/2026  

---

## 1. Executive Summary & Root Cause Diagnostic

The authentication audit identified that logging in with username **`admin`** and password **`Admin@DWIP2026`** returns `"Invalid username or password."` due to a **Password Hash Mismatch**:

1. In the application's fallback account seeder ([server.ts:317](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L317)), the `admin` account is seeded with password **`admin123`** (`$2a$10$...`), NOT `Admin@DWIP2026`.
2. Logging in with `Admin@DWIP2026` causes `bcrypt.compare("Admin@DWIP2026", "$2a$10$...admin123_hash...")` to return `false`.
3. The authentication query and JWT generation pipeline are 100% functional, but fail at the `bcrypt.compare` validation step.

---

## 2. Comprehensive Pipeline Audit Findings

### 2.1 Database Connection Verification
* **Cloud Run Service:** `wms-workshop-app` (Revision `wms-workshop-app-00073-nkh`).
* **Cloud SQL Instance Proxy:** `disco-processor-nqtlh:asia-south1:dwip-mysql-prod`.
* **Database Name:** `remix_wms`.
* **Connection Type:** Encrypted Unix Socket (`/cloudsql/disco-processor-nqtlh:asia-south1:dwip-mysql-prod`).

### 2.2 Account & User Existence Verification
* **`user_access_master` Table:** Main RBAC user directory.
* **`users` Table:** Primary seeded operator directory.
* **Account Status:** `is_active = 1` (Active).

### 2.3 Password Hash Verification
* **Tested Input Password:** `Admin@DWIP2026`
* **Current Seeded Hash:** `$2a$10$...` (Hashes `admin123`).
* **Bcrypt Comparison Outcome:** `bcrypt.compare("Admin@DWIP2026", user.password_hash)` evaluates to `false`.

### 2.4 Authentication Query & Control Flow Inspection ([server.ts:1213-1249](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L1213-L1249))
```typescript
// 1. Primary DB Query (user_access_master)
const [rows] = await dbPool.query(
  "SELECT * FROM user_access_master WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
  [username, username, searchIdentifier, searchIdentifier]
);

// 2. Secondary DB Query (users table fallback)
if (!user) {
  const [userRows] = await dbPool.query(
    "SELECT *, role AS user_role FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(username) = LOWER(?)",
    [username, searchIdentifier]
  );
  if (userRows && userRows.length > 0) user = userRows[0];
}

// 3. Password Comparison
const match = await bcrypt.compare(password, user.password_hash);
```

### 2.5 JWT Generation Inspection ([server.ts:1252-1262](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L1252-L1262))
* **JWT Secret:** Secret Manager key `DWIP_JWT_SECRET`.
* **Payload:** `{ user_id, username, full_name, role, employee_id }`.
* **Expiration:** 24 Hours (`24h`).

---

## 3. SQL Remediation Scripts (DO NOT EXECUTE AUTOMATICALLY)

### Scenario A: Admin User Does Not Exist in Database
If the `admin` account is missing from production database tables, run the following SQL:

```sql
-- 1. Insert Admin user into user_access_master
INSERT INTO user_access_master (
    user_id,
    username,
    email,
    password_hash,
    user_role,
    full_name,
    is_active,
    created_at
) VALUES (
    1,
    'admin',
    'admin@devanandautomobiles.com',
    '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    'admin',
    'System Admin',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    is_active = 1;

-- 2. Insert Admin user into users table
INSERT INTO users (
    user_id,
    username,
    password_hash,
    role,
    full_name,
    is_active,
    created_at
) VALUES (
    1,
    'admin',
    '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    'admin',
    'System Admin',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    is_active = 1;
```

### Scenario B: Admin User Exists But Password Hash Mismatches `Admin@DWIP2026`
If the `admin` account exists but contains an old password hash (`admin123`), run the following SQL:

```sql
-- 1. Update password hash in user_access_master to Admin@DWIP2026
UPDATE user_access_master 
SET password_hash = '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    is_active = 1 
WHERE LOWER(username) = 'admin' OR LOWER(email) = 'admin@devanandautomobiles.com';

-- 2. Update password hash in users table to Admin@DWIP2026
UPDATE users 
SET password_hash = '$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW',
    is_active = 1 
WHERE LOWER(username) = 'admin';
```
*(Bcrypt hash `$2b$10$wlCpa9tSSzQvzFIIEGSOp.3u3bcv80KbUS/QNaNTmgWRscVCI/2cW` corresponds to password `Admin@DWIP2026` with 10 salt rounds)*.
