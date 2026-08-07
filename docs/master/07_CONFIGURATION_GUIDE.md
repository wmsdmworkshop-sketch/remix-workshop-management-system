# DWIP Configuration Guide
**Document ID**: DWIP-M-07 | **Version**: 1.0.0-GA | **Author**: Lead DevOps Engineer

## Table of Contents
1. [Environment Variables Reference](#1-environment-variables-reference)
2. [Runtime Configurations & Feature Flags](#2-runtime-configurations--feature-flags)
3. [Configuration Registry Registry](#3-configuration-registry-registry)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/14_Deployment_Guide.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/14_Deployment_Guide.md)

---

## 1. Environment Variables Reference
* **PORT**: Server listener port (defaults to `3000`).
* **JWT_SECRET**: Key for signing employee JWT tokens.
* **CUSTOMER_JWT_SECRET**: Key for signing customer tokens.
* **GEMINI_API_KEY**: Access key used by Google GenAI to handle voice assistant requests.
* **DB_HOST, DB_PORT, DB_USER, DB_PASSWORD**: Connection string for remote MySQL/PostgreSQL instances.
* **NODE_ENV**: `development` or `production`.

## 2. Runtime Configurations & Feature Flags
Located in `src/enterprise/configuration/feature-flags.ts`:
* **enableRealTimeTat**: Enforces EKG real-time turnaround time triggers.
* **enableAiScheduling**: Toggles automatic predictive queue prioritization.

## 3. Configuration Registry Registry
Standard configurations are bootstrapped from `runtime-overrides.ts` during server startup to enable localized workshop variations.
