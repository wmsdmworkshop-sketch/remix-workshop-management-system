# DWIP V1 - System & Architecture Overview

Welcome to the **Workforce Management System (WMS) V1** architecture overview document. This guide serves as a manual explaining the structural modules, data flows, and configuration parameters of the WMS application.

---

## 1. System Architecture Diagram

```
                 +---------------------------+
                 |  Vite React Client App    |
                 |  (Dashboard & Operations) |
                 +-------------+-------------+
                               |
                        HTTPS (REST API)
                               |
                 +-------------v-------------+
                 |    Node Express Server    |  <---> [ Gemini AI / OCR API ]
                 |   (Business Logic Router) |
                 +-------------+-------------+
                               |
                          MySQL Protocol
                               |
                 +-------------v-------------+
                 |     Cloud SQL Database    |
                 |   (WMS Relational Store)  |
                 +---------------------------+
```

---

## 2. Core Sub-Systems

### 1. Authentication & Security
- **JWT Session Verification**: Access to protected routes requires verification of a signed JSON Web Token (JWT). Tokens are stored in the client's `localStorage` as `wms_token`.
- **OTP Verification Flow**: When logging in, the server evaluates credentials and sends a 6-digit OTP SMS verification code. Session tokens are generated only after verifying the correct OTP code against the database `otp_hash`.
- **Operator Permissions Matrix**: Access level is restricted according to roles. The client maps authorized screens using `ROLE_TABS` inside `src/App.tsx`.

### 2. Operations Workflows
- **Gate Entry & Bays**: Gate keepers log inbound vehicles and assign them to idle bays. Time-in-service (TAT) monitoring is managed via [ActiveBayTatMonitor.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/ActiveBayTatMonitor.tsx).
- **Job Cards Lifecycle**: Operations managers coordinate vehicle repairs and technican maps. Carry-forward delay codes (L1-L5) and rework histories are audited inside the job card log.
- **Revenue Split**: Splitting of parts and labor values among assigned technicians is handled dynamically according to combination configurations in the `revenue_splits` config table.

### 3. Attendance & Overtime
- **Self-Service Portal**: Operators log attendance shifts using GPS geofence checks and biometric face validations.
- **Inline Consolidation**: The attendance daily logs, personal overtime claims, and supervisor approvals have been merged into a single dashboard under the [AttendanceShiftLog.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/AttendanceShiftLog.tsx) sub-tabs.

### 4. AI & Reference Circulars
- **AI circular audit**: The AI Warranty Validator evaluates claims against references circular files stored in the database.
- **Invoice OCR**: Parses uploaded PDF or JPEG invoices using OCR processors to automatically extract parts and labor pricing.

---

## 3. Deployment Mappings
The project is configured for deployment to **Google Cloud Run** using containerization:
- **Build Step**: The [Dockerfile](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/Dockerfile) compiles the Vite static resources and packages the Express backend using `esbuild`.
- **Execution**: The server boots from `dist/server.cjs` and exposes port `3001` (mapped dynamically in production environments).
- **Data Persistence**: Production stores state in the Cloud SQL MySQL instance (`giga-course-dp497`), while local development defaults to the `workshop_db.json` memory backup file.
