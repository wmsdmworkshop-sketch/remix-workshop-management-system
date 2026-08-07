# Production Issue Triage & Diagnostics Guide

**Target Audience**: Operations Support Engineers & On-Call Developers  
**Platform**: AiVaahan Enterprise System

---

## 1. Triage Decision Tree

```
[Issue Reported]
       |
       +---> Is system down or Gate Entry blocked across all branches?
       |     YES -> Assign P0 (Trigger P0 Runbook, notify Incident Cmdr)
       |     NO  |
       |         +---> Is major feature failing (QRT GPS / Media Upload)?
       |               YES -> Assign P1 (Notify Dev Lead, target fix < 4h)
       |               NO  |
       |                   +---> Is non-blocking feature defect?
       |                         YES -> Assign P2 (Log in Bug Tracker, target fix < 24h)
       |                         NO  -> Assign P3 (Cosmetic/Enhancement backlog)
```

---

## 2. Diagnostic Log Inspection Runbook

1. **Inspect Application Server Logs**:
   - Log path: `dist/server.cjs` stdout / CloudRun logs.
   - Look for `StructuredLogger` lines containing `result: "FAILURE"`.

2. **Inspect Integration Gateway Sync Logs**:
   - Check `SyncOrchestrator` logs for provider IDs (`TMSA`, `QRT`, `EPC`, `Eguru`).
   - Check failed queue count via gateway diagnostic endpoint.

3. **Inspect Database Locks & Transactions**:
   - Check `VosTransactionService` rollback logs.
