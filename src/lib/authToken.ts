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

/** Standard auth headers for a staff API call. Adds Authorization only when present. */
export function staffAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const token = getStaffToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
