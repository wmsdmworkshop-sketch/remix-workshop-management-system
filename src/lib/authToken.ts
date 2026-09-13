// ============================================================================
// AiVaahan DWIP — Canonical STAFF auth-token accessor
// ----------------------------------------------------------------------------
// Single source of truth for the internal (staff/enterprise) JWT in the browser.
// Fixes token-key fragmentation: login writes "wms_token" but several components
// historically read only "dwip_token"/"token" (never written) → 401 "No token
// provided". This accessor always reads/writes the canonical key and tolerates
// legacy keys on read for backward compatibility during migration.
//
// NOTE: This is for STAFF/enterprise auth only. The CUSTOMER portal token
// ("customer_token") is a SEPARATE, isolated mechanism and must never be read
// or written here.
// ============================================================================

/** Canonical localStorage key for the staff/enterprise JWT. */
export const STAFF_TOKEN_KEY = "wms_token";

// Legacy keys tolerated on READ only (never written), so components that used
// them keep working during the transition. Do NOT add "customer_token" here.
const LEGACY_READ_KEYS = ["dwip_token", "token", "dwip_auth_token"] as const;

/** Returns the staff JWT (canonical key first, then legacy keys), or "" if none. */
export function getStaffToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const canonical = localStorage.getItem(STAFF_TOKEN_KEY);
    if (canonical) return canonical;
    for (const k of LEGACY_READ_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    const rawUser = localStorage.getItem(STAFF_USER_KEY);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.token) return parsed.token;
    }
  } catch {
    /* localStorage unavailable */
  }
  return "";
}

/** Persists the staff JWT under the canonical key. */
export function setStaffToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STAFF_TOKEN_KEY, token || "");
  } catch {
    /* localStorage unavailable */
  }
}

/** Clears the staff JWT (canonical + legacy keys) on logout. Leaves customer token intact. */
export function clearStaffToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    for (const k of LEGACY_READ_KEYS) localStorage.removeItem(k);
  } catch {
    /* localStorage unavailable */
  }
}

/** Canonical localStorage key for the persisted staff/enterprise user object. */
export const STAFF_USER_KEY = "wms_user";

/**
 * Returns the authenticated staff user object (parsed from "wms_user"), or null.
 * This is the same object login persists via onAuthSuccess.
 */
export function getStaffUser(): { user_id?: number; username?: string; full_name?: string; role?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STAFF_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns the authoritative authenticated staff user id, or null when there is
 * no authenticated user. Callers MUST fail safely on null — never substitute a
 * placeholder/fallback id.
 */
export function getStaffUserId(): number | null {
  const user = getStaffUser();
  const id = user?.user_id;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

/**
 * End a session the server has already rejected, and send the user to log in.
 *
 * WHY THIS EXISTS. staffAuthHeaders() OMITS the Authorization header when no
 * token is present, so a browser whose token has expired or been cleared sends
 * an unauthenticated request and the server answers "Access denied. No token
 * provided." The screen, meanwhile, still shows the user as signed in because
 * `wms_user` is a separate key that nothing clears — so an admin saw that
 * message on an action they were fully entitled to perform, with no way to tell
 * that the real problem was a dead session.
 *
 * Worse, a failed /api/users read left the login-account map EMPTY, which made
 * every employee render "+ Create Login" as though their login had been
 * deleted. Nothing had been deleted; the list simply never loaded.
 *
 * Clears both keys and reloads, which drops the app back to the login screen.
 */
export function endExpiredSession(message?: string): void {
  if (typeof window === "undefined") return;
  try {
    clearStaffToken();
    localStorage.removeItem(STAFF_USER_KEY);
  } catch {
    /* localStorage unavailable */
  }
  if (message) {
    try { window.alert(message); } catch { /* ignore */ }
  }
  try { window.location.reload(); } catch { /* ignore */ }
}

/**
 * True when a response means "your session is no longer valid".
 *
 * 401 only. A 403 is a permission decision about a live session and must NOT
 * log anyone out — that would turn "you may not do this" into "you have been
 * signed out", which is both wrong and alarming.
 */
export function isSessionExpiredResponse(res: { status: number }): boolean {
  return res.status === 401;
}

/** Standard auth headers for a staff API call. Adds Authorization only when present. */
export function staffAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const token = getStaffToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
