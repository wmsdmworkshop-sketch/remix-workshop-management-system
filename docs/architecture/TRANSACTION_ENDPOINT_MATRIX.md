# DWIP Enterprise ERP - Transaction Endpoint Matrix
**Sprint**: RC1-TXN-FORENSICS-001  
**Timestamp**: 2026-07-16  

This report provides the evaluation of each business transaction endpoint in the workshop lifecycle based on our UAT runs and forensics.

---

## Transaction Endpoint Matrix

| # | Endpoint | Registered? | Reachable? | Auth OK? | Business Validation? | DB Write? | Sync Executed? | Response Correct? | Next Unlocked? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **Gate Entry** (`POST /api/job-cards`) | **YES** | **YES** | **YES** | **YES** | **YES** | **NO** [1] | **YES** | **YES** |
| 2 | **Job Card Creation** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 3 | **Inspection** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 4 | **Estimate** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 5 | **Estimate Approval** (`POST /api/job-cards/:id/estimate-approval`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 6 | **Bay Allocation** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **NO** [3] | **YES** | **YES** | **YES** | **YES** |
| 7 | **Technician Assignment** (`POST /api/job-cards/:id/assign`) | **YES** | **YES** | **YES** | **NO** [4] | **YES** | **YES** | **YES** | **YES** |
| 8 | **Revenue Split Calculation** (`POST /api/job-cards/:id/revenue`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 9 | **Labour Start** (`POST /api/job-cards/:id/start-repair`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 10| **Parts Allocation** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 11| **QC Check** (`POST /api/job-cards/:id/qc-check`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 12| **Manager Approval** (`POST /api/job-cards/:id/manager-approve`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 13| **Billing** (`POST /api/job-cards/:id/bill`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 14| **Cashier Pre-Invoice** (`POST /api/job-cards/:id/pre-invoice`) | **YES** | **NO** [2] | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** |
| 15| **Cashier Settlement** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 16| **Gate Pass** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| 17| **Vehicle Exit** (`PUT /api/job-cards/:id`) | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |

---

## Matrix Footnotes & Remarks

*   **[1] Sync Executed (Gate Entry)**: 
    On creation, the new job card is written to the local cache and saved as JSON. It is **not** synced to the remote database immediately. Syncing only occurs when a subsequent `PUT` request invokes the database sync.
*   **[2] Reachable (Blocked by Vite)**: 
    These routes return `404 Not Found` with an empty response body. Because they are defined in `server.ts` after the Vite Dev Server middleware, Vite intercepts and drops the request in development mode.
*   **[3] Business Validation (Bay Allocation)**: 
    The route accepts and persists invalid or non-existent bay IDs (e.g. `bay_id: 99999`) and returns `200 OK`. There is no validation to verify if the bay exists in the master table.
*   **[4] Business Validation (Technician Assignment)**: 
    The route does not validate body keys. Passing missing keys (like `technicians` instead of `allocations`) leads to unhandled runtime type errors (`TypeError: Cannot read properties of undefined (reading 'map')`) and results in an HTTP 500 server crash.
