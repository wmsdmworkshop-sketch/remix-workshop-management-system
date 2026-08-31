import { pool as db } from "../../db/index";

/**
 * Runtime policy for surfacing handoff-SLA-breach alerts.
 *
 * The 5-minute handoff SLA clock keeps running and recording at all times — the
 * data stays truthful. This policy governs only whether a breach is *surfaced*
 * to users (the alert bell, My Workspace counts, the red BREACHED queue badges,
 * and the gate-out SLA dashboard). It exists for the production-testing period:
 * until the SLA is trusted against real arrival times, backdated/legacy arrivals
 * make genuine job cards read as breached, so an admin or developer keeps the
 * alerts suppressed and flips them on once the workflow is realtime-tested.
 *
 * Enabled ONLY when `system_settings.sla_breach_alerts_enabled` reads exactly
 * 'true'. Absent, 'false', or anything else keeps alerts SUPPRESSED — the safe
 * default the operator asked for, so a fresh database or a dropped row stays
 * quiet rather than lighting up the whole floor.
 *
 * Toggle it from the Operations Cockpit (Production Support Mode), or directly:
 *   UPDATE system_settings SET setting_value='true'  WHERE setting_key='sla_breach_alerts_enabled'; -- surface breaches
 *   UPDATE system_settings SET setting_value='false' WHERE setting_key='sla_breach_alerts_enabled'; -- suppress (testing)
 */

export const SLA_ALERT_SETTING_KEY = "sla_breach_alerts_enabled";

/** Roles permitted to flip the toggle. */
export const SLA_ALERT_TOGGLE_ROLES: readonly string[] = ["admin", "developer"];

/**
 * Pure decision from a `SELECT setting_value ...` result set: enabled only when
 * the stored value is exactly 'true' (trimmed, case-insensitive). Everything
 * else — missing row, 'false', empty, garbage — is suppressed.
 */
export function parseSlaAlertSetting(rows: any): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return String(rows[0]?.setting_value ?? "").trim().toLowerCase() === "true";
}

// Short in-memory cache so per-item / per-request reads (queue rendering, the
// notification poll) don't hit the DB on every call. 15s is well under any
// human reaction time to a toggle flip.
let _cache: { value: boolean; at: number } | null = null;
const CACHE_TTL_MS = 15_000;

/** Clear the cache immediately — call right after the toggle is written. */
export function invalidateSlaAlertPolicyCache(): void {
  _cache = null;
}

/**
 * True when breach alerts should be surfaced to users. Reads the setting
 * (cached), defaulting to SUPPRESSED. On a read error it fails CLOSED — stays
 * suppressed — honouring the operator's explicit "keep these quiet" intent
 * rather than lighting up the floor on an infrastructure blip; the underlying
 * tbl_handoff_sla clocks remain queryable for anyone auditing directly.
 */
export async function areSlaBreachAlertsEnabled(): Promise<boolean> {
  const nowMs = Date.now();
  if (_cache && nowMs - _cache.at < CACHE_TTL_MS) return _cache.value;
  try {
    const [rows]: any = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = ?",
      [SLA_ALERT_SETTING_KEY]
    );
    const value = parseSlaAlertSetting(rows);
    _cache = { value, at: nowMs };
    return value;
  } catch (err: any) {
    console.error("[SLA-ALERT] Could not read setting; keeping alerts suppressed:", err.message);
    return false;
  }
}
