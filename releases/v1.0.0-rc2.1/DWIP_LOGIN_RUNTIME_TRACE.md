# DWIP V1 – PRODUCTION LOGIN RUNTIME TRACE REPORT

**Target Application:** Devanand Workshop Intelligence Platform (DWIP V1)  
**Production Database:** `railway` (`35.200.150.167`)  
**Target Account:** `username = admin`  
**Trace Date:** 25/07/2026  

---

## 1. Executive Summary

A non-destructive, line-by-line runtime trace of the authentication pipeline for username **`admin`** was executed. The trace captured empirical evidence across all 12 operational checkpoints, demonstrating that:

1. The `admin` user is stored in the **`users`** table (`user_id = 55`, `is_active = 1`).
2. The stored password hash (`$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.`) **MATCHES `Admin@DWIP2026`** (`bcrypt.compare()` = `true`).
3. For password **`admin123`**, `bcrypt.compare()` evaluates to `false` and returns `HTTP 401 Unauthorized`.
4. For password **`Admin@DWIP2026`**, `bcrypt.compare()` evaluates to `true`, JWT token generation is reached, and **`HTTP 200 OK`** is returned.

---

## 2. 12-Point Runtime Trace Evidence Table

| Trace Step | Checkpoint Parameter | Recorded Runtime Evidence | Execution Status |
| :--- | :--- | :--- | :--- |
| **1. Database Selected** | `SELECT DATABASE();` | **`railway`** | **VERIFIED** |
| **2. SQL Executed** | Primary & Fallback Queries | Query 1: `SELECT * FROM user_access_master WHERE LOWER(username) = LOWER('admin')...`<br>Query 2: `SELECT *, role AS user_role FROM users WHERE LOWER(username) = LOWER('admin')...` | **VERIFIED** |
| **3. Rows Returned** | Query Row Counts | Query 1 (`user_access_master`): **`0` rows**<br>Query 2 (`users`): **`1` row** | **VERIFIED** |
| **4. Table Used** | Authenticating Table | **`users`** (Resolved via Query 2 fallback) | **VERIFIED** |
| **5. `user_access_master` Result** | DB Query 1 Result | **`[]`** (0 matching records) | **VERIFIED** |
| **6. `users` Result** | DB Query 2 Result | **`[ { user_id: 55, username: 'admin', role: 'admin', is_active: 1, password_hash: '$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.' } ]`** | **VERIFIED** |
| **7. Chosen User Record** | Operational User Object | **`{ user_id: 55, full_name: 'Admin Operator', username: 'admin', role: 'admin', is_active: 1 }`** | **VERIFIED** |
| **8. `is_active` Status** | Account Status Check | **`1`** (Evaluates to `isUserActive = true`) | **VERIFIED** |
| **9. `password_hash` Exists?** | Hash Presence | **`YES`** (`$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.`) | **VERIFIED** |
| **10. `bcrypt.compare()` Result** | Candidate Password Match | Candidate `'admin123'`: **`FALSE (NO MATCH)`**<br>Candidate `'Admin@DWIP2026'`: **`TRUE (MATCH)`** | **VERIFIED** |
| **11. JWT Generation Reached?**| Token Issuance Step | **`YES`** (Signed payload with Secret Manager key `DWIP_JWT_SECRET`) | **VERIFIED** |
| **12. HTTP Response Returned** | Final API Response | Candidate `'admin123'`: **`HTTP 401 Unauthorized`** (`{"error":"Invalid username or password."}`)<br>Candidate `'Admin@DWIP2026'`: **`HTTP 200 OK`** (`{ token: "eyJhbGci...", user: { user_id: 55, username: "admin", role: "admin" } }`) | **VERIFIED** |

---

## 3. Log Cleanliness & Non-Destructive Assurance

* No authentication code logic was modified.
* No passwords or database records were altered.
* All debug trace execution was isolated to read-only diagnostic invocations.
