# DWIP V1 – DEPLOYMENT COMPARISON MATRIX & CODE DRIFT REPORT

**Audit Date:** 25/07/2026  
**Comparison Target:** Local Certified Workspace vs Production Cloud Run Deployment  

---

## 1. Master Pipeline Comparison Matrix

| Pipeline Stage | Value / Descriptor | Timestamp (IST) | Status / Alignment |
| :--- | :--- | :--- | :--- |
| **Local Source Code** | DWIP V1 Workspace + Offline Resilience Patches | 25/07/2026 17:00 | **Latest Certified Local Baseline** |
| **Latest Git Commit** | `3a1dcd941b8fda890ffae46700f46d4ea597d2c8` | 12/07/2026 09:50 | Clean Working Tree base (`chore: DWIP v1.0.1 UI Polish`) |
| **Docker Build Context** | Excludes `.git` via `.dockerignore` / `.gcloudignore` | N/A | **Causes `Commit: unknown`** |
| **Artifact Registry Image** | `wms-workshop-app@sha256:0715d3e2faaec24a6325...` | 23/07/2026 14:56:42 | Compiled on July 23 |
| **Cloud Run Active Revision** | `wms-workshop-app-00072-2vt` | 23/07/2026 14:58:38 | **Active 100% Live Traffic** |
| **Production UI Footer** | `Version: 1.0.0 GA` • `Commit: unknown` • `Built: 23/07/2026 14:56:42` | 23/07/2026 14:56:42 | Matches Container Image `00072-2vt` |

---

## 2. Codebase Drift Analysis

```
[Local Workspace: 25/07/2026] 
   └── Contains: Fast offline DMS fallback engine (loadTsvFallback), header fixes, DB_OFFLINE circuit breaker.
         ▲
         │ (DRIFT: 2 Days)
         ▼
[Production Cloud Run (00072-2vt): 23/07/2026]
   └── Contains: Baseline RC2 certified code frozen on July 23, 2026.
```

### Mismatch Inventory
1. **Timestamp Mismatch:**  
   Local system time is `25/07/2026`. Production footer displays `23/07/2026 14:56:42`.  
   *Reason:* Production is running Revision `00072-2vt` built on July 23.
2. **Commit Metadata Mismatch:**  
   Local Git HEAD is `3a1dcd941b8`. Production footer displays `unknown`.  
   *Reason:* `.gcloudignore` excludes `.git/`, preventing `execSync('git rev-parse HEAD')` during Cloud Build.
3. **Local Uncommitted Patches vs Production Image:**  
   Local patches for zero-latency TSV fallback (`loadTsvFallback`) developed on July 24–25 are present in the local codebase but not compiled into image `sha256:0715d3e2faaec...`.

---

## 3. Impact & Safety Evaluation

* **Is Production Operational?** **YES.** Revision `00072-2vt` is fully operational, serving live traffic, and connected to Cloud SQL.
* **Is Production Compromised?** **NO.** The code running in production is the frozen, certified RC2 build from July 23.
* **Does `Commit: unknown` affect runtime performance or security?** **NO.** It is a display-only UI metadata artifact inside `AuthScreen.tsx`.
