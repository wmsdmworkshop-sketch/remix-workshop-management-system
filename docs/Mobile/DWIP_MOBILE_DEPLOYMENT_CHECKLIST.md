# DWIP Mobile & PWA Deployment Checklist

**Sprint**: `DWIP-MOB-INIT-001 Revision-1`  
**Product**: AiVaahan DWIP (`com.aivaahan.dwip`)  
**Release**: `v1.0.0-RC1`

---

## Deployment Verification Checklist

### 1. Capacitor Configuration & Build
- [x] `capacitor.config.ts` initialized (`appId: "com.aivaahan.dwip"`, `appName: "AiVaahan DWIP"`, `webDir: "dist"`).
- [x] Web build succeeds clean (`npm run build`).
- [x] Android target assets synced (`dist/` copied).
- [x] Plugin foundation initialized (Camera, Geolocation, Filesystem, Network, SplashScreen, StatusBar, Keyboard, Push Notifications foundation).

### 2. Progressive Web App (PWA)
- [x] `public/manifest.json` configured (Standalone mode, theme color `#1e1e2d`).
- [x] `public/sw.js` Service Worker configured with strict static-only caching policy.
- [x] `index.html` updated with Service Worker registration and PWA meta tags.
- [x] Sensitive endpoints (`/api/*`, `/auth/*`, `/ws/*`) explicitly excluded from PWA cache.

### 3. Native Android Permissions & Privacy
- [x] Permissions audited: `INTERNET`, `FINE_LOCATION`, `CAMERA`, `READ_MEDIA_IMAGES`.
- [x] Runtime permissions requested only on user action (Camera/GPS not requested on first launch).
- [x] Production logging: Debug logs stripped (`Log.d`/`Log.v` removed).

### 4. Play Console Closed Testing Readiness
- [x] Signed Android App Bundle (`app-release.aab`) generation workflow verified.
- [x] R8 obfuscation `mapping.txt` generated.
- [x] Dealership Pilot Closed Testing track configuration completed.

---

**Status**: **APPROVED FOR PRODUCTION / PLAY CONSOLE UPLOAD**
