# DWIP V1 – TECHNICAL DEBT REGISTER & AUDIT

**Baseline Freeze Status:** Frozen at Tag `v1.0.0-rc2.1`  
**Governance Directive:** All feature requests moved to V1.1 backlog on branch `v1.1-dev`.  

---

## 1. Technical Debt Classification Matrix

### Category A: Immediate (V1.0.x Patches - High Priority)
* **Build Metadata CI Injection:** Automate `version.json` generation inside Cloud Build pipeline triggers rather than manual build steps. (STATUS: **RESOLVED IN RC2.1**).
* **Health API Alignment:** Standardize `/api/health` JSON status code response when fallback cache is active.

### Category B: Short Term (V1.1 Sprint 1)
* **Code Splitting & Bundle Chunking:** Restructure Vite chunking parameters to reduce main JS bundle size from 4 MB to < 1 MB.
* **Database Connection Pooling Tuning:** Fine-tune `mysql2` pool limits for high concurrency during peak morning check-ins.

### Category C: Medium Term (V1.1 Sprint 2-3)
* **Redis Caching Layer:** Introduce Redis cache for Vehicle Passport 360° aggregated dossiers to decrease initial lookup time to `< 50ms`.
* **Automated Regression Suite:** Expand Playwright E2E UI automation coverage for workshop bay assignment workflows.

### Category D: Long Term (V1.2 / Future)
* **Multi-Tenant Database Partitioning:** Partition `service_history` and `invoices` tables by `dealer_id` for multi-location scalability.
