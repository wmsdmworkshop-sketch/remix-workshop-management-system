# DWIP V1 – BROWSER VS. RUNTIME LOGIN TRACE & DISCREPANCY ANALYSIS

**Target Service Name:** `wms-workshop-app`  
**Production GCP Project:** `disco-processor-nqtlh` (`473233046183`)  
**Active Production Revision:** `wms-workshop-app-00073-nkh`  
**Report Date:** 25/07/2026  

---

## 1. Executive Summary

This report documents the exact investigation and empirical comparison between the **Chrome Browser POST request** and the **Runtime API request** for the endpoint `POST /api/auth/login`.

* **Runtime Test Outcome:** `POST /api/auth/login` → `HTTP 200 OK` → JWT Returned.
* **Chrome Browser Outcome:** Chrome UI displays `"Invalid username or password."` (`HTTP 401 Unauthorized`).
* **Root Cause:** The Chrome browser sends its request to the live production Cloud Run host (`wms-workshop-app-473233046183.asia-south1.run.app` / Project `473233046183`), served by revision `wms-workshop-app-00073-nkh`. That Cloud Run service connects to the `remix_wms` database where the `admin` password hash does not evaluate to `true` for `Admin@DWIP2026`. Conversely, the successful runtime test scripts (`api_evidence.cjs`, `auth_verification.cjs`) were executed against a different Cloud Run domain (`wms-workshop-app-772298398554.asia-south1.run.app` or `wms-workshop-app-npoyvb3q7a-el.a.run.app`), which connects to database `railway` (`35.200.150.167`) where the `admin` hash validly matches `Admin@DWIP2026`.

---

## 2. 10-Point Verification Matrix: Browser vs. Runtime

| Verification Point | Chrome Browser Evidence | Successful Runtime Evidence | Match / Discrepancy Status |
| :--- | :--- | :--- | :--- |
| **1. Request URL** | `https://wms-workshop-app-473233046183.asia-south1.run.app/api/auth/login` | `https://wms-workshop-app-772298398554.asia-south1.run.app/api/auth/login` <br> *(also `wms-workshop-app-npoyvb3q7a-el.a.run.app`)* | **DISCREPANCY** <br> *(Different target hostnames & GCP Projects)* |
| **2. Request Payload** | `{"username":"admin","password":"Admin@DWIP2026"}` | `{"username":"admin","password":"Admin@DWIP2026"}` | **MATCH** <br> *(Identical JSON payload)* |
| **3. Request Headers** | `content-type: application/json`<br>`origin: https://wms-workshop-app-473233046183.asia-south1.run.app`<br>`referer: https://wms-workshop-app-473233046183.asia-south1.run.app/`<br>`user-agent: Mozilla/5.0 (Windows NT 10.0; ...)` | `Content-Type: application/json`<br>`Content-Length: 48`<br>*(Standard Node.js `https.request` headers)* | **MATCH** <br> *(Both specify `application/json` content type)* |
| **4. Cookies** | None (`Cookie` header omitted) | None (`Cookie` header omitted) | **MATCH** <br> *(Stateless REST authentication)* |
| **5. Response Status** | **`HTTP 401 Unauthorized`** | **`HTTP 200 OK`** | **DISCREPANCY** |
| **6. Response Body** | `{"error":"Invalid username or password."}` | `{"token":"eyJhbGciOiJIUzI1Ni...","user":{"user_id":55,"username":"admin","role":"admin"}}` | **DISCREPANCY** |
| **7. Cloud Run Revision** | **`wms-workshop-app-00073-nkh`** (GCP Project `473233046183`, Traffic 100%) | Revision in Project `772298398554` / `npoyvb3q7a-el` | **DISCREPANCY** <br> *(Different backend service instances & DB connections)* |
| **8. Browser Console** | Warnings: `logo.png` resource error; `apple-mobile-web-app-capable` deprecation. No JS exception. | N/A (Node.js runtime environment) | **VERIFIED** <br> *(UI correctly parsed HTTP 401 error payload)* |
| **9. Network Errors** | Zero connection/TCP timeouts or CORS network errors. Clean HTTP 401 response. | Zero TCP transport or HTTP connection errors. Clean HTTP 200 response. | **VERIFIED** |
| **10. CORS Handling** | Same-origin request (`sec-fetch-site: same-origin`). CORS allowed methods (`GET,POST,PUT,DELETE,OPTIONS`). | Direct HTTPS connection. | **VERIFIED** <br> *(CORS permitted request execution)* |

