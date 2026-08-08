# DWIP V1 – SECURITY BASELINE SPECIFICATION

**Security Compliance Target:** DWIP Enterprise Security Architecture  
**Active Production Revision:** `wms-workshop-app-00073-nkh`  

---

## 1. Authentication & JWT Controls

* **Signature Algorithm:** HMAC-SHA256 (`HS256`).
* **Secret Key Storage:** Managed in GCP Secret Manager (`DWIP_JWT_SECRET`). Zero plaintext secrets in source code or `.env`.
* **Token Expiration:** JWT access tokens expire after 24 hours. Refresh token rotation enforced.
* **Global API Authentication Gate:** All `/api/*` endpoints require valid JWT authorization, except explicit public whitelist (`/api/health`, `/api/version`, `/api/auth/login`).

---

## 2. Infrastructure & Network Security

* **Enforced Transport Security:** All Cloud Run ingress traffic requires HTTPS (`TLS 1.3`). HTTP requests automatically redirected.
* **Least Privilege IAM Service Account:** Cloud Run executes under dedicated service account `473233046183-compute@developer.gserviceaccount.com` with scoped roles (`Cloud SQL Client`, `Secret Manager Secret Accessor`).
* **Cloud SQL Socket Encryption:** Database traffic routed over encrypted Unix Domain Socket (`/cloudsql/...`). Direct public port 3306 exposure disabled.
