# DWIP Enterprise ERP — Environment Variables Reference

> [!IMPORTANT]
> **Current reality vs. this document.** Live production is the single Cloud Run service
> **`dwip-enterprise`** (project `giga-course-dp497`, region `asia-south1`), and its secrets
> (`DB_PASSWORD`, `JWT_SECRET`, `CUSTOMER_JWT_SECRET`, …) are held as **plaintext Cloud Run
> environment variables on the running service** — the Secret Manager / `--set-secrets` flow
> described below was planned but is not what production uses. Keep that in mind before
> following the commands here. See [DEPLOY_DWIP_ENTERPRISE.md](./DEPLOY_DWIP_ENTERPRISE.md).
> The AI provider is **NVIDIA Nemotron** (`NEMOTRON_API_KEY`); Gemini has been removed.

## Classification

| Variable | Tier | Required | Secret Manager | Cloud Run Env |
|---|---|---|---|---|
| `JWT_SECRET` | **CRITICAL** | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `CUSTOMER_JWT_SECRET` | **CRITICAL** | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `DB_HOST` | **CRITICAL** | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `DB_PASSWORD` | **CRITICAL** | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `DB_DATABASE` | **CRITICAL** | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `DB_USER` | Config | ✅ Required | ✅ Yes | Via `--set-secrets` |
| `NODE_ENV` | Config | ✅ Required | ❌ Not a secret | Plain env var |
| `PORT` | Config | ✅ Required | ❌ Not a secret | Plain env var |
| `DB_PORT` | Config | Optional | ❌ Not a secret | Plain env var |
| `DB_SSL` | Config | Optional | ❌ Not a secret | Plain env var |
| `DB_SOCKET_PATH` | Config | Optional | ✅ If Cloud SQL | Via `--set-secrets` |
| `NEMOTRON_API_KEY` | Feature | Optional | ✅ Yes | NVIDIA Nemotron AI (chat, OCR, transcription) |
| `REDIS_URL` | Feature | Optional | ✅ Yes | Via `--set-secrets` |
| `ADDITIONAL_CORS_ORIGINS` | Config | Optional | ❌ Not a secret | Plain env var |
| `TRUST_PROXY` | Config | Optional | ❌ Not a secret | Plain env var |

---

## Variable Descriptions

### JWT_SECRET
- **Purpose**: Signs and verifies employee/admin JWT tokens (HS256)
- **Format**: 64-character random hex string
- **Generate**: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- **Rotation**: Rotating this secret logs out ALL sessions immediately
- **Secret Name in GCP**: `DWIP_JWT_SECRET`

### CUSTOMER_JWT_SECRET
- **Purpose**: Signs and verifies customer portal JWT tokens
- **Format**: 64-character random hex string (must differ from JWT_SECRET)
- **Generate**: Same as above, generate a separate value
- **Secret Name in GCP**: `DWIP_CUSTOMER_JWT_SECRET`

### DB_HOST
- **Purpose**: MySQL database hostname
- **Value**: Google Cloud SQL instance host (TCP) — supplied via the `DWIP_DB_HOST` secret
- **RC2 Value**: Cloud SQL private IP via Unix socket path
- **Secret Name in GCP**: `DWIP_DB_HOST`

### DB_PASSWORD
- **Purpose**: MySQL user password
- **Security**: Never log, never expose in URLs
- **Secret Name in GCP**: `DWIP_DB_PASSWORD`

### DB_DATABASE
- **Purpose**: MySQL database name
- **Default**: `railway` — legacy schema name retained from the app's original Railway.app hosting (see `src/config/env.ts`)
- **Secret Name in GCP**: `DWIP_DB_DATABASE`

### DB_USER
- **Purpose**: MySQL username
- **Default**: `root`
- **Secret Name in GCP**: `DWIP_DB_USER`

### DB_PORT
- **Purpose**: MySQL port
- **Default**: `3306`
- **Not a secret** — plain Cloud Run env var

### DB_SSL
- **Purpose**: Enable SSL/TLS on MySQL connection
- **Values**: `true` | `false`
- **Pilot**: `true` (Cloud SQL over TCP uses SSL)
- **RC2**: `false` (Cloud SQL private socket bypasses SSL)

