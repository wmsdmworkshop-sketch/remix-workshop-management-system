/**
 * =============================================================================
 * WOS Core Architecture: Escalation History Ledger
 * Bounded Context: Core System / SLA Escalations
 * Description: Persists escalation history logs in the database to provide
 *              audit trails and prevent duplicate triggers.
 * =============================================================================
 */

import { pool as db } from "../../db/index";

export interface EscalationHistoryRecord {
  jobId: number;
  type: string;
  level: string;
  roleEscalatedTo: string;
  escalatedAt: string;
  resolvedAt?: string;
  isFalseEscalation: boolean;
}

export class EscalationHistory {
  /**
   * Logs a successful escalation action to the database history ledger.
   */
  public static async logEscalation(
    jobId: number,
    type: string,
    level: string,
    roleEscalatedTo: string
  ): Promise<void> {
    const record: EscalationHistoryRecord = {
      jobId,
      type,
      level,
      roleEscalatedTo,
      escalatedAt: new Date().toISOString(),
      isFalseEscalation: false,
    };

    await db.execute(
      `INSERT INTO tbl_notifications 
       (user_id, notification_type, message, priority, related_job_id, action_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        1,
        "WOS_ESCALATION_HISTORY",
        `Job ${jobId} escalated to level ${level} type ${type}`,
        "HIGH",
        jobId,
        JSON.stringify(record),
      ]
    );

    // Also write to audit trail
    await db.execute(
      `INSERT INTO tbl_audit_trail 
       (entity_type, entity_id, action_code, payload_diff, user_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        "job_card",
        jobId,
        "SLA_ESCALATION",
        JSON.stringify({ type, level, roleEscalatedTo }),
        1, // System User
      ]
    );
  }

  /**
   * Checks if an escalation level has already been triggered for a job card.
   */
  public static async isAlreadyEscalated(
    jobId: number,
    type: string,
    level: string
  ): Promise<boolean> {
    const queryPattern = `%"jobId":${jobId},"type":"${type}","level":"${level}"%`;
    const [rows] = await db.execute(
      "SELECT COUNT(*) as count FROM tbl_notifications WHERE notification_type = 'WOS_ESCALATION_HISTORY' AND action_url LIKE ?",
      [queryPattern]
    ) as any[];

    return rows && rows[0].count > 0;
  }

  /**
   * Marks a specific escalation record as resolved or a false alarm.
   */
  public static async resolveEscalation(jobId: number, type: string, isFalse: boolean = false): Promise<void> {
    const queryPattern = `%"jobId":${jobId},"type":"${type}"%`;
    const [rows] = await db.execute(
      "SELECT notification_id, action_url FROM tbl_notifications WHERE notification_type = 'WOS_ESCALATION_HISTORY' AND action_url LIKE ?",
      [queryPattern]
    ) as any[];

    for (const r of rows) {
      try {
        const record = JSON.parse(r.action_url) as EscalationHistoryRecord;
        if (!record.resolvedAt) {
          record.resolvedAt = new Date().toISOString();
          record.isFalseEscalation = isFalse;
          
          await db.execute(
            "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
            [JSON.stringify(record), r.notification_id]
          );
        }
      } catch (err) {
        // Skip corrupt rows
      }
    }
  }
}
