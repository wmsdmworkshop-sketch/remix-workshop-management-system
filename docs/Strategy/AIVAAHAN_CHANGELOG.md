# AiVaahan Enterprise Platform Changelog

All notable changes to the AiVaahan DWIP Enterprise Platform are documented in this file.

---

## [v1.0.0-RC1-HOTFIX-001] — 2026-08-01 (LIVE PRODUCTION DEPLOYMENT)

### Added
- Signed Android App Bundle (`app-release.aab`) under package identifier `com.aivaahan.dwip`.
- Progressive Web App (PWA) static app shell caching via Service Worker (`public/sw.js`).
- Executive Intelligence Layer (`DWIP-EXEC-001`) with 12 revenue classification categories and 5 role scorecards.
- Complete release documentation, Play Store compliance metadata, and operational command center runbooks under `docs/`.

### Fixed
- Vitest test suite discovery and Playwright E2E spec isolation (`vitest.config.ts`).
- Normalized RBAC role string matching (`service_advisor` vs `Service Advisor`) in `AiCopilotOrchestrator`.
- Preserved single VOS session state across roadside breakdown, towing, and workshop gate entry.

### Security
- Certificate pinning for production backend host `https://devanand.aivaahan.com`.
- Encrypted JWT token storage via `@capacitor/preferences`.
