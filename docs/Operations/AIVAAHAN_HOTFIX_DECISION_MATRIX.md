# Live Production Hotfix Decision Matrix

**Scope**: Decision Criteria for Live Production Hotfixes during Pilot Execution

---

## 1. Hotfix Decision Matrix

```
[Issue Encountered in Production]
               |
     +---------+---------+
     |                   |
[P0 Outage / Security]  [P2/P3 Enhancement or Minor UI]
     |                   |
     v                   v
Immediate Emergency    DO NOT HOTFIX
Hotfix Pipeline        Queue for Scheduled Patch Release (v1.0.1)
(Deploy < 2 Hours)
```

---

## 2. Emergency Approval Chain

- **Step 1**: Triage issue severity (Must be P0 System Block or P1 Critical Feature Outage).
- **Step 2**: Obtain dual approval from **Incident Commander** and **GM Service**.
- **Step 3**: Execute surgical fix on `hotfix/` branch.
- **Step 4**: Run `npm run type-check` and `npx vitest run` (Must pass 100%).
- **Step 5**: Deploy hotfix tag (`v1.0.0-RC1-HOTFIX-00x`).
