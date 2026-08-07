# DWIP Administrator Guide
**Document ID**: DWIP-M-10 | **Version**: 1.0.0-GA | **Author**: Lead Systems Administrator

## Table of Contents
1. [Installation & Deployment](#1-installation--deployment)
2. [User & Roles Management](#2-user--roles-management)
3. [Backup & Recovery Procedures](#3-backup--recovery-procedures)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/07_CONFIGURATION_GUIDE.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/07_CONFIGURATION_GUIDE.md)
* [docs/master/14_Deployment_Guide.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/14_Deployment_Guide.md)

---

## 1. Installation & Deployment
Deploy using Docker. Run migrations using standard client CLI scripts.

## 2. User & Roles Management
* **Creating Administrators**: Directly insert rows into the `employees` table with `role = 'Service Manager'`.
* **Managing Permissions**: Permissions are verified on Express server startup via `PermissionRepository` mappings.

## 3. Backup & Recovery Procedures
### Recovery Steps
1. Stop the active container.
2. Restore database files from target S3 backup.
3. Restart container:
   ```bash
   docker start dwip-node
   ```
4. Verify server availability endpoints.
