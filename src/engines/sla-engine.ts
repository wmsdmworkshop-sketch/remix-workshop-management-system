import { EventBus } from "../core/event-bus.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — SLA & ETD Breach Engine (WP-06 SLA Hardening)
 * Bounded Context: Workshop Operations / SLA & Turnaround Time Management
 * Description: Hardened SLA engine enforcing Tata Motors Commercial Vehicle
 *              TAT benchmarks, 3-level escalation hierarchy, and EventBus breach publishing.
 * =============================================================================
 */

export type SLAStatus = "ON_TIME" | "WARNING_L1" | "WARNING_L2" | "BREACHED_L3";

export interface SLAEvaluationResult {
  jobId: number;
  jobCardNo: string;
  vrn: string;
  srTypeCode: string;
  status: SLAStatus;
  elapsedMins: number;
  remainingMins: number;
  tatMins: number;
  escalationLevel: 0 | 1 | 2 | 3;
  escalationTargetRole?: string;
  isBreached: boolean;
}

export interface SLAEscalationSummary {
  totalEvaluated: number;
  onTimeCount: number;
  warningL1Count: number;
  warningL2Count: number;
  breachedL3Count: number;
  escalationsTriggered: number;
}

// Standard Tata Motors Commercial Vehicle TAT Rules (in minutes)
export const TATA_CV_TAT_BENCHMARKS: Record<string, number> = {
  QS: 60,        // Quick Service
  PM: 120,       // Periodic Maintenance
  GR: 180,       // General Repair
  EO: 480,       // Engine Overhaul
  BO: 360,       // Body & Paint
  EL: 150,       // Electrical Work
  BR: 120,       // Brake Service
  AC: 180,       // AC Service & Repair
  TY: 90,        // Tyre & Alignment
  WA: 180,       // Warranty Job
  BREAKDOWN: 30  // QRT Breakdown Response
};

export class SLAEngine {
  /**
   * Calculates target ETD timestamp for a given Service Type.
   */
  public static calculateTargetETD(srTypeCode: string, startTime: Date = new Date()): Date {
    const tatMins = TATA_CV_TAT_BENCHMARKS[srTypeCode.toUpperCase()] || 180;
    return new Date(startTime.getTime() + tatMins * 60 * 1000);
  }

  /**
   * Evaluates SLA status and escalation level for a job card.
   */
  public static evaluateJobSLA(job: {
    job_id: number;
    job_card_no?: string;
    vrn: string;
    sr_type_code?: string;
    started_at?: string | Date | null;
    created_at?: string | Date;
    etd?: string | Date | null;
    status?: string;
  }): SLAEvaluationResult {
    const jobId = job.job_id;
    const jobCardNo = job.job_card_no || `JC-${jobId}`;
    const vrn = job.vrn;
    const srTypeCode = (job.sr_type_code || "GR").toUpperCase();
    const tatMins = TATA_CV_TAT_BENCHMARKS[srTypeCode] || 180;

    const startTimestamp = job.started_at
      ? new Date(job.started_at).getTime()
      : new Date(job.created_at || Date.now()).getTime();

    const now = Date.now();
    const elapsedMins = Math.max(0, Math.floor((now - startTimestamp) / (1000 * 60)));

    let targetETD: Date;
    if (job.etd) {
      targetETD = new Date(job.etd);
    } else {
      targetETD = new Date(startTimestamp + tatMins * 60 * 1000);
    }

    const remainingMins = Math.floor((targetETD.getTime() - now) / (1000 * 60));

    let slaStatus: SLAStatus = "ON_TIME";
    let escalationLevel: 0 | 1 | 2 | 3 = 0;
    let escalationTargetRole: string | undefined = undefined;

    if (remainingMins <= 0) {
      slaStatus = "BREACHED_L3";
      escalationLevel = 3;
      escalationTargetRole = "Workshop Manager & GM Service";
    } else if (remainingMins <= 15) {
      slaStatus = "WARNING_L2";
      escalationLevel = 2;
      escalationTargetRole = "Floor Supervisor";
    } else if (remainingMins <= 30 || elapsedMins >= tatMins * 0.8) {
      slaStatus = "WARNING_L1";
      escalationLevel = 1;
      escalationTargetRole = "Service Advisor";
    }

    return {
      jobId,
      jobCardNo,
      vrn,
      srTypeCode,
      status: slaStatus,
      elapsedMins,
      remainingMins,
      tatMins,
      escalationLevel,
      escalationTargetRole,
      isBreached: escalationLevel === 3
    };
  }

  /**
   * Evaluates a batch of job cards and dispatches breach events to EventBus.
   */
  public static async processBatchEscalations(
    jobs: any[],
    eventBus?: EventBus
  ): Promise<SLAEscalationSummary> {
    let onTimeCount = 0;
    let warningL1Count = 0;
    let warningL2Count = 0;
    let breachedL3Count = 0;
    let escalationsTriggered = 0;

    for (const job of jobs) {
      if (job.status === "Completed" || job.status === "Invoiced") {
        continue; // Skip closed job cards
      }

      const evalResult = this.evaluateJobSLA(job);

      switch (evalResult.status) {
        case "ON_TIME":
          onTimeCount++;
          break;
        case "WARNING_L1":
          warningL1Count++;
          escalationsTriggered++;
          break;
        case "WARNING_L2":
          warningL2Count++;
          escalationsTriggered++;
          break;
        case "BREACHED_L3":
          breachedL3Count++;
          escalationsTriggered++;
          if (eventBus) {
            await eventBus.publish(
              "SLA_BREACHED",
              {
                jobId: evalResult.jobId,
                jobCardNo: evalResult.jobCardNo,
                vrn: evalResult.vrn,
                elapsedMins: evalResult.elapsedMins,
                tatMins: evalResult.tatMins,
                targetRole: evalResult.escalationTargetRole
              },
              "WORKSHOP_OPERATIONS"
            );
          }
          break;
      }
    }

    return {
      totalEvaluated: jobs.length,
      onTimeCount,
      warningL1Count,
      warningL2Count,
      breachedL3Count,
      escalationsTriggered
    };
  }
}
