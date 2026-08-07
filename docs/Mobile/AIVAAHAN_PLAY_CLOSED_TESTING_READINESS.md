# AIVAAHAN-PLAY-CLOSED-001: Google Play Closed Testing Pre-Upload Readiness Audit

## 📌 Executive Summary

This report documents the final **read-only pre-upload audit** for **AiVaahan DWIP (`com.aivaahan.dwip`)** ahead of submitting the first signed release bundle (**Version Code `10000` / Version Name `1.0.0-RC1`**) to the **Google Play Closed Testing Track** for the **Devanand Automobiles Pilot**.

---

## 📑 Audit Findings Matrix

### A. Artifact Integrity
- **Release App Bundle (AAB) Path**: [app-release.aab](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/android/app/build/outputs/bundle/release/app-release.aab)
- **AAB File Size**: `5,026,905 bytes (~4.79 MB)`
- **AAB SHA-256 Checksum**: `B2FA0058859F415D415E367E945F129F753B912C8970ECC7A48B1ABB8B4BBD0B`
- **Integrity Status**: ✓ **100% UNCHANGED & MATCHES EXPECTED HASH**

---

### B. Signing Integrity
- **Keystore**: `android/app/aivaahan-upload-key.jks` (`aivaahan-upload`, 2048-bit RSA)
- **Certificate Owner**: `CN=Sayeed Jaffer, OU=Engineering, O=Devanand Automobiles, L=Kalaburagi, ST=Karnataka, C=IN`
- **Signing Certificate SHA-256**: `06:7C:1C:CB:23:D7:71:92:1F:40:19:F6:FD:50:9B:D7:41:9F:94:6F:E4:D5:A6:26:0B:E4:16:0D:CB:C5:B1:C4`
- **Verification Status**: ✓ **CRYPTOGRAPHICALLY SIGNED & VERIFIED (`jarsigner` / `keytool`)**

---

### C. Release Manifest Permissions Audit
*Inspected from merged release manifest (`android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`):*

1. `android.permission.INTERNET`: **REQUIRED** — Encrypted communication with `https://devanand.aivaahan.com`.
2. `com.aivaahan.dwip.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`: **REQUIRED** — Internal Android 14 receiver protection.
- **Permission Assessment**: Clean. No high-risk or unnecessary background permissions requested.

---

### D. Data Safety Declaration Matrix

| Data Category | Collected | Shared | Operational Purpose | Encrypted in Transit | User Deletion Support |
| :--- | :---: | :---: | :--- | :---: | :---: |
| **User Identifiers** | YES | NO | Account authentication & workshop RBAC authorization | YES (TLS 1.3 HTTPS) | YES (Admin management) |
| **Auth Credentials / JWT**| YES | NO | Session authentication & role verification | YES (TLS 1.3 HTTPS) | YES (Token revocation) |
| **Vehicle Information** | YES | NO | Gate entry, VOS lifecycle tracking, job cards | YES (TLS 1.3 HTTPS) | Dealership retention policy |
| **Customer Information** | YES | NO | Service billing & progress notifications | YES (TLS 1.3 HTTPS) | YES (DMS deletion) |
| **Photos & Media** | YES | NO | Vehicle damage & repair verification media | YES (TLS 1.3 HTTPS) | YES (Attachment cleanup) |
| **Location Data (GPS)** | YES | NO | QRT breakdown roadside dispatch positioning | YES (TLS 1.3 HTTPS) | Retained with case record |
| **Diagnostics & Logs** | YES | NO | System performance monitoring & audit trail | YES (TLS 1.3 HTTPS) | Automated log rotation |
| **Financial / Payment** | NO | NO | N/A (In-app billing processing not used) | N/A | N/A |

---

### E. Privacy Policy Readiness
- **Policy URL**: `https://devanand.aivaahan.com/privacy-policy`
- **Source Document**: [DWIP_PRIVACY_POLICY.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/release/DWIP_PRIVACY_POLICY.md)
- **Disclosures Included**: Explicits GPS location for QRT, camera media upload, JWT tokens, retention rules, and contact info (`arhaanj@gmail.com`).
- **Readiness**: ✓ **COMPLETE & VERIFIED**

---

### F. Account Deletion Findings
- **Account Model**: Enterprise Administrator Provisioned (No in-app user self-registration).
- **Google Play Declaration**: Select *"My app does not allow users to create an account within the app; accounts are created by an administrator."*
- **Deletion Support**: Admin account deactivation available in `UserManagement.tsx` (`DELETE /api/users/:id`), and users may submit deletion requests via email to `arhaanj@gmail.com`.

