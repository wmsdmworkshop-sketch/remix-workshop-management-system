# DWIP V1 Role Permissions Matrix

This document defines the interface modules and access levels granted to each user role within the Workforce Management System.

---

## 1. System Roles & Sidebar Mappings

| Role | Permitted Tabs / Modules | Purpose |
|:---|:---|:---|
| **developer** | Dashboard, Vehicle History, Breakdowns, Exceptions, Gate Entry, Parts & Warranty, Billing & Exit, Multimedia Query, Job Cards, Productivity, Bay Monitor, Employee Directory, CPSC Certification, Attendance, DMS Import, User Management, Google Workspace, Gemini Copilot | Root administrative control with full system access. |
| **admin** | Dashboard, Vehicle History, Breakdowns, Exceptions, Gate Entry, Parts & Warranty, Billing & Exit, Multimedia Query, Job Cards, Productivity, Bay Monitor, Employee Directory, CPSC Certification, Attendance, DMS Import, User Management, Google Workspace, Gemini Copilot | Workshop manager and supervisor administrator. |
| **dealer_principal** | Dashboard, Vehicle History, Job Cards, Productivity, Employee Directory, CPSC Certification, Attendance, DMS Import, User Management, Revenue Split, Gemini Copilot | Executive dashboard for workshop financials and productivity oversight. |
| **workshop_manager** | Dashboard, Vehicle History, Gate Entry, Parts & Warranty, Billing & Exit, Job Cards, Productivity, Bay Monitor, Employee Directory, CPSC Certification, Attendance, DMS Import, Revenue Split | Operations manager overseeing workflow, staffing, and revenue splits. |
| **service_manager** | Dashboard, Vehicle History, Gate Entry, Parts & Warranty, Billing & Exit, Job Cards, Productivity, Bay Monitor, Employee Directory, CPSC Certification, Attendance, DMS Import | Technical manager controlling service workflows and staff scheduling. |
| **floor_incharge** / **floor_supervisor** | Dashboard, Vehicle History, Job Cards, Productivity, Bay Monitor, Employee Directory, CPSC Certification, Attendance | Floor leader tracking bay allocations, TAT times, and certifications. |
| **supervisor** | Dashboard, Vehicle History, Gate Entry, Parts & Warranty, Job Cards, Productivity, Bay Monitor, Employee Directory, DMS Import | Service line supervisor coordinating technician assignments and parts. |
| **service_advisor** | Dashboard, Vehicle History, Gate Entry, Job Cards, Bay Monitor | Primary customer interface registering vehicles and opening job cards. |
| **warranty_advisor** | Dashboard, Parts & Warranty, Job Cards | Specialist reviewing parts claims and FSB circular validations. |
| **spares_manager** / **tools_incharge** | Dashboard, Parts & Warranty | Inventory controller matching replacement parts and workshop toolkits. |
| **billing** / **cashier** | Dashboard, Billing & Exit, Revenue Split, DMS Import (billing only) | Financial cashiers managing billing, payments, and exit pass emissions. |
| **accounts** | Dashboard, Billing & Exit, DMS Import, Revenue Split | Accountant tracking revenues and verifying DMS spreadsheet logs. |
| **reception** / **receptionist** | Dashboard, Vehicle History, Gate Entry, Job Cards, Bay Monitor | Front desk registering inward vehicle information. |
| **gate_personnel** / **security_agent** | Gate Entry, Bay Monitor | Gate security logging check-in logs and tracking active bay states. |
| **technician** / **breakdown** | My Jobs, My KPI, My Profile, Attendance | Workshop floor operators tracking their assigned tasks, KPIs, and check-in logs. |

---

## 2. Dynamic Hierarchy Mappings
Role checks are verified dynamically in the React client and Express API routes via tier checking:
- **`isAdmin`**: True for `admin`, `developer`.
- **`isManager`**: True for `admin`, `developer`, `service_manager`, `workshop_manager`.
- **`isDeveloper`**: True only for `developer`.
- **`canApprove`**: True for roles allowed to approve overtime claims (`workshop_manager`, `service_manager`, `admin`, `developer`).
- **`isSelfService`**: True for technicians and breakdown staff, rendering simplified mobile/kiosk check-in screens.
