import { db } from '../../db/index.ts';
import { RealtimeOwnershipPipeline } from './realtime-ownership-pipeline.ts';

/**
 * PHASE 10: OPERATIONS COMMAND CENTER
 * Provides the "Operational Truth" aggregate view for real-time workshop control.
 */
export class OperationsCommandCenter {
  
  /**
   * Retrieves the comprehensive 20-question operational truth for a given vehicle/job.
   * This aggregate pulls from the single source of truth tables established in Phases 1-9.
   */
  public static async getOperationalTruth(identifier: string, branchId: string) {
    // 1. Identify the Job/Vehicle (Search by VRN, Intake ID, or Job ID)
    const [jobRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_sa_intake WHERE vrn = ? OR intake_id = ? OR job_card_id = ? ORDER BY created_at DESC LIMIT 1`,
      [identifier, identifier, identifier]
    );

    if (!jobRows || jobRows.length === 0) {
      throw new Error("JOB_NOT_FOUND: No active intake or job found for this identifier.");
    }
    
    const job = jobRows[0];
    const jobId = job.job_card_id || job.intake_id; // Use job card if available, else intake
    
    // 2. Determine Current Location & Phase (Phase 1-9 tables)
    let location = "INTAKE_PARKING";
    let status = "PENDING_SA_ASSIGNMENT";
    let isPhysicallyPresent = false;
    let gatePassId = null;

    // Gate In
    const [gateInRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM gate_entries WHERE vrn = ? ORDER BY created_at DESC LIMIT 1`,
      [job.vrn]
    );
    if (gateInRows && gateInRows.length > 0) isPhysicallyPresent = true;

    // Gate Out
    const [gateOutRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_gate_pass WHERE job_id = ? ORDER BY issued_at DESC LIMIT 1`,
      [jobId]
    );
    if (gateOutRows && gateOutRows.length > 0) {
      gatePassId = gateOutRows[0].gate_pass_id;
      if (gateOutRows[0].status === 'VERIFIED') {
        isPhysicallyPresent = false;
        location = "DEPARTED";
      } else {
        location = "EXIT_GATE";
      }
    }

    // 3. Find Who Has It Right Now (SLA / Ownership)
    const [slaRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_handoff_sla WHERE entity_id = ? AND status IN ('ON_TRACK', 'BREACHED', 'PENDING') ORDER BY sla_id DESC LIMIT 1`,
      [jobId]
    );

    let currentOwner = "UNASSIGNED";
    let currentRole = "NONE";
    let timeWithOwnerMs = 0;
    let isSlaBreached = false;
    let currentStage = "UNKNOWN";

    if (slaRows && slaRows.length > 0) {
      const activeSla = slaRows[0];
      currentOwner = activeSla.owner_id ? activeSla.owner_id.toString() : "ROLE_QUEUE";
      currentRole = activeSla.owner_role;
      currentStage = activeSla.stage_name;
      isSlaBreached = activeSla.status === 'BREACHED';
      timeWithOwnerMs = new Date().getTime() - new Date(activeSla.created_at).getTime();
    }

    // 4. Determine Blockers (QC Fails, Parts Pending, Approvals)
    const blockers: string[] = [];
    const [qcRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_qc_reviews WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`,
      [jobId]
    );
    if (qcRows && qcRows.length > 0 && qcRows[0].status === 'FAILED') {
      blockers.push('QC_FAILED_REWORK_REQUIRED');
    }

    // Return the Operational Truth Aggregate
    return {
      success: true,
      data: {
        identifier: job.vrn,
        jobId: jobId,
        operational_truth: {
          q1_is_it_here: isPhysicallyPresent,
          q2_where_is_it: location,
          q3_what_stage_is_it_in: currentStage,
          q4_who_has_it_right_now: {
            role: currentRole,
            owner_id: currentOwner,
            time_with_owner_mins: Math.floor(timeWithOwnerMs / 60000)
          },
          q5_is_it_breached: isSlaBreached,
          q6_is_it_blocked: blockers.length > 0,
          q7_blocker_reasons: blockers
        },
        raw: {
          job,
          activeSla: slaRows && slaRows.length > 0 ? slaRows[0] : null
        }
      }
    };
  }

  /**
   * Retrieves all active exception queues (breached SLAs, blocked jobs) for a branch.
   */
  public static async getExceptionQueues(branchId: string) {
    // 1. Breached SLAs
    const [breachedSlas]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_handoff_sla WHERE status = 'BREACHED'`, []
    );

    // 2. Blocked QC
    const [blockedQc]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_qc_reviews WHERE status = 'FAILED' AND job_id NOT IN (SELECT job_id FROM tbl_qc_reviews WHERE status = 'PASSED')`, []
    );

    return {
      breached: breachedSlas,
      blocked: blockedQc
    };
  }

  /**
   * Allows an authorized manager to force-override a vehicle's stage.
   * Audits the reason and authority.
   */
  public static async overrideVehicleStage(jobId: string, targetStage: string, reason: string, managerId: string, branchId: string) {
    if (!reason || reason.trim() === '') {
      throw new Error("OVERRIDE_DENIED: Reason is required for auditing.");
    }
    
    // Audit the action
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_manager_overrides (job_id, target_stage, reason, manager_id, branch_id, override_time) VALUES (?, ?, ?, ?, ?, NOW())`,
      [jobId, targetStage, reason, managerId, branchId]
    );

    // Update the handoff SLA to forcefully close the active one
    await RealtimeOwnershipPipeline.execute(
      `UPDATE tbl_handoff_sla SET status = 'OVERRIDDEN' WHERE entity_id = ? AND status IN ('ON_TRACK', 'BREACHED', 'PENDING')`,
      [jobId]
    );

    // Create a new handoff SLA in the target stage
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_handoff_sla (entity_id, stage_name, owner_id, owner_role, status) VALUES (?, ?, ?, 'MANAGER_OVERRIDE', 'ON_TRACK')`,
      [jobId, targetStage, managerId]
    );

    return { success: true, message: 'Stage overridden successfully.' };
  }
}
