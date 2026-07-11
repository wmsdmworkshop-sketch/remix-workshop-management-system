/**
 * =============================================================================
 * WOS Core Architecture: Escalation Analytics Engine
 * Bounded Context: Core System / SLA Escalations
 * Description: Computes SLA compliance ratios and escalation statistics
 *              by analyzing database history logs.
 * =============================================================================
 */

import { pool as db } from "../../db/index";
import { EscalationHistoryRecord } from "./escalation-history";

export interface SLAAnalyticsReport {
  totalEscalations: number;
  averageResolutionMinutes: number;
  slaAchievementPct: number;
  falseEscalationRatePct: number;
  repeatedEscalationsCount: number;
  effectivenessPct: number;
}

export class EscalationAnalytics {
  /**
   * Generates a complete SLA compliance metrics report.
   */
  public static async getAnalytics(): Promise<SLAAnalyticsReport> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ESCALATION_HISTORY'"
    ) as any[];

    let total = 0;
    let resolvedCount = 0;
    let totalResolutionTimeMs = 0;
    let falseEscalations = 0;
    const repeatedCounts: Record<number, number> = {};

    for (const r of rows) {
      try {
        const record = JSON.parse(r.action_url) as EscalationHistoryRecord;
        total++;

        if (record.isFalseEscalation) {
          falseEscalations++;
        }

        if (record.resolvedAt) {
          resolvedCount++;
          const duration = new Date(record.resolvedAt).getTime() - new Date(record.escalatedAt).getTime();
          totalResolutionTimeMs += duration;
        }

        repeatedCounts[record.jobId] = (repeatedCounts[record.jobId] || 0) + 1;
      } catch (err) {
        // Skip corrupt rows
      }
    }

    const repeatedEscalations = Object.values(repeatedCounts).filter((c) => c > 1).length;
    const averageResolutionMinutes =
      resolvedCount > 0 ? Math.round(totalResolutionTimeMs / resolvedCount / 1000 / 60) : 0;
    
    // SLA Achievement Pct represents portion of jobs that resolved without escalations
    // We fetch total active jobs
    const [jobRows] = await db.execute("SELECT COUNT(*) as total FROM job_cards") as any[];
    const totalJobsCount = jobRows && jobRows[0].total ? jobRows[0].total : 1;
    const jobsWithEscalations = Object.keys(repeatedCounts).length;
    const slaAchievementPct = Math.max(0, Math.round(((totalJobsCount - jobsWithEscalations) / totalJobsCount) * 100));

    const falseEscalationRatePct = total > 0 ? Math.round((falseEscalations / total) * 100) : 0;
    const effectivenessPct = total > 0 ? Math.max(0, 100 - falseEscalationRatePct) : 100;

    return {
      totalEscalations: total,
      averageResolutionMinutes,
      slaAchievementPct,
      falseEscalationRatePct,
      repeatedEscalationsCount: repeatedEscalations,
      effectivenessPct,
    };
  }
}
