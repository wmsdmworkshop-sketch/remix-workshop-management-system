# Sedam Road (Kalaburagi) Production Rollout Plan

**Branch Identity**: Sedam Road Workshop (`BR-SEDAM` / Kalaburagi)  
**Parent Dealership**: Devanand Automobiles (`COMP-TATA` / `DLR-MUM-01`)  
**Rollout Phase**: Phase 1 Live Production Cutover  
**Target Version**: `v1.0.0-RC1` (`versionCode: 10000`)

---

## 1. Phase 1 Operational Module Validation

The Sedam Road branch execution validates 9 core operational capabilities:

1. **Authentication & RBAC**: Gate Security, Service Advisor, Technician, and Manager credentials.
2. **Gate Entry**: ANPR and manual vehicle intake at workshop gate.
3. **VOS Lifecycle**: Creation of active VOS session (`visitType: BREAKDOWN` / `NORMAL_SERVICE`).
4. **Job Card Processing**: Transition from `GATE_IN` → `WORK_IN_PROGRESS`.
5. **Breakdown Management**: Roadside breakdown registration and severity matrix validation.
6. **QRT Dispatch**: Team assignment, GPS tracking, and reach SLA monitoring (2h Day / 4h Night).
7. **Executive Dashboard**: Real-time workshop throughput and bay occupancy views.
8. **Media Upload**: Vehicle inspection photos uploaded via Integration Gateway (`/media/upload`).
9. **Operational Reports**: End-of-day workshop performance reports.

---

## 2. Sedam Road 30-Day Execution Timeline

- **Day 0 (Cutover)**: System installation, user credential distribution, database initialization verification.
- **Day 1 (First Live Workday)**: 100% live Gate Entry & VOS intake on-site support.
- **Day 7 (Stabilization Check)**: QRT breakdown SLA review & media upload audit.
- **Day 15 (Mid-Point Audit)**: Technician productivity scorecard evaluation.
- **Day 30 (Phase 1 Sign-Off)**: Full operational sign-off & transition to Phase 2 (Basavakalyan).