---

### G. Store Listing Asset Inventory

| Asset Type | Standard Requirement | Current Availability | Status |
| :--- | :--- | :--- | :---: |
| **App Name** | Max 30 chars | `AiVaahan DWIP` (13 chars) | **READY** |
| **Short Description** | Max 80 chars | `Enterprise Workshop Management & VOS Tracking Platform.` | **READY** |
| **Full Description** | Max 4000 chars | Detailed technical description in release docs | **READY** |
| **App Icon** | 512 x 512 32-bit PNG | `public/logo.png` (Scalable) | **READY** |
| **Feature Graphic** | 1024 x 500 PNG/JPEG | Needs export before public store launch | **OPTIONAL FOR CLOSED BETA** |
| **Phone Screenshots** | Min 2 portrait screenshots | `deployed_login.png` & emulator UI captures | **READY** |

---

### H. Closed Testing Release Notes (Max 500 Chars)

```text
Initial Closed Testing release (v1.0.0-RC1 / Build 10000) for Devanand Automobiles (Sedam Road Workshop).

Key Features:
- Vehicle Operational System (VOS) lifecycle tracking
- Gate Entry Intake & Plate Lookup
- Job Card management & pre-invoice estimates
- Quick Response Team (QRT) Breakdown GPS dispatching
- Vehicle inspection photo capture & upload
- Role-based executive dashboards

Secured with TLS 1.3 encryption against https://devanand.aivaahan.com.
```

---

### I. Tester Distribution Plan
- **Track**: Closed Testing (Alpha / Beta)
- **Target Organization**: Devanand Automobiles Motors LLP
- **Target Branch**: Sedam Road Workshop (`BR-SEDAM` / Kalaburagi)
- **Tester Group**: `Devanand Pilot Technicians` (5–10 verified email accounts)

---

### J. Google Play Console Prerequisites
1. Account Access: Log into Play Console via `arhaanj@gmail.com`.
2. Developer Contact: Sayeed Jaffer (`arhaanj@gmail.com`).
3. Privacy Policy Link: `https://devanand.aivaahan.com/privacy-policy`.
4. Signed Release Bundle: [app-release.aab](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/android/app/build/outputs/bundle/release/app-release.aab).

---

### K. Blocking Findings
- **0 Blockers Identified**.

---

## 🛠️ L. Manual Play Console Upload Sequence (Step-by-Step for Sayeed)

1. **Log In**: Open Google Play Console using account `arhaanj@gmail.com`.
2. **Create App**:
   - App Name: `AiVaahan DWIP`
   - Default Language: `English (United States)` or `English (India)`
   - App / Game: `App`
   - Free / Paid: `Free`
3. **App Content & Data Safety**:
   - **Privacy Policy**: Enter `https://devanand.aivaahan.com/privacy-policy`.
   - **App Access**: Select *"All functionality is restricted"* $\rightarrow$ Provide demo credentials (`usr_service_advisor` / password).
   - **Ads**: Select *"No, my app does not contain ads"*.
   - **Content Rating**: Complete questionnaire (Select Utility / Productivity $\rightarrow$ Expected Rating: Everyone 3+).
   - **Target Audience**: Select `18 and over`.
   - **Data Safety**: Declare User Identifiers, Auth Data, Vehicle Info, Photos, Location (QRT), and App Logs (All marked as Encrypted in Transit, Not Shared with third parties).
   - **Account Deletion**: Select *"Accounts are administrator provisioned"*.
4. **Closed Testing Setup**:
   - Navigate to **Testing** $\rightarrow$ **Closed testing**.
   - Select or create track **Devanand Pilot Beta**.
   - Under **Testers**, create email list `Devanand Pilot Technicians` and add authorized email addresses.
5. **Create Release & Upload**:
   - Click **Create new release**.
   - **Play App Signing**: Accept default Google Play App Signing key generation.
   - **Upload**: Drag and drop `android/app/build/outputs/bundle/release/app-release.aab`.
   - **Release Name**: Verify auto-detected `1.0.0-RC1 (10000)`.
   - **Release Notes**: Paste the release notes text from Section H.
6. **Save & Review**:
   - Click **Save** $\rightarrow$ Click **Review release**.
7. **STOP**: Do **not** click *"Start rollout to Closed testing"* until ready for live technician testing.

---

## 🎯 M. FINAL RECOMMENDATION

```text
PLAY CLOSED TESTING PRE-UPLOAD READY
```
