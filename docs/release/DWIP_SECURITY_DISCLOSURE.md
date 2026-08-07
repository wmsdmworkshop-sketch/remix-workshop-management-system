# DWIP Security Disclosure & Architecture Technical Report

**Product Name**: AiVaahan DWIP  
**Package Identifier**: `com.aivaahan.dwip`  
**Developer**: Sayeed Jaffer (`arhaanj@gmail.com`)  
**Production ERP**: `https://devanand.aivaahan.com`  
**Architecture Frozen Version**: `DWIP Enterprise v1.1.0`

---

## 1. Network Transport Security (HTTPS / TLS 1.3)

All network communication between client applications (Mobile Native / PWA / Web UI) and the production backend (`https://devanand.aivaahan.com`) enforces compulsory **HTTPS with TLS 1.3 encryption**.

- **Certificate Pinning**: Mobile clients enforce SHA-256 certificate pinning for production backend hosts to prevent Man-in-the-Middle (MitM) inspection.
- **WebSocket Encryption**: Real-time event streams enforce Secure WebSockets (`wss://devanand.aivaahan.com/ws/`).

---

## 2. Authentication & JWT Token Architecture

Authentication in DWIP relies on **OAuth2 JSON Web Tokens (JWT)**:

- **Token Structure**: Cryptographically signed RS256/HS256 tokens containing user claims (`userId`, `companyId`, `dealerId`, `branchId`, `roles`).
- **Token Storage**: Mobile native tokens are stored in hardware-backed encrypted storage (`@capacitor/preferences`).
- **Auto-Refresh & Expiry**: Short-lived access tokens (`expiresIn: 3600s`) automatically refresh via `SyncOrchestrator` and integration gateway auth contracts without unauthenticated session drop.

---

## 3. Role-Based Access Control (RBAC)

System authorization is governed by strict Role-Based Access Control (RBAC) and 4-tier Feature Flag evaluation (`System` → `Provider` → `Workshop` → `User`):

- **Supported Roles**: `GENERAL_MANAGER`, `WORKSHOP_MANAGER`, `SERVICE_ADVISOR`, `TECHNICIAN`, `QRT_LEADER`, `GATE_SECURITY`, `PARTS_MANAGER`, `ADMIN`.
- **Policy Enforcement**: `OperationalPolicyEngine` evaluates operation permissions (e.g. `CREATE_BREAKDOWN_CASE`, `MANUAL_OVERRIDE`) against user roles and workflow profile rules before executing mutations.

---

## 4. Audit Engine (`VosAuditEngine`)

Every mutable action across all enterprise modules is recorded by the **VOS Audit Engine (`DWIP-VAE-001`)**:

- **Field-Level Audit Ledger**: Captures `entityType`, `entityId`, `fieldName`, `previousValue`, `newValue`, `changedBy`, `changedByRole`, `timestamp`, and `changeReason`.
- **Tamper Evidence**: Immutable audit history stored directly alongside entity records.

---

## 5. Timeline Engine (`VosTimelineEngine`)

The **VOS Timeline Engine (`DWIP-VTE-001`)** provides an append-only event ledger for vehicle sessions:

- **Event Validation**: Event types validated against `TimelineEventRegistry`.
- **Audit Traceability**: Records operational milestones (`GATE_IN`, `TOW_REQUESTED`, `QRT_DISPATCHED`, `WORK_STARTED`, `JOB_CARD_CREATED`, `GATE_OUT`).

---

## 6. Integration Gateway Security (`DWIP-INT-ARCH-001 v1.0`)

The Integration Gateway provides secure connectivity to external OEM providers (TMSA, QRT, EPC, eGuru):

- **Versioned Contracts**: Abstract interfaces (`IAuthContract`, `IMasterDataContract`, `IJobCardContract`, `IMediaUploadContract`) prevent leaking OEM-specific internal implementations.
- **Provider Capability Isolation**: Features (`mediaUpload`, `kyc`, `trailerAxle`) are checked dynamically via `ProviderCapabilities`.
- **Circuit Breaker & Queues**: FIFO and Priority queues (`CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `BACKGROUND`) handle rate limits and transient failures gracefully.

---

## 7. Data Protection & Controlled Data Entry (`DWIP-DATA-001`)

- **Trusted Sources**: Only `TMSA` and `DWIP` are authorized data entry origins.
- **Controlled Manual Overrides**: Manual record creation requires explicit `GENERAL_MANAGER` or `ADMIN` approval, recording `manualOverride = true`, `approvedBy`, `approvalReason`, and `correlationId`.
- **Deduplication**: Canonical ID deduplication across `registrationNumber`, `vin`, `vosNumber`, and `complaintNumber`.

---

## 8. Mobile Native Security

- **Package Identity**: Signed Android App Bundle under `com.aivaahan.dwip`.
- **R8 / ProGuard Obfuscation**: Code shrinking enabled in production release builds with symbol de-obfuscation mapping uploaded to Play Console.
- **Permission Scoping**: Permissions (`CAMERA`, `FINE_LOCATION`) requested only upon explicit user trigger.
- **Log Stripping**: Production release builds strip debug logs (`Log.d`/`Log.v`).

---

## 9. Progressive Web App (PWA) Security

- **Strict Caching Policy**: Service Worker (`public/sw.js`) caches **ONLY** static app shell assets (`.html`, `.css`, `.js`, `.png`).
- **Zero Sensitive Caching**: Explicitly bypasses caching for `/api/*`, `/auth/*`, `/ws/*`, JWT tokens, customer details, and vehicle records.
