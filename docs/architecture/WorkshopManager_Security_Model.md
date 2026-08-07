# Workshop Manager Security Model

This document outlines the role-based access control (RBAC) rules and security boundaries for the Workshop Manager Cockpit.

## 1. Role Authorization Matrix

| Tab / Action | Admin | Workshop Manager | Floor Supervisor | Service Advisor | Technician |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard** | Yes | Yes | Yes | Read-Only | Read-Only |
| **Allocate Bays** | Yes | Yes | Yes | Read-Only | No |
| **Assign Techs** | Yes | Yes | Yes | Read-Only | No |
| **AI Override** | Yes | Yes | No | No | No |
| **Carry Forward Approve** | Yes | Yes | No | No | No |
| **Emergency Bypass** | Yes | Yes | No | No | No |

## 2. Emergency Bypass Protocol
In case of complete network dropouts or system lockups:
- The Workshop Manager or Admin can toggle an "Emergency Offline Override" mode.
- This mode allows manual transitions on the frontend to continue workshop flow, caching operations to `localStorage` until the server goes back online.

## 3. Auditing Specifications
All write actions (reallocating resources, resolving carry forwards, overriding AI recommendations) require:
- Storing the operator's ID and role in the database.
- Logging a serialized payload of changes to `tbl_audit_trail`.
