# DWIP Enterprise ERP - RC1 Live UAT Acceptance Report
**Sprint**: RC1-LIVE-UAT-002  
**Timestamp**: 2026-07-16  
**Final Verdict**: **FAIL**

This report documents the live User Acceptance Testing (UAT) results of a real vehicle processed through the workshop lifecycle.

---

## 1. UAT Execution Summary
*   **Target Vehicle**: Toyota Corolla (VRN: `KA51MC1234`)
*   **Execution Mode**: Live API requests on port 3001
*   **Database Config**: GCP Cloud SQL (wms-mysql-db)
*   **Seeded Users**: `admin` / `Admin@DWIP2026`
*   **Failing Step**: Step 5 (Customer Approval)
*   **Unreachable Stages**: Steps 6 through 16 could not be completed due to the block at Step 5.

---

## 2. Detailed Step Trace

| Step Index | Step Name | API Method & Path | HTTP Status | Verdict | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Gate Entry** | `POST /api/job-cards` | 200 OK | **PASS** | Successfully created Job Card `JC6569` (Job ID `6569`). |
| 2 | **Job Card Creation** | `PUT /api/job-cards/6569` | 200 OK | **PASS** | Updated description and remarks. Syncs to database format. |
| 3 | **Inspection** | `PUT /api/job-cards/6569` | 200 OK | **PASS** | Merged digital checklist comments in Remarks. |
| 4 | **Estimate** | `PUT /api/job-cards/6569` | 200 OK | **PASS** | Builder quotes set: Spares 3500, Labor 1500. |
| 5 | **Customer Approval** | `POST /api/job-cards/6569/estimate-approval` | 404 Not Found | **FAIL** | Endpoint unreachable. Returns empty body. |

---

## 3. Failure Root Cause Analysis
The UAT runner encountered an HTTP 404 (Not Found) with an empty response body on `POST /api/job-cards/6569/estimate-approval`.

### The Express Route Ordering Bug
Inside [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts):
1.  Vite Dev Server middleware is mounted in the middle of the file (lines 6631–6636):
    ```typescript
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
    ```
2.  In development mode, `appType: "spa"` configures Vite to intercept and route all unmatched requests, terminating them with a `404 Not Found` or serving `index.html`.
3.  The estimate-approval endpoint (and several other critical endpoints like `/start-repair`, `/bill`, `/qc-check`, `/manager-approve`, `/pre-invoice`) are registered **after** line 6636 (e.g. estimate-approval is at line 7766).
4.  Express executes route handlers in the order they are registered. Because Vite dev server is registered first, it intercepts the request and returns 404, preventing it from reaching the route handler in `server.ts`.

---

## 4. Fix Recommendations
To restore live API connectivity and pass the UAT, the route registration sequence must be re-ordered:
*   Move the **Vite Middleware Setup** block (lines 6630–6643) to the very bottom of the route registration section in `server.ts`, immediately before the `app.listen()` call. This ensures all API routes are registered on the Express instance first.
