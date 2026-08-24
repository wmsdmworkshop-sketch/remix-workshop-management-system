/**
 * Global AI Mode kill switch.
 *
 * AI Mode is workshop-wide, not per-browser: turning it off must actually stop
 * outbound AI calls (and therefore API-key spend), not merely hide panels for
 * whoever flipped the switch. The state lives in the existing, already-live
 * `dealer_configurations` key-value table — no new schema — under the key
 * `ai_mode_enabled` ('1' / '0').
 *
 * Enforcement is applied at `DeepSeekEngine.chat()`, the single chokepoint every
 * AI feature in this codebase funnels through (AI Brains SIGNA/SETU/DISHA,
 * feedback triage, the OCR semantic-VRN fallback, and the copilot). Gating there
 * means a new AI feature added later is switched off by default too, rather than
 * quietly bypassing the switch.
 */

import { pool } from "../db/index.ts";

const CONFIG_KEY = "ai_mode_enabled";

/**
 * Reads are cached briefly: `chat()` can be called several times inside one
 * request and a DB round-trip per call would be wasteful. The window is short
 * enough that flipping the switch takes effect essentially immediately.
 */
const CACHE_TTL_MS = 10_000;
let cached: { value: boolean; at: number } | null = null;

/** Clears the cache so a just-written value is visible immediately. */
export function invalidateAiModeCache(): void {
  cached = null;
}

/**
 * Whether AI Mode is currently enabled workshop-wide.
 * Fails OPEN (returns true) when the config row or table cannot be read: a
 * transient DB problem should not silently disable every AI feature with no
 * explanation. An explicit '0' is the only thing that disables it.
 */
export async function isAiModeEnabled(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  try {
    const [rows]: any = await pool.query(
      "SELECT config_value FROM dealer_configurations WHERE config_key = ? LIMIT 1",
      [CONFIG_KEY]
    );
    const raw = rows?.[0]?.config_value;
    // Absent key => AI on (the platform's shipped default).
    const value = raw === undefined || raw === null ? true : String(raw) === "1";
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return true;
  }
}

/** Persists the workshop-wide AI Mode state. */
export async function setAiModeEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "1" : "0";
  await pool.query(
    `INSERT INTO dealer_configurations (config_key, config_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = ?`,
    [CONFIG_KEY, value, value]
  );
  invalidateAiModeCache();
}

/** Roles permitted to turn AI Mode on/off and to approve activation requests. */
export const AI_MODE_APPROVER_ROLES = ["gm_service", "admin", "developer"];

/** Roles permitted to REQUEST activation (they cannot flip it themselves). */
export const AI_MODE_REQUESTER_ROLES = [
  "workshop_manager",
  "service_manager",
  "service_advisor",
];
