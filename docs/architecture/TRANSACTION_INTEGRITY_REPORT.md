# DWIP Enterprise ERP - Transaction Integrity Report
**Sprint**: RC1-LIVE-UAT-002  
**Timestamp**: 2026-07-16  

This report provides an in-depth audit of the workshop management system's transaction boundaries, database sync performance, and data reliability.

---

## 1. The Sync-Save Transaction Model
The application uses a hybrid data model:
1.  **Primary Storage**: A local, in-memory cache (`cachedDB`) loaded from `workshop_db.json`.
2.  **State Modifications**: Handlers directly modify `cachedDB` and write back to the JSON file using `saveDB(cachedDB)`.
3.  **SQL Persistence**: Handlers call `await syncSave(cachedDB)`, which attempts to push the modified state to MySQL.

### Architectural Risks
*   **Lack of ACID Transactions**: Writing first to memory/JSON and then syncing to MySQL does not guarantee atomic operations. If a sync fails midway, the memory/JSON cache remains updated with the new state, while MySQL is left in a partially updated or stale state.
*   **Optimistic Locking/Concurrency Control**: There is no optimistic locking or row versioning (`version` or `updated_at` checks) during SQL updates. Sequential updates from multiple requests overwrite each other, leading to potential dirty writes and lost updates.

---

## 2. SQL Synchronization Performance & Latency
During our live UAT runs, we observed severe performance bottlenecks:
*   **Sequential Statement Execution**: The `syncSave` function loops through all tables and rows in memory (including all 6,566 historical job cards) and executes individual `INSERT ... ON DUPLICATE KEY UPDATE` statements.
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
