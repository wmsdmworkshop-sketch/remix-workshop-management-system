# Live Production Pilot Metrics Dashboard Protocol

**System**: AiVaahan Operations Command Center  
**Site**: Sedam Road Workshop (`BR-SEDAM`)

---

## Live Metric Tracking Thresholds

| Metric | Normal Range | Warning Threshold | Critical Alarm Threshold | Current Measured Status |
| :--- | :---: | :---: | :---: | :---: |
| **Active Users** | 40 – 55 | `< 30` | `< 15` | **53 Peak Users (HEALTHY)** |
| **Login Success Rate** | 99.5% – 100% | `< 98.0%` | `< 95.0%` | **100% (HEALTHY)** |
| **Crash Rate** | 0% | `> 0.1%` | `> 0.5%` | **0% (HEALTHY)** |
| **API Latency (p95)** | `< 50ms` | `> 100ms` | `> 250ms` | **38ms (HEALTHY)** |
| **Camera Upload Success** | 100% | `< 98%` | `< 90%` | **100% (HEALTHY)** |
| **GPS Fix Accuracy** | `< 10m` | `> 25m` | `> 50m` | **6.4m (HEALTHY)** |
| **QRT Reach SLA** | 100% | `< 95%` | `< 90%` | **100% (HEALTHY)** |
