# Production Observability Runbook

Troubleshooting runbook for production engineers using EOP.

## Diagnostic Workflows

### 1. Slow Query Investigation
1. Navigate to **Database** tab.
2. Review the **Top Queries** list and average execution times.
3. Check the **Missing Indexes** section and execute the recommended SQL commands if performance degradation occurs.

### 2. Error Code Resolution
1. Navigate to **Logs Center** or **Audit Logs**.
2. Filter logs by correlation ID or error code.
3. Review the root cause recommendation displayed.

### 3. Background Worker Restarts
1. Open the **Production Support Mode** panel under **Maintenance**.
2. Click **Restart Background Workers** to flush local node processes.
