# DWIP Configuration Guide
**Environment Configurations & Variables**

## 1. Environment Variable Catalog
The DWIP platform resolves environment variables via `src/config/env.ts`:
* **JWT_SECRET**: Secrets key used to sign and verify employee access tokens.
* **CUSTOMER_JWT_SECRET**: Separate secrets key for customer portal validations.
* **GEMINI_API_KEY**: Access key used by Google GenAI to handle voice assistant requests.
* **DB_HOST, DB_PORT, DB_USER, DB_PASSWORD**: Connection string for remote PostgreSQL/MySQL pools.

## 2. Default Configuration Overrides
* Local testing default configuration is loaded automatically from the `.env` file at root.
* Local development defaults to `workshop_db.json` file-backed storage if no database pools are set.
