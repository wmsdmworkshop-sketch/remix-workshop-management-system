# DWIP Enterprise ERP - Transaction Architecture Forensics
**Sprint**: RC1-TXN-FORENSICS-001  
**Timestamp**: 2026-07-16  

This report provides a forensic analysis of the transaction architecture, database synchronization performance, and data reliability inside the workshop management system.

---

## 1. Transaction Boundaries & Hybrid Cache Model
The application implements a custom state persistence architecture:
```
[Client Request] 
      │
      ▼
[Express Route Handler] 
      │
      ├─► 1. Update In-Memory Cache (cachedDB)
      ├─► 2. Save cache to local JSON (saveDB -> workshop_db.json)
      └─► 3. Synchronize to MySQL (syncSave -> Cloud SQL/MySQL)
```

### Architectural Integrity Analysis
1.  **Lack of ACID Compliance**: 
    The transaction is split across three independent boundaries (Node.js memory heap, Local disk JSON file, and remote MySQL database). The application does not use database transactions (`START TRANSACTION` / `COMMIT`). If an error or network timeout occurs during `syncSave`, the memory cache and JSON file remain modified, creating a state mismatch between MySQL and the application layer.
2.  **No Concurrency Control**: 
    There is no optimistic locking or record versioning. If two staff members modify the same job card simultaneously, the latter write overwrites the former without any conflict detection, leading to potential lost updates.
3.  **Delayed Ingestion Sync**:
    On initial intake (`POST /api/job-cards`), the application calls `saveDB` but does not trigger `syncSave`. Pushing to SQL only occurs during subsequent `PUT` requests. This leads to temporary database omission of newly created vehicles until they are updated.

---

## 2. SQL Synchronization Performance & Latency
During our live UAT runs, we observed severe performance bottlenecks:
*   **Sequential Statement Loop**: The `syncSave` function loops through all tables and rows in memory (including all 6,566 historical job cards) and executes individual `INSERT ... ON DUPLICATE KEY UPDATE` statements.
*   **TCP Round-Trip Bottleneck**: Running 6,500+ statements sequentially over TCP to a remote MySQL database requires 6,500+ network round-trips. With an average RTT of ~75ms, the first `syncSave` call in a route handler blocks the thread for **over 8 minutes**.
*   **Connection Timeouts**: During this long synchronous blocking operation, open client-server connections can be abruptly closed by proxies, throwing `Can't add new command when connection is in closed state` errors on subsequent queries.

---

## 3. Database Schema Anomalies & Swallowed Errors
Our trace of `server.ts` identified an integrity leak where database errors are silently ignored:
*   **Alert Logs Insert Failures**:
    Inside the route handlers in `server.ts` (e.g. lines 3852, 3864, 3876, 6896, 7960, 8070), direct SQL queries are executed to insert alerts:
    ```sql
    INSERT INTO alert_logs (jc_id, role, type, message, created_at, is_read) ...
    ```
*   **The Mismatch**:
    The actual database table `alert_logs` does not have columns named `jc_id`, `role`, or `type`. Its columns are `alert_id`, `alert_config_id`, `entity_type`, `entity_id`, and `alert_message`.
*   **Swallowed Errors**:
    These queries fail at the database level on every invocation. However, they are wrapped in empty `try...catch` blocks:
    ```typescript
    try {
      await db.execute("INSERT INTO alert_logs ...");
    } catch (e) {
      // Ignored
    }
    ```
    This swallows the database execution error, returning `200 OK` to the client while failing to persist critical operational alert logs in the database.
