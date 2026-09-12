/**
 * URL paths for the workshop's screens.
 *
 * WHY THIS EXISTS
 *
 * Navigation was a single `useState` holding a tab id, so the URL never changed:
 * every screen was devanand.aivaahan.com. Refreshing lost the screen, the
 * browser's Back button exited the application, and no screen could be linked
 * to or bookmarked.
 *
 * The tab id IS the path segment. Keeping them identical means:
 *   - no second naming scheme to drift out of step with ROLE_TABS,
 *   - the 83 existing setActiveTab() call sites keep working untouched,
 *   - a new tab added to ROLE_TABS gets a working URL with no change here.
 *
 * So `jobs` is /jobs, `advisor-workspace` is /advisor-workspace. The only
 * special case is the default screen.
 *
 * NOT ROUTED HERE
 *
 * The customer portal (/portal, /customer-portal) is a SEPARATE application
 * with its own auth and its own Vite build — main.tsx chooses between them
 * before this router ever mounts, and it must stay that way.
 *
 * /service-assist is a server-rendered page, not a React screen. The tab of the
 * same name embeds it in an iframe; the real page is served by Express under
 * its own role gate.
 */

/** The screen shown at "/" — and the fallback when a path matches no tab. */
export const DEFAULT_TAB = "dashboard";

/**
 * Paths Express owns. A URL beginning with one of these is NOT a React screen,
 * so the router must never claim it or try to render a tab for it.
 */
const NON_APP_PREFIXES = [
  "/api",
  "/uploads",
  // The customer portal is a separate build served from here by Express.
  "/customer-portal",
  "/service-assist",
  "/assets",
];
// NOTE: "/portal" was listed here and has been removed. Express serves nothing
// at that path — the portal lives at /customer-portal/ — so /portal fell to the
// SPA catch-all and returned the WORKSHOP bundle. Treating it as server-owned
// made the router leave it alone, which meant it rendered as the default tab
// under a URL that names a different application. It is now an ordinary
// unrecognised path: the role guard redirects it like any other.

/** True when this path belongs to the server, not to the React application. */
export function isNonAppPath(pathname: string): boolean {
  return NON_APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/**
 * The tab id a URL refers to.
 *
 * Reads only the FIRST path segment, so a nested URL such as /jobs/1234 still
 * resolves to the `jobs` screen. Deeper segments are left for a screen to read
 * itself once it supports them — this keeps nested links working today rather
 * than 404-ing, without pretending the screens already parse them.
 *
 * Returns null for a path the server owns, so the caller can leave it alone.
 */
export function tabFromPath(pathname: string): string | null {
  if (isNonAppPath(pathname)) return null;
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return DEFAULT_TAB;
  return first;
}

/** The URL for a tab id. The default tab lives at the root. */
export function pathFromTab(tabId: string): string {
  if (!tabId || tabId === DEFAULT_TAB) return "/";
  return `/${tabId}`;
}

/**
 * Where to send someone after they sign in.
 *
 * `attempted` is the path they originally asked for. It is honoured only when
 * it resolves to a tab their role actually permits — otherwise they land on
 * their own first screen. A deep link must not become a way to reach, or to
 * probe the existence of, a screen the role does not have.
 */
export function resolvePostLoginPath(
  attempted: string | null,
  permittedTabIds: string[]
): string {
  if (!attempted) return "/";
  const tab = tabFromPath(attempted);
  if (!tab) return "/";
  if (tab === DEFAULT_TAB && permittedTabIds.includes(DEFAULT_TAB)) return attempted;
  return permittedTabIds.includes(tab) ? attempted : "/";
}
