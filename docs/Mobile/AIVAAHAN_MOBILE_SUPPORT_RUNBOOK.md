# Mobile Support & In-App Update Runbook

**Target Application**: AiVaahan DWIP (`com.aivaahan.dwip`)

---

## 1. Google Play Closed Testing Update Management

- **Release Track**: Google Play Closed Testing (Dealership Pilot Track).
- **In-App Update API**:
  - **Flexible Updates**: Downloaded in background for minor patches; installed on next app launch.
  - **Immediate Updates**: Mandatory prompt for critical security releases; blocks app usage until updated.

---

## 2. Technician Troubleshooting Runbook

| Issue Reported | Diagnostic Check | Resolution Steps |
| :--- | :--- | :--- |
| **App Frozen / Black Screen** | RAM exhaustion or webview crash | Force close app; clear app cache; re-open. |
| **GPS Location Fail** | Permission revoked or location off | Prompt user to enable High Accuracy Location in Android settings. |
| **Camera Capture Fail** | Camera permission missing | Grant camera permission in App Settings. |
| **Login Token Expired** | Session time exceeds 24 hours | Re-authenticate via SSO login screen. |
