# Privacy Policy for AiVaahan DWIP

**Effective Date**: August 1, 2026  
**Application Name**: AiVaahan DWIP  
**Package Identifier**: `com.aivaahan.dwip`  
**Developer**: Sayeed Jaffer (`arhaanj@gmail.com`)  
**Production ERP**: `https://devanand.aivaahan.com`

---

## 1. Introduction

AiVaahan DWIP ("we", "our", or "us") provides enterprise workshop management, vehicle operational system (VOS) lifecycle tracking, roadside breakdown management (QRT), and executive intelligence services. This Privacy Policy explains how we collect, use, disclose, and safeguard user information when you use our mobile application and web platform.

---

## 2. Information We Collect

### A. Location Data (GPS)
- **Collection**: We collect precise location data (GPS coordinates, latitude, and longitude) when technicians use the Quick Response Team (QRT) Breakdown feature.
- **Purpose**: GPS coordinates are recorded strictly at dispatch, location arrival, roadside repair, and towing completion to enable real-time roadside assistance tracking and calculate Tata Motors QRT Reach SLA metrics.
- **Background Location**: Location is collected only while actively executing a QRT roadside breakdown operation.

### B. Camera & Media Attachments
- **Collection**: Access to the device camera and media storage is requested when users attach vehicle inspection photos, breakdown evidence images, or job card documents.
- **Purpose**: Images and media files are uploaded via secure Integration Gateway APIs (`https://devanand.aivaahan.com/api/v1/media/upload`) to document vehicle condition and repair verification.

### C. Financial & Operational Job Card Data
- **Collection**: Vehicle registration numbers, VIN/chassis numbers, job card billing records, repair estimates, and customer contact details.
- **Purpose**: Managed strictly for workshop service execution, gate entry control, warranty claims, and commercial billing.

### D. User Authentication & Device Identifiers
- **Collection**: User credentials, JSON Web Tokens (JWT), role assignments, IP addresses, and device identifiers.
- **Purpose**: Used for authentication, role-based access control (RBAC), security audit logging via `VosAuditEngine`, and rate limiting.

---

## 3. How We Use Information

We use collected information solely for legitimate enterprise workshop operations:
- Processing Vehicle Operational System (VOS) lifecycle state transitions (`GATE_IN` → `WORK_IN_PROGRESS` → `GATE_OUT`).
- Calculating QRT Reach SLA targets (2-hour day window / 4-hour night window).
- Generating executive analytics, technician productivity scorecards, and revenue classifications.
- Audit logging all operational record mutations.

---

## 4. Information Sharing & Disclosure

We do NOT sell, rent, or trade personal or operational data to third parties. Data is shared exclusively with:
- **OEM Integration Gateway**: Integration with authorized OEM servers (such as Tata Motors TMSA, QRT, EPC, eGuru) via encrypted TLS 1.3 channels.
- **Legal Compliance**: When required by law or regulatory court order.

---

## 5. Security & Data Protection

- **Encryption in Transit**: All API communications use mandatory TLS 1.3 encryption (`https://devanand.aivaahan.com`).
- **Data Protection**: Authentication relies on signed OAuth2/JWT Bearer tokens stored securely in encrypted device preferences (`@capacitor/preferences`).
- **Audit Ledger**: All data modifications are audited via `VosAuditEngine` and timestamped in the append-only `VosTimelineEngine`.

---

## 6. User Rights & Data Retention

- **Data Retention**: Operational records are retained in compliance with enterprise audit regulations.
- **Account Support & Inquiries**: For data access or deletion requests, contact developer Sayeed Jaffer at `arhaanj@gmail.com` *(temporary primary contact email)*.

---

## 7. Contact Us

If you have questions about this Privacy Policy, contact:
- **Developer Name**: Sayeed Jaffer
- **Email**: `arhaanj@gmail.com`
- **Website**: `https://devanand.aivaahan.com`
