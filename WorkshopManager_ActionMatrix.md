# Workshop Manager Action Matrix

This document defines the Role and Action permissions matrices enforced inside the **Workshop Manager Operational Cockpit**.

## 1. Action Permissions Matrix

| Action | Workshop Manager | Supervisor | GM Service | Dealer Principal |
| :--- | :---: | :---: | :---: | :---: |
| **Assign Technician** | ✔ Allow | ✔ Allow | ✔ Allow | ✖ Blocked |
| **Assign Bay** | ✔ Allow | ✔ Allow | ✔ Allow | ✖ Blocked |
| **Override AI** | ✔ Allow | ✖ Blocked | ✔ Allow | ✖ Blocked |
| **Carry Forward** | ✔ Allow | ✖ Blocked | ✔ Allow | ✖ Blocked |
| **Rework** | ✔ Allow | ✖ Blocked | ✔ Allow | ✖ Blocked |
| **Queue Priority** | ✔ Allow | ✔ Allow | ✔ Allow | ✖ Blocked |
| **Emergency Bypass** | ✔ Allow | ✖ Blocked | ✔ Allow | ✔ Allow |

## 2. Enforcement
- Permitted actions are validated in the UI before trigger callbacks are fired.
- Unauthorized interactions immediately display permission denial notices without triggering API calls.
