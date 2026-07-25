# DWIP VERSION 1.1 – PRODUCT ROADMAP & DEVELOPMENT PLAN

**Target Branch:** `v1.1-dev`  
**Base Release:** DWIP V1 RC2.1 (`v1.0.0-rc2.1`)  
**Status:** Planning Phase (No implementation in V1 baseline)  

---

## 1. Roadmap Phasing & Feature Modules

```
[Phase 1: Performance & Caching] ──► [Phase 2: Advanced Analytics]
                 │                                │
                 ▼                                ▼
[Phase 3: Customer Mobile Portal] ──► [Phase 4: Multi-Workshop Expansion]
```

### Phase 1: Performance, Caching & Bundle Optimization
* **Goal:** Reduce page load latency and optimize bundle size.
* **Features:** Redis caching for Vehicle Passport, Vite code splitting, PWA offline caching.
* **Business Value:** High | **Complexity:** Medium | **Priority:** P1 | **Target Sprint:** Sprint 1

### Phase 2: Advanced AI Analytics & Fleet Predictive Maintenance
* **Goal:** Provide predictive component wear alerts using Gemini AI analytics.
* **Features:** Gemini AI predictive fleet health, automated service reminders, parts consumption forecasting.
* **Business Value:** High | **Complexity:** High | **Priority:** P1 | **Target Sprint:** Sprint 2

### Phase 3: Customer Portal & Real-time Job Card Tracking
* **Goal:** Provide vehicle owners with live SMS/WhatsApp job card updates and online invoice approval.
* **Features:** WhatsApp Business API integration, web push notifications, digital invoice payment gate.
* **Business Value:** High | **Complexity:** Medium | **Priority:** P2 | **Target Sprint:** Sprint 3

### Phase 4: Multi-Branch & Multi-Tenant Workshop Scaling
* **Goal:** Enable multi-dealership support across regional workshop locations.
* **Features:** Branch-level RBAC isolation, multi-location inventory transfer, consolidated executive dashboard.
* **Business Value:** Very High | **Complexity:** High | **Priority:** P2 | **Target Sprint:** Sprint 4
