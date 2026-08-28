import { pool as db } from "../../db/index";
import { normaliseRole } from "./assignment-roles";

/**
 * Policy for backdated workflow entries.
 *
 * The workflow is strict by default: a gate entry records when the vehicle
 * ACTUALLY arrived, taken from the server clock, and no client can override it.
 * That matters because arrival_time starts the handoff SLA clock and anchors the
 * audit trail — a fabricated arrival makes the SLA measure against a moment that
 * never happened.
 *
 * Backdating is permitted only when ALL of the following hold:
 *
 *   1. The system setting `allow_backdated_entries` is exactly 'true'.
 *      Absent or anything else means disabled — the safe default, so a fresh
 *      database or a dropped row locks it rather than opening it.
 *   2. The acting user's role is admin, developer, or gm_service.
 *   3. The caller supplies an explicit reason.
 *   4. The supplied timestamp parses and is not in the future.
 *
 * Every accepted backdate is returned flagged so the caller can audit it. A
 * backdate that happens without a trail is indistinguishable from a real
 * arrival, which is the whole thing this guards against.
 *
 * This exists for the testing period. Turn it off before real operations:
 *   UPDATE system_settings SET setting_value='false' WHERE setting_key='allow_backdated_entries';
 */

/** Roles permitted to backdate, in normalised form (`gm_service` -> "gm service"). */
export const BACKDATE_ROLES: readonly string[] = ["admin", "developer", "gm service"];

export const BACKDATE_SETTING_KEY = "allow_backdated_entries";

/** True only when the setting row exists and reads exactly 'true'. */
export async function isBackdatingEnabled(): Promise<boolean> {
  try {
    const [rows]: any = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = ?",
      [BACKDATE_SETTING_KEY]
    );
    if (!rows || rows.length === 0) return false;
    return String(rows[0].setting_value).trim().toLowerCase() === "true";
  } catch (err: any) {
    // Fail CLOSED. If the setting cannot be read, backdating stays off.
    console.error("[Backdate] Could not read setting; defaulting to disabled:", err.message);
    return false;
  }
}

export function canBackdate(role: any): boolean {
  return BACKDATE_ROLES.includes(normaliseRole(role));
}

export interface ResolvedTimestamp {
  /** The timestamp to store. */
  time: Date;
  /** True when this is an operator-supplied backdate rather than the server clock. */
  backdated: boolean;
  /** Operator-supplied justification; null for a normal, non-backdated entry. */
  reason: string | null;
}

/**
 * Resolves the timestamp to record for a workflow event.
 *
 * With no backdate requested this simply returns the server clock — the normal,
 * strict path. When a backdate IS requested, every condition above is checked
 * and a clear error is thrown if any fails, so a refused backdate never
 * silently falls back to `now` and gets recorded as a genuine arrival.
 */
export async function resolveEventTimestamp(
  requested: any,
  reason: any,
  user: any,
  label = "entry"
): Promise<ResolvedTimestamp> {
  const now = new Date();

  const raw = String(requested ?? "").trim();
  if (!raw) return { time: now, backdated: false, reason: null };

  if (!canBackdate(user?.role)) {
    throw new Error(
      `Backdating a ${label} is not permitted for role '${user?.role}'. ` +
        `Only admin, developer or gm_service may do so.`
    );
  }

  if (!(await isBackdatingEnabled())) {
    throw new Error(
      `Backdating is disabled. It is intended for the testing period only; ` +
        `enable it by setting '${BACKDATE_SETTING_KEY}' to 'true' in system settings.`
    );
  }

  const justification = String(reason ?? "").trim();
  if (justification.length < 3) {
    throw new Error(`A reason is required when backdating a ${label}.`);
  }

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) {
    throw new Error(`'${raw}' is not a valid date/time for the ${label}.`);
  }
  if (parsed.getTime() > now.getTime()) {
    throw new Error(`A ${label} cannot be dated in the future.`);
  }

  return { time: parsed, backdated: true, reason: justification };
}
