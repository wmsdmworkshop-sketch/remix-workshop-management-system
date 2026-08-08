# DWIP V1 – LESSONS LEARNED REPORT

---

## 1. Major Architectural Decisions

1. **Direct DMS Table Alignment over Synthetic Schema Mapping:**
   * *Finding:* Querying `vehicle_master`, `service_history`, and `invoices` directly eliminated intermediate data loss and achieved 100% census reconciliation.
2. **Smart Encoding & BOM Stripping:**
   * *Finding:* Native DMS export files generated in Windows UTF-16LE encoding require dynamic BOM stripping (`^\uFEFF`) to prevent parsing syntax errors.
3. **Regex Currency Cleaning:**
   * *Finding:* Raw DMS currency strings (`Rs. 12,345.00`) require automated regex cleaning prior to numeric database insertion to prevent type-casting drops.

---

## 2. Best Practices Established

* **Empirical Data Certification:** Always validate row retention against raw source files before declaring data pipelines ready.
* **Strict Code Baseline Freeze:** Freezing feature development prior to pilot launch ensures zero regression risk.
