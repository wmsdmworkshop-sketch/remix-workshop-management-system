# Architecture Review - Devanand Workforce 1.1 LTS

## 1. Executive Summary
The Devanand Workshop Intelligence Platform (DWIP) is designed as a modular SPA architecture backed by an Express REST API server.

- **Frontend**: Single Page Application (SPA) leveraging React 19, Vite, and TailwindCSS. It utilizes role-based sidebar and bottom navigation to load specific functional workspaces (Service Advisor, Technician, cashier, etc.).
- **Backend**: Single-file Express.ts server bundled into a CJS file (`server.ts` to `dist/server.cjs`) to streamline Cloud Run and Railway deployment footprints.
- **Database**: Dual storage engine using SQL (MySQL via Drizzle ORM) for transactional durability and an in-memory JSON file backup (`workshop_db.json`) for resiliency.

## 2. Core Modules Architecture
The 1.1 LTS release includes 16 stable modules:
1. **Authentication**: Form-based JWT authentication with role overrides.
2. **Dashboard**: High-visual KPIs tracking daily revenue splits, live active bays, and workforce counts.
3. **Employee Directory**: Roster management with graded certification mapping.
4. **User Management**: Operational permissions governance.
5. **Attendance**: Automated check-in console with biometric and GPS lock stubs.
6. **Gate Entry**: Queue manager for vehicle check-ins.
7. **Job Cards**: The core workflow engine handling allocations, status updates, and splits.
8. **Bay Management**: Monitor tracking active, carry-forward, and rework status per bay.
9. **Vehicle Lookup**: Historical logs retrieval interface.
10. **Warranty / FSB**: Spares warranty claim adjudication.
11. **Cashier**: Billing workflows and split revenue accounting.
12. **Reports**: High-level Power BI embed stubs and revenue charts.
13. **Productivity**: Efficiency calculations per technician.
14. **DMS Import**: DMS data validation and conflict resolver.
15. **Google Integration**: Stubs for external booking sync.
16. **Exception Reports**: System breach logs.

## 3. Evaluation & Scores
- **Overall Architecture Score**: **8.5 / 10**
- **Pros**: Clear modular isolation of frontend components; compile-time feature flags effectively prune DEV-only modules in RC1 builds.
- **Cons**: Monolithic backend server (`server.ts` is 8400+ lines) makes maintenance difficult. It should be refactored into modular controller and route directories in Workforce 1.2.
