# DWIP V1 – TECHNICAL DEBT REGISTER

---

## 1. Executive Summary

This register logs all known non-blocking technical debt, refactoring candidates, and architectural optimizations deferred during the Version 1.0 release for inclusion in Version 1.1 or Version 2.0.

---

## 2. Technical Debt Items

| Debt ID | Priority | Description | Impact | Target Release | Estimated Effort | Risk | Status |
|---|---|---|---|---|---|---|---|
| `DEBT-001` | **LOW** | Monolithic `server.ts` routes file size (~8,800 LOC) | Code organization | `v1.1.0` | 2 Days | Low | Deferred |
| `DEBT-002` | **MEDIUM** | In-memory fallback caching when Redis is offline | Memory footprint under heavy load | `v1.1.0` | 1 Day | Low | Deferred |
| `DEBT-003` | **LOW** | Dual schema files (`schema.ts` & `src/engines/vehicle-passport/schema.ts`) | Maintenance overhead | `v1.1.0` | 1 Day | Low | Deferred |
| `DEBT-004` | **LOW** | CSS inline utility styles in legacy UI panels | UI styling consistency | `v1.1.0` | 3 Days | Low | Deferred |

---

## 3. Debt Governance Rule
Technical debt items shall strictly be addressed in `v1.1.0` sprints. No technical debt refactoring is permitted on the stable `v1.0.0` baseline.
