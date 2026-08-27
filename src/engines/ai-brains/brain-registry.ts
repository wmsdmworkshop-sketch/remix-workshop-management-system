/**
 * =============================================================================
 * DWIP Enterprise Platform — AI Brains Registry & Health Tracking
 * Shared by SIGNA (L1), SETU (L2), DISHA (L3). Records real invocations and
 * errors against the live `ai_brain_registry` / `ai_brain_activity_log`
 * tables — no fabricated health status; a brain's "ACTIVE" state reflects an
 * actual successful call, not a hardcoded flag.
 *
 * Also manages decision audit logs (`ai_brain_decision_log`) for recording
 * technician/advisor acceptance, modification, or rejection of recommendations.
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

let decisionSchemaReady: Promise<void> | null = null;

export async function ensureDecisionSchema(): Promise<void> {
  if (decisionSchemaReady) return decisionSchemaReady;
  decisionSchemaReady = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_brain_decision_log (
        decision_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        activity_log_id VARCHAR(40) NOT NULL,
        decision ENUM('ACCEPTED', 'REJECTED', 'MODIFIED') NOT NULL,
        notes TEXT NULL,
        decided_by_user_id INT NOT NULL,
        decided_by_employee_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity_log (activity_log_id),
        INDEX idx_decided_by_user (decided_by_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  })().catch((err: any) => {
    decisionSchemaReady = null;
    console.warn(`[BrainRegistry] Decision schema init failed: ${err?.message || err}`);
    throw err;
  });
  return decisionSchemaReady;
}

export async function recordBrainInvocation(
  brainId: BrainId,
  info: { triggeredBy: string; inputSummary: string; outputSummary: string; durationMs: number }
): Promise<string> {
  const logId = `LOG-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  try {
    await db.execute(
      `INSERT INTO ai_brain_activity_log (log_id, brain_id, triggered_by, input_summary, output_summary, success, duration_ms)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [logId, brainId, info.triggeredBy, info.inputSummary, info.outputSummary, info.durationMs]
    );
    await db.execute(
      `UPDATE ai_brain_registry SET status = 'ACTIVE', total_invocations = total_invocations + 1, last_active_at = NOW() WHERE brain_id = ?`,
      [brainId]
    );
    return logId;
  } catch (e: any) {
    console.warn(`Brain registry: failed to record invocation for ${brainId}:`, e.message);
    return logId;
  }
}

export async function recordBrainError(
  brainId: BrainId,
  errorMessage: string,
  triggeredBy: string,
  durationMs: number
): Promise<string> {
  const logId = `LOG-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  try {
    await db.execute(
      `INSERT INTO ai_brain_activity_log (log_id, brain_id, triggered_by, input_summary, output_summary, success, duration_ms)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [logId, brainId, triggeredBy, "", errorMessage.slice(0, 500), durationMs]
    );
    await db.execute(
      `UPDATE ai_brain_registry SET total_errors = total_errors + 1, last_error = ? WHERE brain_id = ?`,
      [errorMessage.slice(0, 1000), brainId]
    );
    return logId;
  } catch (e: any) {
    console.warn(`Brain registry: failed to record error for ${brainId}:`, e.message);
    return logId;
  }
}

export interface BrainDecisionInput {
  logId: string;
  decision: "ACCEPTED" | "REJECTED" | "MODIFIED";
  notes?: string;
  userId: number;
  employeeId?: number | null;
}

export async function recordBrainDecision(
  input: BrainDecisionInput
): Promise<{ decisionId: number; createdAt: string }> {
  await ensureDecisionSchema();

  // Verify that the referenced activity_log_id actually exists in ai_brain_activity_log
  const [logRows]: any = await db.query(
    `SELECT log_id, brain_id FROM ai_brain_activity_log WHERE log_id = ? LIMIT 1`,
    [input.logId]
  );

  if (!logRows || logRows.length === 0) {
    const err: any = new Error(`Activity log with id "${input.logId}" does not exist in ai_brain_activity_log.`);
    err.code = "ACTIVITY_LOG_NOT_FOUND";
    throw err;
  }

  const [res]: any = await db.execute(
    `INSERT INTO ai_brain_decision_log
       (activity_log_id, decision, notes, decided_by_user_id, decided_by_employee_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.logId,
      input.decision,
      input.notes || null,
      input.userId,
      input.employeeId || null,
    ]
  );

  return {
    decisionId: res.insertId,
    createdAt: new Date().toISOString(),
  };
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
