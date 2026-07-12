// =============================================================================
// WOS Workflow Core Engine (Phase 4)
// Bounded Context: Workshop Operations / Workflow Management
// =============================================================================

import { pool as db } from "../../db/index";
import { WORKFLOW_CONFIG, FEATURE_FLAGS } from "./config";
import { WorkflowValidator } from "./validator";
import { SlaEngine } from "./sla";
import { WorkflowEventPublisher } from "./event-publisher";
import { WorkflowLogger } from "./logger";

export interface TransitionPayload {
  jobId: number;
  newState: string;
  actorId: number;
  actorRole: string;
  reason?: string;
  overrideFlag?: boolean;
  overrideReasonCode?: string;
  overrideJustification?: string;
  correlationId?: string;
  parentEventId?: string;
  source?: string;
  sourceSystem?: string;
  user?: string;
}

export class WorkflowEngine {
  /**
   * Orchestrates the complete workflow state transition pipeline.
   * Ensures: Validation -> Override Logging -> Update -> Audit Logging -> Notification -> Event Publishing.
   */
  public static async transition(payload: TransitionPayload): Promise<{ success: boolean; error?: string }> {
    const logContext = WorkflowLogger.createSession(payload.actorId, payload.actorRole, payload.jobId);
    
    try {
      WorkflowLogger.info(`Initiating workflow transition to: ${payload.newState}`, logContext);

      // 1. Fetch active Job Card state
      const [jobs] = await db.execute("SELECT * FROM job_cards WHERE job_id = ?", [payload.jobId]) as any[];
      if (!jobs || jobs.length === 0) {
        return { success: false, error: `Job Card with ID ${payload.jobId} not found.` };
      }
      const job = jobs[0];
      const oldState = job.current_workflow_state || "GATE_IN";

      // 2. Execute Validation Pipeline
      const validation = WorkflowValidator.validate(oldState, payload.newState, payload.actorRole, logContext);
      
      if (!validation.isValid) {
        const isOverridePermitted = payload.overrideFlag && 
                                    (payload.actorRole === "Supervisor" || payload.actorRole === "Admin") && 
                                    FEATURE_FLAGS.enableDecisionOverrides;

        if (!isOverridePermitted) {
          WorkflowLogger.warn(`Rejected state transition: ${validation.reason}`, logContext);
          return { success: false, error: validation.reason };
        }

        // Log manager override decision
        WorkflowLogger.info("Transition approved via supervisor override bypass.", logContext);
        await db.execute(
          `INSERT INTO tbl_decision_log 
           (job_id, decision_type, entity_type, entity_id, ai_recommended_value, actual_selected_value, override_flag, reason_code, justification, actor_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.jobId,
            "ESTIMATE_OVERRIDE",
            "job_card",
            payload.jobId,
            oldState,
            payload.newState,
            1,
            payload.overrideReasonCode || "SUPERVISOR_BYPASS",
            payload.overrideJustification || "Authorized manager override bypass.",
            payload.actorId,
          ]
        );
      }

      // 3. Resolve Queue, SLA metrics and completion timestamp
      const targetConfig = WORKFLOW_CONFIG[payload.newState];
      const targetQueue = targetConfig.targetQueue;
      
      // Calculate duration spent in old state
      let durationSeconds = 0;
      const [lastTransitions] = await db.execute(
        "SELECT transition_time FROM tbl_workflow_history WHERE job_id = ? ORDER BY history_id DESC LIMIT 1",
        [payload.jobId]
      ) as any[];
      
      if (lastTransitions && lastTransitions.length > 0) {
        const lastTime = new Date(lastTransitions[0].transition_time).getTime();
        durationSeconds = Math.max(0, Math.floor((Date.now() - lastTime) / 1000));
      }

      // Update fields
      const newWorkflowState = payload.newState;
      const newQueue = targetQueue;
      const newSlaStatus = "WITHIN_SLA"; // resets on entry to new state

      // 4. Perform database updates (No destructive schema changes)
      // Updates job status dynamically (Backwards Compatibility preservation)
      let legacyStatus = job.status;
      if (payload.newState === "INVOICED" || payload.newState === "GATE_OUT") {
        legacyStatus = "Invoiced";
      } else if (payload.newState === "FINAL_REVIEW") {
        legacyStatus = "Completed";
      } else if (payload.newState === "QC_PENDING" || payload.newState === "QC_FAILED") {
        legacyStatus = "Completed";
      } else if (payload.newState === "WIP_START") {
        legacyStatus = "Active";
      }

      await db.execute(
        `UPDATE job_cards 
         SET current_workflow_state = ?, current_queue = ?, sla_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE job_id = ?`,
        [newWorkflowState, newQueue, newSlaStatus, legacyStatus, payload.jobId]
      );

      // Increment rework_count if QC failed
      if (payload.newState === "QC_FAILED") {
        await db.execute("UPDATE job_cards SET rework_count = rework_count + 1 WHERE job_id = ?", [payload.jobId]);
      }

      // Calculate sequence number
      const [seqRows] = await db.execute(
        "SELECT COUNT(*) as count FROM tbl_workflow_history WHERE job_id = ?",
        [payload.jobId]
      ) as any[];
      const sequenceNumber = (seqRows[0]?.count || 0) + 1;

      // Validate event source
      const allowedSources = ["MANUAL", "ORACLE_IMPORT", "SYSTEM", "MOBILE", "QR", "CCTV", "AI", "API"];
      const eventSource = (payload.source || "SYSTEM").toUpperCase();
      if (!allowedSources.includes(eventSource)) {
        return { success: false, error: `Invalid event source: ${eventSource}` };
      }

      // Generate UUID
      const eventId = `EV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Get user display name
      let userName = payload.user;
      if (!userName) {
        const [empRows] = await db.execute("SELECT full_name FROM employees WHERE employee_id = ?", [payload.actorId]) as any[];
        userName = empRows && empRows[0] ? empRows[0].full_name : "SYSTEM";
      }

      await db.execute(
        `INSERT INTO tbl_workflow_history (
          job_id, old_state, new_state, queue, sla_status, etd, transition_by, 
          duration, reason, event_id, correlation_id, parent_event_id, 
          sequence_number, source_system, event_version, event_status, 
          event_category, source, event_type, user, role, workshop_id, payload,
          transition_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.jobId,
          oldState,
          newWorkflowState,
          newQueue,
          newSlaStatus,
          job.current_etd || null,
          payload.actorId,
          durationSeconds,
          payload.reason || "Workflow transition success.",
          eventId,
          payload.correlationId || logContext.correlationId || "SYSTEM",
          payload.parentEventId || null,
          sequenceNumber,
          payload.sourceSystem || "WMS-Core",
          "1.0",
          "PROCESSED",
          "Operational",
          eventSource,
          newWorkflowState,
          userName,
          payload.actorRole,
          job.workshop_id || 1,
          JSON.stringify({ old_state: oldState, new_state: newWorkflowState, queue: newQueue }),
          new Date()
        ]
      );

      // System Audit Trail
      await db.execute(
        `INSERT INTO tbl_audit_trail 
         (entity_type, entity_id, action_code, payload_diff, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          "job_card",
          payload.jobId,
          "STATUS_CHANGE",
          JSON.stringify({ oldState, newState: newWorkflowState, queue: newQueue }),
          payload.actorId,
        ]
      );

      // If transition represents a status warning alert
      if (payload.newState === "QC_FAILED") {
        await db.execute(
          `INSERT INTO tbl_notifications 
           (user_id, notification_type, message, priority, related_job_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            job.created_by,
            "QC_FAILED",
            `Job card #${job.job_card_no} failed QC. Redirecting to rework loop.`,
            "HIGH",
            payload.jobId,
          ]
        );
      }

      // 6. Publish event-driven domain communication
      await WorkflowEventPublisher.publish(
        payload.jobId,
        oldState,
        newWorkflowState,
        payload.actorId,
        payload.actorRole,
        logContext
      );

      WorkflowLogger.info("Workflow transition completed successfully.", logContext);
      return { success: true };

    } catch (err) {
      WorkflowLogger.error("Workflow transition failed due to internal error.", err, logContext);
      return { success: false, error: "Internal Workflow Engine error occurred." };
    }
  }
}
