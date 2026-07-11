// =============================================================================
// WOS SLA Management Engine (Phase 4)
// Bounded Context: Workflow Operations / SLA Engine
// =============================================================================

import { WORKFLOW_CONFIG, FEATURE_FLAGS } from "./config";
import { LogPayload, WorkflowLogger } from "./logger";

export interface SlaCheckResult {
  status: "WITHIN_SLA" | "WARN" | "BREACHED";
  elapsedMinutes: number;
  slaLimit: number;
}

export class SlaEngine {
  /**
   * Calculates SLA compliance based on when state was entered.
   */
  public static checkSla(
    state: string,
    enteredAt: Date,
    logContext: LogPayload
  ): SlaCheckResult {
    const config = WORKFLOW_CONFIG[state];
    const defaultResult: SlaCheckResult = { status: "WITHIN_SLA", elapsedMinutes: 0, slaLimit: 0 };

    if (!config || !FEATURE_FLAGS.enableSlaAlerts) {
      return defaultResult;
    }

    const slaLimit = config.slaLimitMinutes;
    if (slaLimit === 0) return defaultResult;

    const diffMs = Date.now() - enteredAt.getTime();
    const elapsedMinutes = Math.floor(diffMs / 1000 / 60);

    let status: "WITHIN_SLA" | "WARN" | "BREACHED" = "WITHIN_SLA";

    // 80% SLA elapsed triggers Warning threshold
    const warningThreshold = Math.floor(slaLimit * 0.8);

    if (elapsedMinutes >= slaLimit) {
      status = "BREACHED";
      WorkflowLogger.warn(`SLA breached for state ${state}. Limit: ${slaLimit}m, Elapsed: ${elapsedMinutes}m`, logContext);
    } else if (elapsedMinutes >= warningThreshold) {
      status = "WARN";
      WorkflowLogger.info(`SLA warning for state ${state}. Threshold: ${warningThreshold}m, Elapsed: ${elapsedMinutes}m`, logContext);
    }

    return {
      status,
      elapsedMinutes,
      slaLimit,
    };
  }
}
