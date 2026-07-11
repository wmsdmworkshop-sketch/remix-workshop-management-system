/**
 * =============================================================================
 * WOS Core Architecture: EscalationEngine Coordinator
 * Bounded Context: Core System / SLA Escalations
 * Description: Main pipeline orchestrator that evaluates active jobs against
 *              working calendars, alerts supervisors, and escalates responsibilities.
 * =============================================================================
 */

import { IEventBus } from "../event-bus";
import { NotificationEngine } from "../notification-engine";
import { EscalationPolicy } from "./escalation-policy";
import { EscalationHistory } from "./escalation-history";
import { EscalationTimer } from "./escalation-timer";
import { ESCALATION_RULES, EscalationType, EscalationLevel, EscalationRole } from "./escalation-rules";
import { pool as db } from "../../db/index";

export class EscalationEngine {
  constructor(
    public readonly eventBus: IEventBus,
    public readonly notificationEngine: NotificationEngine,
    public readonly policy: EscalationPolicy
  ) {}

  /**
   * Evaluates SLA status and triggers escalations for a specific Job Card.
   * This is a non-destructive monitor that never mutates workflow states.
   */
  public async evaluateJob(jobId: number, correlationId: string): Promise<void> {
    // 1. Fetch Job Card details
    const [jobs] = await db.execute("SELECT * FROM job_cards WHERE job_id = ?", [jobId]) as any[];
    if (!jobs || jobs.length === 0) return;
    const job = jobs[0];

    // Determine target escalation type based on workflow state
    const state = job.current_workflow_state || "GATE_IN";
    if (state === "GATE_OUT") return; // Terminal state, no escalation

    const type = this.resolveEscalationType(state, job);
    if (!type) return;

    const rule = ESCALATION_RULES[type];
    if (!rule) return;

    // 2. Fetch or initialize persistent timer
    let timer = await EscalationTimer.getTimer(jobId, type);
    if (!timer) {
      // Calculate limit based on policy multipliers
      const adjustedLimit = this.policy.calculateLimitMinutes(rule.baseMinutesLimit, {
        isVip: job.priority === "VIP" || job.customer_name?.includes("VIP"),
        isEmergency: job.emergency_flag === 1 || job.emergency_flag === true,
        priorityLevel: job.priority === "High" ? "HIGH" : job.priority === "Low" ? "LOW" : "MEDIUM",
      });

      await EscalationTimer.start(jobId, type, adjustedLimit);
      timer = await EscalationTimer.getTimer(jobId, type);
    }

    if (!timer || timer.status !== "RUNNING") return;

    // Calculate elapsed time (excluding non-working hours and holidays)
    const elapsedMinutes = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000 / 60) - Math.floor(timer.accumulatedMs / 1000 / 60);

    // 3. Evaluate SLA Violation
    if (elapsedMinutes >= timer.limitMinutes) {
      let severity: EscalationLevel = rule.severity;
      let targetRole: EscalationRole = rule.assignedRole;

      // Escalate to next tier if warning was already logged
      const isL0Escalated = await EscalationHistory.isAlreadyEscalated(jobId, type, "INFO");
      const isL1Escalated = await EscalationHistory.isAlreadyEscalated(jobId, type, "WARNING");
      const isL2Escalated = await EscalationHistory.isAlreadyEscalated(jobId, type, "CRITICAL");

      if (isL2Escalated && rule.nextEscalationRole) {
        severity = "EMERGENCY";
        targetRole = "L4_DEALER_PRINCIPAL";
      } else if (isL1Escalated) {
        severity = "CRITICAL";
        targetRole = rule.nextEscalationRole || "L2_WORKSHOP_MANAGER";
      } else if (isL0Escalated) {
        severity = "WARNING";
        targetRole = "L1_SUPERVISOR";
      } else {
        severity = "INFO";
        targetRole = rule.assignedRole;
      }

      // Check duplicate check for this specific tier level
      const alreadySent = await EscalationHistory.isAlreadyEscalated(jobId, type, severity);
      if (alreadySent) return;

      console.warn(`[EscalationEngine] SLA Violation detected. Job ${jobId} type ${type} escalated to ${severity} (${targetRole}).`);

      // 4. Log escalation and trigger alert
      await EscalationHistory.logEscalation(jobId, type, severity, targetRole);

      // Increase priority if critical/emergency
      if (severity === "CRITICAL" || severity === "EMERGENCY") {
        await db.execute("UPDATE job_cards SET priority = 'High' WHERE job_id = ?", [jobId]);
      }

      // Dispatch alert notification via NotificationEngine (never directly call providers)
      await this.notificationEngine.sendNotification(
        {
          recipient: targetRole,
          templateCode: "SLA_BREACH",
          variables: { jobNo: job.job_card_no, state: state },
          priority: severity === "EMERGENCY" ? "HIGH" : "MEDIUM",
          primaryChannel: "SMS",
          escalationChannel: "EMAIL",
          idempotencyKey: `ESC-${jobId}-${type}-${severity}-${Date.now()}`,
        },
        correlationId
      );

      // Publish event
      await this.eventBus.publish(
        "SLA_ESCALATED",
        { jobId, type, severity, targetRole, correlationId },
        correlationId
      );
    }
  }

  private resolveEscalationType(state: string, job: any): EscalationType | null {
    if (state === "INTAKE_PENDING") return "MISSING_ETD";
    if (state === "DIAGNOSTIC_WIP") return "TECHNICIAN_IDLE";
    if (state === "ESTIMATE_PENDING") return "CUSTOMER_APPROVAL_DELAY";
    if (state === "PARTS_PENDING") return "PARTS_DELAY";
    if (state === "WIP_START") return "TECHNICIAN_IDLE";
    if (state === "QC_PENDING") return "QC_DELAY";
    if (state === "FINAL_REVIEW") return "INVOICE_DELAY";
    if (state === "INVOICED") return "PAYMENT_DELAY";

    if (job.emergency_flag === 1 || job.emergency_flag === true) {
      return "EMERGENCY_VEHICLE";
    }

    return null;
  }
}
