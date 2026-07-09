# DWIP V1 Route Mappings

This document outlines the routing architecture of the Workforce Management System, including the React tab-based UI routes and the Express backend API routes.

---

## 1. React Client Tab-Based Routing

The frontend uses state-based conditional routing (`activeTab` state in `App.tsx`) to switch panels without standard URL page reloads:

| Sidebar Tab ID | Active Panel Component | Eligible Roles |
|:---|:---|:---|
| `dashboard` | `<Dashboard />` | All except security/gate/technicians |
| `vehicle-lookup`| `<VehicleLookup />` | Admin, Developer, Principal, Managers, Supervisors, SA, Reception |
| `breakdown` | `<BreakdownManagement />` | Admin, Developer |
| `exception-report` | `<ExceptionReport />` | Admin, Developer |
| `gate-entry` | `<GateEntryManager />` | Admin, Developer, Managers, SA, Reception, Gate, Security |
| `parts-warranty`| `<PartsWarrantyManager />` | Admin, Developer, Managers, Supervisors, Warranty, Spares, Tools |
| `billing-exit` | `<BillingExit />` | Admin, Developer, Managers, Billing, Cashier, Accounts |
| `query` | `<QuerySearch />` | Admin, Developer |
| `jobs` | `<JobCardManager />` | Admin, Developer, Principal, Managers, Supervisors, SA, Reception, Warranty |
| `productivity` | `<ProductivityDashboard />` | Admin, Developer, Principal, Managers, Supervisors |
| `bay-tat` | `<ActiveBayTatMonitor />` | Admin, Developer, Managers, Supervisors, SA, Reception, Gate, Security |
| `employees` | `<EmployeeDirectory />` | Admin, Developer, Principal, Managers, Supervisors |
| `certification` | `<CPSC_CertificationPanel />` | Admin, Developer, Principal, Managers, Supervisors |
| `attendance` | `<AttendanceShiftLog />` | Admin, Developer, Principal, Managers, Supervisors, Technicians, Breakdown |
| `dms-import` | `<DmsImporter />` | Admin, Developer, Principal, Managers, Supervisors, Billing, Accounts |
| `users` | `<UserManagement />` | Admin, Developer, Principal |
| `google` | `<GoogleIntegration />` | Admin, Developer |
| `assistant` | `<GeminiAssistant />` | Admin, Developer, Principal |
| `revenue` | `<RevenueDashboard />` | Developer, Principal, Managers, Cashier, Billing, Accounts |
| `tech-jobs` | `<TechnicianJobsPanel />` | Technicians, Breakdown |
| `tech-kpi` | `<TechnicianKpiPanel />` | Technicians, Breakdown |
| `tech-profile` | `<TechnicianProfilePanel />`| Technicians, Breakdown (plus all profiles dynamically) |

---

## 2. Express Backend API Routes (`server.ts`)

All endpoints are hosted under the `/api/` path. The `authenticateToken` middleware acts as a global gatekeeper, restricting access unless the endpoint is public or explicitly whitelisted.

### Public Whitelist (Authentication Not Required)
- `GET /api/health` — Service container health verification.
- `POST /api/auth/login` — Operator authentication / OTP code challenge start.
- `POST /api/auth/verify-otp` — Completes MFA and signs the JWT access token.
- `POST /api/auth/reset-password-request` — Starts password recovery flow.
- `POST /api/auth/reset-password-verify` — Commits new password.
- `POST /api/db/reload` — Resets mock data.

### Protected Endpoints (JWT Token Required)
- `GET /api/auth/me` — Retrieves authenticated user context.
- `GET /api/users` — Lists user login records.
- `POST /api/users` — Registers new operator logins.
- `PUT /api/users/:user_id` — Updates user logins and roles.
- `GET /api/my-profile` — Returns current logged-in employee detail.
- `POST /api/my-profile` — Submits profile update request.
- `GET /api/my-profile/settings` — Returns custom configurations.
- `PUT /api/my-profile/settings` — Updates settings.
- `GET /api/employees` — Lists workshop employees.
- `POST /api/employees` — Creates new employee profiles.
- `PUT /api/employees/:id` — Edits employee profile details.
- `DELETE /api/employees/:id` — Removes employees.
- `POST /api/employees/bulk` — Imports employees from CSV dataset.
- `GET /api/workforce/attendance` — Lists attendance records by date.
- `POST /api/workforce/attendance` — Mark check-in/out.
- `GET /api/workforce/attendance/today` — Renders dashboard attendance statistics.
- `GET /api/bays` — Lists workshop bays.
- `POST /api/bays` — Registers new bays.
- `PUT /api/bays/:id` — Edits bay status.
- `DELETE /api/bays/:id` — Removes bays.
- `GET /api/sr-types` — Lists service types.
- `POST /api/sr-types` — Creates service types.
- `PUT /api/sr-types/:id` — Edits service types.
- `DELETE /api/sr-types/:id` — Removes service types.
- `GET /api/vehicle/history` — Looks up service timelines from history database.
- `GET /api/job-cards` — Retrieves open workshop job cards.
- `POST /api/job-cards` — Creates new job card.
- `PUT /api/job-cards/:id` — Updates job card details.
- `DELETE /api/job-cards/:id` — Wipes job card.
- `GET /api/revenue-splits` — Lists combinatorial splits configurations.
- `POST /api/revenue-splits` — Creates splits.
- `PUT /api/revenue-splits/:id` — Edits splits.
- `DELETE /api/revenue-splits/:id` — Removes splits.
- `GET /api/fsb` — Audits FSB statuses.
- `POST /api/fsb` — Updates FSB records.
- `GET /api/warranty/circulars` — Lists references guidelines.
- `POST /api/warranty/circulars` — Uploads parts circulars.
- `POST /api/warranty/validate` — Consults AI warranty compliance processor.
- `GET /api/overtime/claims` — Lists overtime claims.
- `POST /api/overtime/claims` — Submits new overtime request.
- `POST /api/overtime/claims/:id/approve` — Process claim decisions (Level 1/2).
- `POST /api/overtime/claims/:id/reject` — Rejects overtime requests.