---

## 3. Captured Raw Requests & Responses

### 3.1 Chrome Browser Network Capture (reqid = 7 / reqid = 14)

```http
POST /api/auth/login HTTP/2
Host: wms-workshop-app-473233046183.asia-south1.run.app
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: https://wms-workshop-app-473233046183.asia-south1.run.app
Referer: https://wms-workshop-app-473233046183.asia-south1.run.app/
Content-Length: 48

{"username":"admin","password":"Admin@DWIP2026"}
```

**Chrome Server Response:**
```http
HTTP/2 401 Unauthorized
Content-Type: application/json; charset=utf-8
Content-Length: 41
Date: Sat, 25 Jul 2026 13:27:32 GMT
Server: Google Frontend
X-Powered-By: Express
Etag: W/"29-dEMcHWfJi78ZR1aqzb1ELAhp3Us"
RateLimit-Limit: 10
RateLimit-Remaining: 5

{"error":"Invalid username or password."}
```

---

### 3.2 Successful Runtime Network Capture (`api_evidence.cjs` / `auth_verification.cjs`)

```http
POST /api/auth/login HTTP/1.1
Host: wms-workshop-app-772298398554.asia-south1.run.app
Content-Type: application/json
Content-Length: 48

{"username":"admin","password":"Admin@DWIP2026"}
```

**Runtime Server Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 371
X-Request-Id: 8a7d6dbb-7689-46cb-944a-5b1207ec7442
X-Correlation-Id: 46c0c2e5-f2fd-4886-8db9-d02d1c4b8358
Etag: W/"173-mO/M++5GjuL/dcU6Ek5pU/bTBP8"

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1NSwidXNlcm5hbWUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IkFkbWluIE9wZXJhdG9yIiwicm9sZSI6ImFkbWluIiwiZW1wbG95ZWVfaWQiOm51bGwsImlhdCI6MTc4NDk4NjA3OCwiZXhwIjoxNzg1MDcyNDc4fQ.os1fxw6LCrPmMhEysRbKozA_ucyCrULotrQymS3escg",
  "user": {
    "user_id": 55,
    "username": "admin",
    "full_name": "Admin Operator",
    "role": "admin",
    "employee_id": null
  }
}
```

---

## 4. Root Cause Determination

1. **Target Host Mismatch:**
   * Chrome loads the web application from `https://wms-workshop-app-473233046183.asia-south1.run.app`, which sends API calls relative to its own domain (`/api/auth/login`).
   * The runtime trace script (`api_evidence.cjs`) explicitly targeted `https://wms-workshop-app-772298398554.asia-south1.run.app`.

2. **Database Environment Isolation:**
   * Cloud Run service `wms-workshop-app-473233046183.asia-south1.run.app` (Revision `wms-workshop-app-00073-nkh`) connects to the Cloud SQL database instance `disco-processor-nqtlh:asia-south1:dwip-mysql-prod` (`remix_wms` schema), where the `admin` user record has a seeded password hash that does not evaluate to `true` for `Admin@DWIP2026`.
   * Cloud Run service `wms-workshop-app-772298398554.asia-south1.run.app` connects to the Cloud SQL database instance `35.200.150.167` (`railway` schema), where `admin` user record (`user_id = 55`) has hash `$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.` which evaluates `bcrypt.compare("Admin@DWIP2026", hash)` to `true`.

---

## 5. Non-Destructive Audit Compliance

* **Production Environment Status:** No production database records, Cloud Run configurations, or Secret Manager keys were modified.
* **Scope Adherence:** The investigation strictly focused on capturing, comparing, and documenting the discrepancy between runtime test evidence and browser evidence.
