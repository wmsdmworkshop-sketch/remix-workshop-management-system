# DWIP V1 – DATABASE CONNECTION & ENDPOINT TRACE REPORT

**Target Application:** Devanand Workshop Intelligence Platform (DWIP V1)  
**Production Service:** `wms-workshop-app` (Cloud Run, `asia-south1`)  
**Revision:** `wms-workshop-app-00073-nkh`  
**Investigation Topic:** Technical explanation of why `/api/vehicle/history` succeeds while `/api/auth/login` fails with `DB_OFFLINE`.  
**Audit Date:** 25/07/2026  

---

## 1. Executive Summary & Diagnostic Finding

The inconsistency between `/api/vehicle/history` (which successfully returns vehicle dossier data) and `/api/auth/login` (which fails with `DB_OFFLINE`) is explained by **different data access architectures**:

1. **Authentication Route (`/api/auth/login`):** Requires live SQL execution over MySQL connection pool `dbPool.query(...)` against `user_access_master` and `users` tables. When the Cloud SQL Unix socket fails, `dbPool` throws `DB_OFFLINE`, causing login to return `HTTP 401 Unauthorized`.
2. **Vehicle Passport Route (`/api/vehicle/history`):** Uses `vehiclePassportFacade.getVehiclePassportAggregate(query)`. This facade reads directly from an **in-memory Golden Source TSV cache** ([src/engines/vehicle-passport/index.ts:537](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/engines/vehicle-passport/index.ts#L537)) pre-loaded at server boot from `docs/master/*.tsv`.
3. **Conclusion:** Vehicle Passport makes **zero MySQL database queries** and is 100% immune to Cloud SQL socket connection failures.

---

## 2. Comprehensive Code & Request Path Trace

### 2.1 Request Path A: `POST /api/auth/login`
```
HTTP POST /api/auth/login
       │
       ▼
app.post("/api/auth/login") [server.ts:1182]
       │
       ▼
dbPool.query("SELECT * FROM user_access_master...") [server.ts:1213]
       │
       ▼
Attempts MySQL Query via Secret Manager Socket (/cloudsql/disco-processor-nqtlh:asia-south1:dwip-mysql-prod)
       │
       ▼
Throws Error: DB_OFFLINE: Fast fallback active [Cloud Run Container Log 13:05:22Z]
       │
       ▼
Catch block logs warning [server.ts:1233] -> `user` object remains `null`
       │
       ▼
if (!user) return res.status(401).json({ error: "Invalid username or password." }) [server.ts:1237]
       │
       ▼
Returns HTTP 401 Unauthorized ("Invalid username or password.")
```

### 2.2 Request Path B: `GET /api/vehicle/history`
```
HTTP GET /api/vehicle/history?query=KA32AC0835
       │
       ▼
app.get("/api/vehicle/history") [server.ts:3181]
       │
       ▼
vehiclePassportFacade.getVehiclePassportAggregate("KA32AC0835") [server.ts:3188]
       │
       ▼
loadTsvFallback("KA32AC0835") [src/engines/vehicle-passport/index.ts:537]
       │
       ▼
Reads from pre-loaded RAM cache (vehicle_master.tsv, service_history.tsv, invoice.tsv)
       │
       ▼
Constructs 360° Vehicle Passport Aggregate object in RAM
       │
       ▼
Returns HTTP 200 OK with passportAggregate JSON payload (Zero MySQL DB queries)
```

---

## 3. Direct Answers to Audit Verification Items

### 1. Does `/api/auth/login` use the same dbPool/connection as `/api/vehicle/history`?
* **No.** `/api/auth/login` executes live SQL queries via `dbPool` ([server.ts:1213](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L1213)). `/api/vehicle/history` delegates to `VehiclePassportFacade` ([src/engines/vehicle-passport/index.ts:537](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/engines/vehicle-passport/index.ts#L537)), which reads from an in-memory Golden Source TSV dataset.

### 2. Are there multiple database pools or connection factories?
* **Yes.** `server.ts` maintains `dbPool` for MySQL queries. `VehiclePassportFacade` maintains a separate, synchronous in-memory TSV reader (`cachedVmAll`, `cachedShAll`, `cachedInvAll`) initialized at boot time ([index.ts:30-64](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/engines/vehicle-passport/index.ts#L30-L64)).

### 3. Does Vehicle Passport use live SQL, cached data, local fallback, or another database?
* **Golden Source TSVs in RAM.** Lines 542-552 of [src/engines/vehicle-passport/index.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/engines/vehicle-passport/index.ts#L542-L552) explicitly state:
  `// Always populate from Golden Source TSVs first`  
  `if (fallbackData && fallbackData.vehicleRow) vRows = [fallbackData.vehicleRow];`  
  `if (fallbackData && fallbackData.shRows) shRows = fallbackData.shRows;`  
  `if (fallbackData && fallbackData.invRows) invRows = fallbackData.invRows;`

### 4. Scope of Cloud SQL socket mismatch impact:
* **Affected Endpoints:** All endpoints requiring live SQL query execution against MySQL (such as `/api/auth/login`, live user management, live database writes).
* **Unaffected Endpoints:** All endpoints backed by Golden Source TSV data or in-memory state (such as `/api/vehicle/history`, `/api/version`, static assets).
