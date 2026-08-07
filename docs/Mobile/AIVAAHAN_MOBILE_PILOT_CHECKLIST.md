# AiVaahan Mobile Pilot Workshop Readiness Checklist

**Product Name**: AiVaahan DWIP Mobile App  
**Package Identifier**: `com.aivaahan.dwip`  
**Version**: `v1.0.0-RC1` (`versionCode: 10000`)  
**Target Hardware**: Workshop Technician & QRT Driver Smartphones

---

## Workshop Deployment Checklist

### 1. Hardware & System Setup
- [x] **App Installation**: Installed via Google Play Closed Testing track (`com.aivaahan.dwip`).
- [x] **OS Compliance**: Device running Android 7.0+ (API 24 to 34).
- [x] **RAM Verification**: Minimum 3 GB RAM available (4 GB+ recommended).
- [x] **Storage Space**: Minimum 500 MB free internal storage.

### 2. Native Plugin Verification
- [x] **Camera Permission**: `CAMERA` permission granted for inspection photo attachment.
- [x] **GPS Location Permission**: `ACCESS_FINE_LOCATION` granted for QRT breakdown tracking.
- [x] **Offline Cache**: Service Worker (`public/sw.js`) app shell cached cleanly.

### 3. Technician Field Workflows
- [x] **Gate Entry Intake**: ANPR / manual vehicle registration on mobile screen.
- [x] **Inspection Photos**: Capture and upload 4-point vehicle inspection photos.
- [x] **QRT Breakdown Dispatch**: One-tap dispatch acceptance & GPS arrival confirmation.
- [x] **Background Resume**: Session preserved when app is backgrounded.
