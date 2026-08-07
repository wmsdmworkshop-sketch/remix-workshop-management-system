# DWIP Enterprise PWA Setup & Deployment Guide

**Application Identity**:
- **Name**: AiVaahan DWIP
- **Package / Manifest ID**: `com.aivaahan.dwip`
- **Scope**: Progressive Web App (PWA) Installable Shell

---

## 1. PWA Architecture Overview

The PWA capability allows dealership managers, technicians, and advisors to install AiVaahan DWIP directly from Chrome, Edge, or Safari on desktop or mobile devices without code duplication.

### Caching Policy (Strict Security):
- **Cache-First (App Shell)**: Static assets only (`.js`, `.css`, `.png`, `.svg`, `.woff2`, `index.html`, `manifest.json`).
- **Network-Only (Zero Caching)**: API endpoints (`/api/*`), Auth tokens/JWTs, VOS state data, Job Cards, Vehicle records, Customer details, Executive dashboards, or OEM backend responses.

---

## 2. PWA Manifest Configuration (`public/manifest.json`)

```json
{
  "name": "AiVaahan DWIP Enterprise Platform",
  "short_name": "AiVaahan DWIP",
  "description": "Enterprise Workshop Management & Vehicle Operational System (VOS)",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e1e2d",
  "theme_color": "#1e1e2d",
  "orientation": "portrait-primary"
}
```

---

## 3. Installation & Offline Shell Verification

1. Serve application over HTTPS: `https://devanand.aivaahan.com`.
2. Open in Chrome or Safari.
3. Click "Install AiVaahan DWIP" prompt or "Add to Home Screen".
4. App runs in standalone window without browser UI controls.
5. In offline state, static app shell loads smoothly while displaying graceful network disconnect alerts for dynamic API actions.
