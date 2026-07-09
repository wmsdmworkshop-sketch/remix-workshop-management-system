# DWIP V1 Environment Variables Catalog

This document lists the environment variables required by the application. These keys must be declared on the host provider (such as Google Cloud Run or Railway settings) or in a local `.env` file during development.

---

## 1. Required Variables Matrix

| Key Name | Sample Value / Format | Purpose | Required in Prod |
|:---|:---|:---|:---|
| **`JWT_SECRET`** | `d4e5f6...` (64-character hex string) | Cryptographic signature key to sign and verify employee dashboard JWT sessions. | **Yes** |
| **`CUSTOMER_JWT_SECRET`** | `a1b2c3...` (64-character hex string) | Cryptographic signature key to sign and verify customer portal JWT sessions. | **Yes** |
| **`DB_HOST`** | `35.200.150.167` or `127.0.0.1` | IP address or hostname of the MySQL Cloud SQL instance. | **Yes** |
| **`DB_PORT`** | `3306` | MySQL port (defaults to `3306` if omitted). | No |
| **`DB_USER`** | `root` | Database username. | **Yes** |
| **`DB_PASSWORD`** | `WmsSecureMySQL2026!` | Password for the database user. | **Yes** |
| **`DB_DATABASE`** | `railway` | The primary MySQL database name. | **Yes** |
| **`GEMINI_API_KEY`** | `AIzaSy...` | API key from Google AI Studio to run Gemini Copilot and AI Warranty validations. | **Yes** |

---

## 2. Server Validation & Safety Actions
During backend boot, `server.ts` checks for the presence of these required keys.
- **Boot Validation**: If any of the variables (`JWT_SECRET`, `CUSTOMER_JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`) are missing, the server prints a diagnostic error message and halts the Node process immediately with code `1`.
- **Credential Leak Safety**: To prevent security breaches, the system's log handlers strip or redact all references to env secret values, ensuring keys are never leaked to GCP Cloud Logging or system console logs.
