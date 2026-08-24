/**
 * =============================================================================
 * DWIP Enterprise Platform — AI Brains Registry & Health Tracking
 * Shared by SIGNA (L1), SETU (L2), DISHA (L3). Records real invocations and
 * errors against the live `ai_brain_registry` / `ai_brain_activity_log`
 * tables — no fabricated health status; a brain's "ACTIVE" state reflects an
 * actual successful call, not a hardcoded flag.
 * =============================================================================
 */
import { pool as db } from "../../db/index.ts";
import crypto from "crypto";

export type BrainId = "SIGNA" | "SETU" | "DISHA";

export interface BrainHealth {
  brain_id: string;
  brain_name: string;
  tier: string;
  role_description: string;
  status: string;
  total_invocations: number;
  total_errors: number;
  last_active_at: string | null;
  last_error: string | null;
}

export async function recordBrainInvocation(
  brainId: BrainId,
  info: { triggeredBy: string; inputSummary: string; outputSummary: string; durationMs: number }
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO ai_brain_activity_log (log_id, brain_id, triggered_by, input_summary, output_summary, success, duration_ms)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [`LOG-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, brainId, info.triggeredBy, info.inputSummary, info.outputSummary, info.durationMs]
    );
    await db.execute(
      `UPDATE ai_brain_registry SET status = 'ACTIVE', total_invocations = total_invocations + 1, last_active_at = NOW() WHERE brain_id = ?`,
      [brainId]
    );
  } catch (e: any) {
    console.warn(`Brain registry: failed to record invocation for ${brainId}:`, e.message);
  }
}

export async function recordBrainError(brainId: BrainId, errorMessage: string, triggeredBy: string, durationMs: number): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO ai_brain_activity_log (log_id, brain_id, triggered_by, input_summary, output_summary, success, duration_ms)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [`LOG-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, brainId, triggeredBy, "", errorMessage.slice(0, 500), durationMs]
    );
    await db.execute(
      `UPDATE ai_brain_registry SET total_errors = total_errors + 1, last_error = ? WHERE brain_id = ?`,
      [errorMessage.slice(0, 1000), brainId]
    );
  } catch (e: any) {
    console.warn(`Brain registry: failed to record error for ${brainId}:`, e.message);
  }
}

export async function getAllBrainHealth(): Promise<BrainHealth[]> {
  const [rows]: any = await db.query(
    `SELECT brain_id, brain_name, tier, role_description, status, total_invocations, total_errors, last_active_at, last_error
     FROM ai_brain_registry ORDER BY tier ASC`
  );
  return rows;
}

export async function getRecentActivity(brainId?: BrainId, limit: number = 50): Promise<any[]> {
  if (brainId) {
    const [rows]: any = await db.query(
      `SELECT * FROM ai_brain_activity_log WHERE brain_id = ? ORDER BY created_at DESC LIMIT ?`,
      [brainId, limit]
    );
    return rows;
  }
  const [rows]: any = await db.query(`SELECT * FROM ai_brain_activity_log ORDER BY created_at DESC LIMIT ?`, [limit]);
  return rows;
}
