---
name: "DWIP Frontend Instructions"
description: "Use when building or editing React screens, components, tabs, navigation, data fetching, auth headers, styling or Tailwind classes in the DWIP staff app or customer portal. Covers tab registration, the ds-* design system, loaders, toasts and role gating."
applyTo: ["src/components/**", "src/App.tsx", "src/lib/**", "src/hooks/**", "src/index.css", "src/main.tsx", "src/customer-portal/**"]
---

# DWIP Frontend

Global rules and commands live in [AGENTS.md](../../AGENTS.md) and the binding [.agents/AGENTS.md](../../.agents/AGENTS.md) constitution. This file covers frontend-specific mechanics.

## Adding a screen / tab

1. Create the component in `src/components/` (`*Workspace.tsx` = role console, `*Manager.tsx` = CRUD, `*Panel.tsx` = embedded panel, `*Hub.tsx`/`*Dashboard.tsx` = aggregates).
2. **The URL is the source of truth for navigation.** `src/App.tsx` derives `activeTab` from the path via `src/lib/tabRoutes.ts`; `setActiveTab` is a shim that navigates. A tab id **is** its path segment — register it in `tabRoutes.ts`.
3. Add the tab id to the relevant role entries in `ROLE_TABS` (`src/App.tsx`), and add a branch to the flat render chain (`{activeTab === "x" && <Component/>}`). There are no nested routes.
4. `tabsForRole()` has **no cross-role fallback** — an unknown role sees only my-workspace/attendance/tech-profile. If a new real role must reach a screen, map it explicitly (or via `src/lib/myWorkspaceRouter.tsx`).
5. `NON_APP_PREFIXES` in `tabRoutes.ts` (`/api`, `/uploads`, `/customer-portal`, `/assets`) must never be claimed by the router — Express owns them.

> **`excludedTabs` is declared twice in `src/App.tsx`**: once as a redirect guard and once as a render filter. It applies in `rc1` builds to **everyone, including `developer`**. Touching one and not the other makes nav and guard disagree.

## Data fetching

- Most data is lifted: `fetchAllData()` in `src/App.tsx` fans out parallel `/api/*` calls and passes results down as props. Follow that for shared data; a self-fetching component is fine for screen-local data (`EmployeeDirectory`, `QCInspectorWorkspace`, `AiBrainsPanel`).
- **Always use `src/lib/authToken.ts`** for staff requests: `getStaffToken()`, `setStaffToken()`, `clearStaffToken()`, `getStaffUser()`, `staffAuthHeaders()` (adds `Authorization: Bearer` only when a token exists).
- `isSessionExpiredResponse(res)` is **401 only** — a 403 is an authorisation failure and must not log the user out. Use `endExpiredSession()` for the 401 path.
- **Never touch `customer_token`** — the customer portal has a separate JWT mechanism.
- On fetch failure, keep the last good value and track the failure (see the `failed[]` handling in `App.tsx`). Do not silently degrade to zeroed or empty UI.
- `src/config/api.ts` must remain the **first import** in the staff SPA entry — it patches `window.fetch` so relative `/api/*` calls resolve on Capacitor.

## UI & styling

- **Tailwind v4** via `@tailwindcss/vite`. There is **no `tailwind.config.js`** — theme and utilities live in `src/index.css`.
- Prefer the shared design-system utilities over ad-hoc classes: `ds-title`, `ds-subtitle`, `ds-body`, `ds-label`, `ds-input`, `ds-select`, `ds-textarea`, `ds-button-primary`, `ds-button-secondary`, `ds-button-danger`, `ds-button-success`, `ds-card`, `ds-modal`, `ds-modal-container`, `ds-table`, `ds-th`, `ds-td`, `ds-table-row`.
- The app is **dark-only OLED** (`html, body, #root` are forced black with `!important`). `src/index.css` is shared with the customer portal, so light-container contrast fixes must be **scoped to `html.app-workshop`** (the portal sets `html.app-portal`).
- Use the house loaders — `FunnyLoader` (full-screen) and `FunnySpinner` — and wrap screens with `ErrorBoundary`.
- Toasts come from a `showToast(msg, "success" | "error" | "info")` prop passed down from `App.tsx`. There is no toast context or library — don't introduce one.
- No Redux/Zustand/React Query. State is `useState` in `App.tsx` plus polling via `setInterval` (session 30s, notifications 60s, AI mode 60s, operational dashboards 10s). WebSockets exist only in `GeminiAssistant.tsx` and the portal dashboard.

## Real-data rules for UI

- Never render fabricated numbers, mock arrays, invented "AI confidence" values, or fake success toasts. Use an honest empty state (`—`, "No records yet").
- Client-side role/tab checks are **cosmetic**. The server enforces RBAC; a hidden button is not a security control.
- A screen can be reachable while its API still 403s — accessing a module also requires the DB-driven `role_permissions` grant.

## Customer portal

`src/customer-portal/**` is a **separate SPA** (`vite.customer.config.ts`, entry `customer-index.html`, served at `/customer-portal/`). It does not use react-router and must not share the staff auth token. Don't import staff-app modules into it casually.
