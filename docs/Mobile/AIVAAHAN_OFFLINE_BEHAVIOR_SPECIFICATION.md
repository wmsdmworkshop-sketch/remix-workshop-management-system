# Mobile Offline Behavior & Background Sync Specification

**Application**: AiVaahan DWIP (`com.aivaahan.dwip`)

---

## 1. PWA & Mobile Cache Policy

- **Service Worker (`public/sw.js`)**: Caches static app shell (`.html`, `.css`, `.js`, `.png`).
- **Data Exclusion Rule**: Sensitive APIs (`/api/*`, `/auth/*`, `/ws/*`), JWT tokens, customer details, and vehicle records are **NEVER** cached in persistent offline storage.

---

## 2. Offline Action Queuing & Background Synchronization

When a technician loses connectivity:
1. **Offline Queueing**: Write actions (e.g. initial gate record entry, inspection notes) are saved locally in encrypted Capacitor Storage (`@capacitor/preferences`).
2. **Visual Indicator**: Top bar displays a subtle yellow "Offline - Pending Sync" banner.
3. **Background Flush**: Upon network reconnection, `SyncOrchestrator` automatically flushes queued actions in FIFO order to `https://devanand.aivaahan.com/api/v1/sync`.
