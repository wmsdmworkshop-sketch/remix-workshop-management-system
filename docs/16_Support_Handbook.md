# DWIP Support Handbook
**Application Support & Diagnostics Playbook**

## 1. Incident Resolution Matrix
* **Database Pool Connection Timeout**: Restart the database container instance and verify `DB_HOST` connectivity logs.
* **JWT Authentication Rejection**: Clear client session caches and prompt system administrators to rotate JWT secrets if keys have expired.
* **Telemetry Sync Failure**: Inspect the local file-backed DB `workshop_db.json` permission logs.

## 2. Escalation Matrix
* **Tier 1 (Dealership Support)**: General usage questions.
* **Tier 2 (Platform Support)**: API latencies, verification checks.
* **Tier 3 (Core Engineering)**: Event bus locks or transactional rollback failures.
