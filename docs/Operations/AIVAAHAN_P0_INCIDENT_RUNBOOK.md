# P0 / P1 Critical Incident Runbook

**System**: AiVaahan Enterprise Production System (`https://devanand.aivaahan.com`)  
**Target SLA**: P0 Acknowledgment `< 5 Minutes` / Resolution `< 2 Hours`

---

## 1. Severity Classification Matrix

| Severity | Impact Description | SLA Acknowledgment | SLA Resolution | Escalation Target |
| :--- | :--- | :---: | :---: | :--- |
| **P0 - Critical** | Complete system outage, database down, or VOS Gate In blocked across all branches | `< 5 Mins` | `< 2 Hours` | Incident Cmdr + Dev Lead + GM Service |
| **P1 - High** | Major feature unavailable (QRT GPS tracking offline, OEM gateway sync paused) | `< 15 Mins` | `< 4 Hours` | Dev Lead + Workshop Manager |
| **P2 - Medium** | Non-blocking feature issue (slow media upload, minor UI alignment) | `< 1 Hour` | `< 24 Hours` | Module Owner |
| **P3 - Low** | Cosmetical, minor enhancement request, typo correction | `< 4 Hours` | `< 72 Hours` | Backlog Queue |

---

## 2. P0 Emergency Incident Response Workflow

```
[P0 Outage Detected]
         |
         v
+---------------------------------------+
| 1. Declare P0 Incident                |  Page Incident Commander & Dev Lead
|    Create P0 War Room Channel         |
+---------------------------------------+
         |
         v
+---------------------------------------+
| 2. Triage & Isolate Root Cause        |  Inspect logs at server.cjs / CloudRun logs
|    Check DB health & Gateway status   |
+---------------------------------------+
         |
         v
+---------------------------------------+
| 3. Apply Hotfix or Executive Rollback |  If fix > 30m, initiate automated rollback
+---------------------------------------+
         |
         v
+---------------------------------------+
| 4. Resolve & Verify Health            |  Confirm 100% API health (200 OK)
+---------------------------------------+
         |
         v
+---------------------------------------+
| 5. Post-Mortem & RCA Report           |  Publish Root Cause Analysis (RCA) within 24h
+---------------------------------------+
```

---

## 3. Executive Rollback Criteria

Initiate emergency version rollback to previous stable deployment (`DWIP v1.1.0-RC1`) if ANY of the following conditions are met:
1. P0 system outage exceeds 30 minutes without a confirmed hotfix patch.
2. VOS Gate Entry or Job Card creation fails continuously for > 15 minutes.
3. Data corruption or unhandled database transaction rollbacks detected.
