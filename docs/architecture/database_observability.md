# Database Observability

Describes database monitoring console and telemetry indexes.

## Diagnostic Metrics
- **Active Threads**: Current open MySQL connections.
- **Connection Pool Limit**: Maximum configured connections.
- **Slow Query Logs**: Highlights database executions exceeding 100ms.
- **Deadlock Registers**: Recurrent transaction locking errors.
- **Missing Index Suggestion**: Recommends missing indexes on tables (e.g. `tbl_workflow_history`).
