# AiVaahan Enterprise Version 1.1 Product Backlog

**Baseline Production Version**: `v1.0.0-RC1-HOTFIX-001` (Live at Sedam Road & Basavakalyan)  
**Target Version**: `v1.1.0`  
**Origin Principle**: Every item is derived strictly from verified production feedback, performance telemetry, and operational KPIs.

---

## 1. Backlog Item Priority Matrix

### Category P0 — Critical (Production Performance & Core Operations)
- **BL-P0-001: Mobile Offline Retry Queue Optimization**:
  - *Origin*: Production Observation (Sedam Road weak cellular coverage in underground bay 4).
  - *Description*: Optimize `SyncOrchestrator` FIFO offline queue to auto-retry chunked inspection photo uploads without manual page refresh.
- **BL-P0-002: ANPR High-Speed Gate Intake Latency Reduction**:
  - *Origin*: Operational KPI (Gate-in queue peak between 08:30 AM – 09:30 AM).
  - *Description*: Reduce initial ANPR license plate parsing latency from 850ms to < 350ms.

### Category P1 — High (User Usability & Productivity Differentiators)
- **BL-P1-001: One-Tap QRT Driver Arrival Confirmation**:
  - *Origin*: User Feedback (`FB-002` from QRT Driver team).
  - *Description*: Add prominent one-tap "Arrived at Location" action button on technician mobile breakdown screen.
- **BL-P1-002: Technician Night-Shift UI Theme**:
  - *Origin*: User Feedback (`FB-001` from Service Advisors on night shift 22:00 – 06:00).
  - *Description*: Auto-apply high-contrast dark theme during night QRT reach window.

### Category P2 — Medium (Multi-Branch Analytics & Reporting Enhancements)
- **BL-P2-001: Multi-Branch Comparative TAT Breakdown Widget**:
  - *Origin*: Production Observation (GM Service daily review across `BR-SEDAM` and `BR-BASAVAKALYAN`).
  - *Description*: Add side-by-side turn-around-time comparison widget on Executive Dashboard.

### Category P3 — Future (Multi-OEM Ecosystem Expansion)
- **BL-P3-001: Integration Gateway Adapters for Additional OEMs**:
  - *Origin*: Strategic Commercial Roadmap (Customer #2 Onboarding).
  - *Description*: Implement `AshokLeylandProviderAdapter` and `EicherProviderAdapter` using frozen `DWIP-INT-ARCH-001 v1.0` interfaces.
