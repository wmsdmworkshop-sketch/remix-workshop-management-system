# Devanand Pilot Daily Operational Checklist

**Target Location**: Devanand Automobiles (`DLR-MUM-01`)  
**Frequency**: Executed Daily (08:00 AM & 06:00 PM)

---

## Daily Operational Monitoring Checklist

### Morning Health Check (08:00 AM)
- [ ] **System Uptime & SSL**: Verify HTTPS access to `https://devanand.aivaahan.com` and API latency (`< 50ms`).
- [ ] **Integration Gateway**: Verify status of OEM provider adapters (`TMSA`, `QRT`, `EPC`, `Eguru`).
- [ ] **Mobile App & PWA Status**: Confirm app launches cleanly on technician mobile devices without crash reports.
- [ ] **Gate Entry Readiness**: Confirm Gate Security login and ANPR/manual entry readiness.

### Evening Review & Data Verification (06:00 PM)
- [ ] **VOS Session Verification**: Confirm all vehicle gate entries have corresponding VOS sessions (`GATE_IN`).
- [ ] **Job Card Processing**: Verify job card state transitions (`GATE_IN` → `WORK_IN_PROGRESS`).
- [ ] **QRT Breakdown SLA Audit**: Review daily breakdown cases; confirm 100% reach SLA compliance.
- [ ] **Audit Trail Check**: Verify `VosAuditEngine` recorded all operational state modifications.
- [ ] **Crash Telemetry**: Inspect Firebase Crashlytics dashboard for any unhandled exceptions.
