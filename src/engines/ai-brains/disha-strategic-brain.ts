/**
 * =============================================================================
 * DWIP Enterprise Platform — DISHA (Strategic Brain, L3)
 * Bounded Context: AI Brains / Trend Analysis & SLA Forecasting
 * Description: Aggregates REAL historical handoff-SLA breach data (already
 *              populated by RealtimeOwnershipPipeline / the SLA evaluator
 *              cron) into descriptive statistics, then asks DeepSeek to
 *              summarize the real numbers in plain language for management.
 *              No predictive model is fabricated — this is honest descriptive
 *              analytics over real completed data, run on demand for now.
 * =============================================================================
 */
import { pool as db } from "../../db/index.ts";
import { DeepSeekEngine } from "../deepseek-engine.ts";
import { recordBrainInvocation, recordBrainError } from "./brain-registry.ts";

const BRAIN_ID = "DISHA";

export interface StrategicTrendReport {
  periodDays: number;
  totalHandoffsEvaluated: number;
  breachedCount: number;
  breachRatePercent: number;
  breachesByStage: Array<{ stage: string; count: number }>;
  narrative: string;
}

export async function analyzeStrategicTrends(triggeredBy: string, periodDays: number = 7): Promise<StrategicTrendReport> {
  const startedAt = Date.now();
  try {
    const [totalRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM tbl_handoff_sla WHERE sla_due_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [periodDays]
    );
    const [breachRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM tbl_handoff_sla
       WHERE sla_due_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status = 'BREACHED'`,
      [periodDays]
    );
    const [byStageRows]: any = await db.query(
      `SELECT stage_name AS stage, COUNT(*) AS count FROM tbl_handoff_sla
       WHERE sla_due_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status = 'BREACHED'
       GROUP BY stage_name ORDER BY count DESC`,
      [periodDays]
    );

    const totalHandoffsEvaluated = Number(totalRows[0]?.cnt || 0);
    const breachedCount = Number(breachRows[0]?.cnt || 0);
    const breachRatePercent = totalHandoffsEvaluated > 0 ? Math.round((breachedCount / totalHandoffsEvaluated) * 1000) / 10 : 0;

    const report: StrategicTrendReport = {
      periodDays,
      totalHandoffsEvaluated,
      breachedCount,
      breachRatePercent,
      breachesByStage: byStageRows.map((r: any) => ({ stage: r.stage, count: Number(r.count) })),
      narrative: "",
    };

    try {
      const raw = await DeepSeekEngine.chat(
        [
          {
            role: "system",
            content: "You are DISHA, the Strategic Brain of a Tata Motors commercial vehicle workshop. " +
              "You are given real, already-computed SLA breach statistics for the period. Write 2-3 sentences " +
              "of plain-language insight for management about the trend and which stage most needs attention. " +
              "Do not invent any number not given to you. If there is not enough data, say so plainly.",
          },
          { role: "user", content: JSON.stringify({ ...report, narrative: undefined }) },
        ],
        { model: "deepseek-chat", temperature: 0.2, maxTokens: 250 }
      );
      report.narrative = raw.trim();
    } catch {
      report.narrative = totalHandoffsEvaluated === 0
        ? "Not enough handoff data yet in this period to report a trend."
        : `${breachRatePercent}% of ${totalHandoffsEvaluated} handoffs breached SLA over the last ${periodDays} days.`;
    }

    await recordBrainInvocation(BRAIN_ID, {
      triggeredBy,
      inputSummary: `${periodDays}d window, ${totalHandoffsEvaluated} handoffs`,
      outputSummary: report.narrative.slice(0, 500),
      durationMs: Date.now() - startedAt,
    });

    return report;
  } catch (err: any) {
    await recordBrainError(BRAIN_ID, err.message, triggeredBy, Date.now() - startedAt);
    throw err;
  }
}