### DB_SOCKET_PATH
- **Purpose**: Unix socket path for Cloud SQL (RC2 only)
- **Example**: `/cloudsql/PROJECT_ID:REGION:INSTANCE_ID`
- **Pilot**: Not set — Cloud SQL is reached over TCP (`DB_HOST`/`DB_PORT`), not a Unix socket

### NODE_ENV
- **Purpose**: Node.js environment mode
- **Production Value**: `production`
- **Effect**: Activates HSTS header, disables verbose errors

### PORT
- **Purpose**: TCP port the Express server binds to
- **Value**: `3001` (Cloud Run routes 443 → this port)

### NEMOTRON_API_KEY
- **Purpose**: Powers every AI feature — Workshop Assistant, CXO AI, OCR second opinion, transcription
- **Format**: NVIDIA key, must start with `nvapi-` — anything else is refused rather than sent upstream
- **Optional**: If absent, AI features report "AI is not configured" instead of failing obscurely
- **Secret Name in GCP**: `DWIP_NEMOTRON_API_KEY`
- **Note**: A placeholder is not a key. `resolveKey()` in `src/config/nemotron.ts` rejects
  `your_*`, `<`, `xxx`, `placeholder`, `changeme` and `todo` prefixes.

### REDIS_URL
- **Purpose**: Redis connection for customer portal OTP caching and rate limiting
- **Optional**: If absent, falls back to in-memory rate limiting
- **Format**: `redis://HOST:PORT` or `rediss://HOST:PORT` (TLS)

### ADDITIONAL_CORS_ORIGINS
- **Purpose**: Allow additional origins beyond the default Cloud Run URL
- **Format**: Comma-separated list, e.g., `https://portal.devanand.in,https://app.devanand.in`
- **Default CORS Origin**: the production origin `https://devanand.aivaahan.com` (set in `server.ts`)

### TRUST_PROXY
- **Purpose**: Tell Express to trust `X-Forwarded-*` headers from Cloud Run's load balancer
- **Value**: `1`
- **Required**: Always set to `1` on Cloud Run

---

## Secret Manager Secret Names (GCP)

| Secret Manager Name | Maps to ENV VAR |
|---|---|
| `DWIP_JWT_SECRET` | `JWT_SECRET` |
| `DWIP_CUSTOMER_JWT_SECRET` | `CUSTOMER_JWT_SECRET` |
| `DWIP_DB_HOST` | `DB_HOST` |
| `DWIP_DB_USER` | `DB_USER` |
| `DWIP_DB_PASSWORD` | `DB_PASSWORD` |
| `DWIP_DB_DATABASE` | `DB_DATABASE` |
| `DWIP_NEMOTRON_API_KEY` | `NEMOTRON_API_KEY` |

---

## Cloud Run `--set-secrets` Mapping

```bash
--set-secrets=\
  JWT_SECRET=DWIP_JWT_SECRET:latest,\
  CUSTOMER_JWT_SECRET=DWIP_CUSTOMER_JWT_SECRET:latest,\
  DB_HOST=DWIP_DB_HOST:latest,\
  DB_USER=DWIP_DB_USER:latest,\
  DB_PASSWORD=DWIP_DB_PASSWORD:latest,\
  DB_DATABASE=DWIP_DB_DATABASE:latest,\
  NEMOTRON_API_KEY=DWIP_NEMOTRON_API_KEY:latest
```

---

## Local Development (.env)

```env
# Development — DO NOT COMMIT
JWT_SECRET=local_dev_jwt_secret_not_for_production_32chars_min
CUSTOMER_JWT_SECRET=local_dev_customer_jwt_secret_32chars_min

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootsecurepassword
DB_DATABASE=railway

NODE_ENV=development
PORT=3001

NEMOTRON_API_KEY=your_nvidia_nvapi_key_here
ADDITIONAL_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

> [!CAUTION]
> **NEVER** commit `.env` files to Git.
> **NEVER** bake secrets into Docker images.
> **ALWAYS** rotate secrets after any suspected exposure.
> **ALWAYS** use `--set-secrets` on Cloud Run, never `--set-env-vars` for sensitive values.
