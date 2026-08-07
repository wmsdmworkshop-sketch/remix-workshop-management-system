# Google Play Data Safety Declaration for AiVaahan DWIP

**Application**: AiVaahan DWIP (`com.aivaahan.dwip`)  
**Developer**: Sayeed Jaffer (`arhaanj@gmail.com`)  
**Target OS**: Android 14 (API Level 34)

---

## 1. Overview Questionnaire Answers

- **Does your app collect or share any of the required user data types?** Yes.
- **Is all of the user data collected by your app encrypted in transit?** Yes (TLS 1.3 compulsory).
- **Do you provide a way for users to request that their data be deleted?** Yes.

---

## 2. Detailed Data Types & Purpose Mapping

### A. Location (Precise Location)
- **Collected**: Yes
- **Shared**: Yes (with authorized OEM integration gateways)
- **Ephemeral vs Stored**: Stored with breakdown case audit trail
- **Purpose**: App functionality (Roadside QRT breakdown dispatch & arrival tracking)

### B. Photos and Videos (Photos)
- **Collected**: Yes
- **Shared**: No
- **Purpose**: App functionality (Vehicle inspection & repair verification media attachments)

### C. Personal Info (Name, Email Address, User IDs)
- **Collected**: Yes
- **Shared**: No
- **Purpose**: Account management, security auditing (`VosAuditEngine`), and RBAC authentication

### D. Financial Info (Purchase / Billing History)
- **Collected**: Yes (Job Card estimates, billing amounts, commercial repair types)
- **Shared**: No
- **Purpose**: App functionality (Workshop job card billing & executive revenue analytics)

### E. App Info and Performance (Crash Logs, Diagnostics)
- **Collected**: Yes (Firebase Crashlytics & Performance Monitoring)
- **Shared**: No
- **Purpose**: Analytics and app performance stabilization

---

## 3. Security Practices

- **Encryption Standard**: HTTPS / TLS 1.3 for all REST and WebSocket connections.
- **Token Storage**: Encrypted JWT storage via Capacitor Preferences (`@capacitor/preferences`).
- **Data Access Control**: Role-based access control (RBAC) enforced per endpoint.
