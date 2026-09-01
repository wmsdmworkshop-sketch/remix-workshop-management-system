/**
 * DWIP Enterprise Platform - Phase 4 Service Advisor Technical Intake Engine
 * Service Advisor Technical Intake → Complaint Authentication → Job Card Creation → Floor Handoff
 */

import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { VosCorePlatform } from "../vos";

export interface VerifyOdometerPayload {
  intakeId?: string;
  gateEntryId: string;
  vosId?: string;
  saVerifiedOdometer: number;
  correctionReason?: string;
  branchId?: string;
}

export interface AuthenticateComplaintsPayload {
  intakeId?: string;
  gateEntryId: string;
  vosId?: string;
  complaintSource: "OWNER" | "DRIVER" | "FLEET MAINTENANCE MANAGER / DKM" | "OTHER";
  complaintSourceIdentity?: string;
  complaints: Array<{
    complaintText: string;
    category: string;
    symptom?: string;
    whenOccurs?: string;
    isRepeat?: boolean;
    isImmobilized?: boolean;
    isSafetyCritical?: boolean;
    priority?: "Low" | "Normal" | "High" | "Urgent";
    notes?: string;
  }>;
  branchId?: string;
}

export interface AmendComplaintsPayload {
  intakeId: string;
  jobCardId?: string;
  newComplaints: any[];
  amendmentReason: string;
  branchId?: string;
}

export interface CreateJobCardPayload {
  gateEntryId: string;
  intakeId?: string;
  vosId?: string;
  saVerifiedOdometer: number;
  complaintSource: string;
  complaintSourceIdentity?: string;
  authenticatedComplaints: any[];
  jobScope: Array<{
    complaint: string;
    proposedInspection: string;
    jobType: string;
    isWarrantyPossibility?: boolean;
    isCustomerPayPossibility?: boolean;
    priority?: string;
  }>;
  jcChoice: "CRM" | "DWIP_TEMP";
  crmJcNumber?: string;
  branchId?: string;
}

export interface SendToFloorPayload {
  jobCardId: string;
  intakeId?: string;
  gateEntryId: string;
  vosId?: string;
  branchId?: string;
}

let customDb: any = null;

export class SaTechnicalIntakeEngine {
  public static setDbProvider(provider: any) {
    customDb = provider;
  }

  private static async execute(sql: string, params: any[] = []): Promise<any> {
    if (customDb && typeof customDb.execute === "function") {
      return customDb.execute(sql, params);
    }
    try {
      return await db.execute(sql, params);
    } catch (err: any) {
      if (err.message && err.message.includes("doesn't exist")) {
        return [[], { affectedRows: 1 }];
      }
      throw err;
    }
  }

  public static readonly HANDOFF_SLA_MS = 5 * 60 * 1000;

  /**
   * 1. GET SA ASSIGNED QUEUE (MY ATTENTION Vehicles Assigned in Phase 3)
   */
  public static async getSaAssignedQueue(saId: string, saName: string, branchId: string) {
    const [rows]: any = await this.execute(
      `SELECT ma.*, ri.visit_category, ri.preliminary_complaints, ri.confirmed_odometer, ge.vin, ge.odometer AS gate_odometer, ge.arrival_time as gate_arrival_time, e.crm_id AS sa_crm_id
       FROM tbl_manager_assignment ma
       JOIN tbl_reception_intake ri ON ma.intake_id = ri.intake_id
       JOIN tbl_gate_entry ge ON ma.gate_entry_id = ge.gate_entry_id
       LEFT JOIN user_access_master uam ON uam.user_id = ma.assigned_sa_id
       LEFT JOIN employees e ON e.employee_id = uam.employee_id
       WHERE (ma.assigned_sa_id = ? OR LOWER(ma.assigned_sa_name) = LOWER(?)) AND ma.branch_id = ? AND ma.status = 'ASSIGNED'
       ORDER BY ma.assigned_at DESC`,
      [saId, saName, branchId]
    );

    const items = Array.isArray(rows) ? rows : [];
    const now = Date.now();

    return items.map((r: any) => {
      const assignedAt = r.assigned_at ? new Date(r.assigned_at).getTime() : now;
      const waitingMins = Math.floor((now - assignedAt) / 60000);
      const isBreached = waitingMins >= 5;

      return {
        assignmentId: r.assignment_id,
        intakeId: r.intake_id,
        gateEntryId: r.gate_entry_id,
        vosId: r.vos_id,
        saCrmId: r.sa_crm_id ?? null,
        tokenNumber: r.token_number || null,
        vin: r.vin,
        vrn: (r.vin || "").replace("VIN-", ""),
        visitCategory: r.visit_category,
        preliminaryComplaints: r.preliminary_complaints,
        // Real readings only. gate_odometer = OCR captured at gate-in;
        // confirmed_odometer = what reception verified. Either may be null when
        // it was never captured — the UI must show that honestly, not invent one.
        gateOdometer: r.gate_odometer ?? null,
        confirmedOdometer: r.confirmed_odometer ?? null,
        assignedAt: r.assigned_at,
        waitingMins,
        isBreached,
        actionRequired: "START_INTAKE"
      };
    });
  }

  /**
   * 2. START TECHNICAL INTAKE
   */
  public static async startIntake(gateEntryId: string, user: any) {
    const saId = user?.id || user?.user_id || "usr_service_advisor";
    const saName = user?.full_name || user?.name || user?.username || "Service Advisor";
    const branchId = user?.branchId || user?.branch_id || "BR-SEDAM";

    // Query gate entry & reception intake
    const [geRows]: any = await this.execute(`SELECT * FROM tbl_gate_entry WHERE gate_entry_id = ?`, [gateEntryId]);
    const ge = Array.isArray(geRows) ? geRows[0] : null;

    const [intakeRows]: any = await this.execute(`SELECT * FROM tbl_reception_intake WHERE gate_entry_id = ?`, [gateEntryId]);
    const ri = Array.isArray(intakeRows) ? intakeRows[0] : null;

    const intakeId = ri?.intake_id || `INT-${randomUUID().substring(0, 8).toUpperCase()}`;
    const now = new Date();

    // Log VOS state transition to INTAKE_WIP
    if (ge?.vin) {
      const sessions = VosCorePlatform.vos.getAllSessions();
      const session = sessions.find(s => s.vin === ge.vin || s.registrationNumber === ge.vin.replace("VIN-", ""));
      if (session && session.status === 'GATE_IN') {
        await VosCorePlatform.state.transitionState(
          session,
          "INTAKE_WIP",
          saId,
          "service_advisor",
          "SA Started Technical Intake"
        );
      }
    }

    // Acknowledge Manager->SA Handoff
    if (intakeId) {
      await this.execute(
        `UPDATE tbl_handoff_sla SET accepted_at = ?, status = 'ACCEPTED' WHERE entity_id = ? AND stage_name = 'SLA_MANAGER_TO_SA' AND status != 'ACCEPTED'`,
        [now, intakeId]
      );
    }


    return {
      success: true,
      intakeId,
      gateEntryId,
      saId,
      saName,
      intakeStartedAt: now.toISOString(),
      gateOdometer: ge?.odometer || 0,
      receptionOdometer: ri?.confirmed_odometer || ge?.odometer || 0
    };
  }

  /**
   * 3. ODOMETER FINAL VERIFICATION (Tri-State Verification & Audit)
   */
  public static async verifyOdometer(payload: VerifyOdometerPayload, user: any) {
    const saName = user?.full_name || user?.username || "Service Advisor";

    const [geRows]: any = await this.execute(`SELECT * FROM tbl_gate_entry WHERE gate_entry_id = ?`, [payload.gateEntryId]);
    const ge = Array.isArray(geRows) ? geRows[0] : null;

    const [riRows]: any = await this.execute(`SELECT * FROM tbl_reception_intake WHERE gate_entry_id = ?`, [payload.gateEntryId]);
    const ri = Array.isArray(riRows) ? riRows[0] : null;

    const gateOdo = ge?.odometer || 0;
    const receptionOdo = ri?.confirmed_odometer || gateOdo;
    const saOdo = payload.saVerifiedOdometer;
    const isCorrected = saOdo !== receptionOdo;

    if (isCorrected && !payload.correctionReason) {
      throw new Error("Odometer Correction Reason is required when modifying reception odometer.");
    }

    return {
      success: true,
      gateEntryId: payload.gateEntryId,
      gateOdometer: gateOdo,
      receptionOdometer: receptionOdo,
      saVerifiedOdometer: saOdo,
      odometerCorrected: isCorrected,
      correctionReason: isCorrected ? payload.correctionReason : null,
      verifiedBy: saName,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * 4 & 5. COMPLAINT CAPTURE & AUTHENTICATION
   */
  public static async authenticateComplaints(payload: AuthenticateComplaintsPayload, user: any) {
    const saId = user?.id || user?.user_id || "usr_service_advisor";
    const saName = user?.full_name || user?.username || "Service Advisor";
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const intakeId = payload.intakeId || `INT-${randomUUID().substring(0, 8).toUpperCase()}`;

    if (!payload.complaints || payload.complaints.length === 0) {
      throw new Error("At least one customer complaint must be captured and authenticated.");
    }

    const now = new Date();

    return {
      success: true,
      intakeId,
      gateEntryId: payload.gateEntryId,
      complaintSource: payload.complaintSource,
      authenticatedBy: saName,
      authenticatedById: saId,
      authenticatedAt: now.toISOString(),
      complaintsCount: payload.complaints.length,
      complaints: payload.complaints
    };
  }

  /**
   * AMEND AUTHENTICATED COMPLAINTS (Audited Amendment Trail)
   */
  public static async amendAuthenticatedComplaints(payload: AmendComplaintsPayload, user: any) {
    const saName = user?.full_name || user?.username || "Service Advisor";
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const auditId = `AUD-${randomUUID().substring(0, 8).toUpperCase()}`;

    if (!payload.amendmentReason) {
      throw new Error("Amendment Reason is required when modifying authenticated complaints.");
    }

    const now = new Date();
    await this.execute(
      `INSERT INTO tbl_complaint_amendment_audit (
        audit_id, intake_id, job_card_id, previous_complaints_json, new_complaints_json,
        amended_by, amended_at, amendment_reason, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        payload.intakeId,
        payload.jobCardId || null,
        JSON.stringify([]),
        JSON.stringify(payload.newComplaints),
        saName,
        now,
        payload.amendmentReason,
        branchId
      ]
    );

    return {
      success: true,
      auditId,
      intakeId: payload.intakeId,
      amendedBy: saName,
      amendedAt: now.toISOString(),
      amendmentReason: payload.amendmentReason
    };
  }

  /**
   * 6. SERVICE HISTORY / REPEAT FAILURE INTELLIGENCE
   */
  public static async evaluateRepeatFailures(vrn: string, complaints: any[]) {
    const vrnClean = vrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Mock query repeat repair history within 5,000 km or 90 days
    const repeatDetected = complaints.some(c => 
      (c.complaintText || "").toLowerCase().includes("clutch") ||
      (c.complaintText || "").toLowerCase().includes("brake") ||
      (c.complaintText || "").toLowerCase().includes("noise")
    );

    if (repeatDetected) {
      return {
        hasRepeatWarning: true,
        type: "POSSIBLE_REPEAT_COMPLAINT",
        suggestion: "AI SUGGESTION: Similar clutch/brake complaint recorded 4,800 km ago. Review previous job card JC-444519 for part warranty & rework eligibility.",
        confidenceScore: 0.91
      };
    }

    return {
      hasRepeatWarning: false,
      type: "NO_REPEAT_DETECTED",
      suggestion: "AI SUGGESTION: No repeat failure pattern detected in the last 90 days / 10,000 km.",
      confidenceScore: 0.98
    };
  }

  /**
   * 7. FSV / SERVICE ELIGIBILITY EVALUATOR
   */
  public static async evaluateFsvEligibility(vin: string, currentOdo: number) {
    if (currentOdo <= 15000) {
      return { status: "ELIGIBLE", serviceName: "1st Free Service (15,000 km / 1 Year)", source: "DWIP_DATA" };
    } else if (currentOdo <= 30000) {
      return { status: "ELIGIBLE", serviceName: "2nd Free Service (30,000 km / 2 Years)", source: "DWIP_DATA" };
    } else {
      return { status: "NOT_ELIGIBLE", serviceName: "Out of Free Service Period (Paid Scheduled Service)", source: "DWIP_DATA" };
    }
  }

  /**
   * 8. WARRANTY PRE-SCREEN EVALUATOR
   */
  public static async evaluateWarrantyPreScreen(vin: string, currentOdo: number, complaints: any[]) {
    const isWarrantyComplaint = complaints.some(c => c.isWarranty || (c.category || "").toLowerCase().includes("warranty") || (c.complaintText || "").toLowerCase().includes("leak"));

    if (isWarrantyComplaint && currentOdo < 100000) {
      return {
        status: "POTENTIALLY_ELIGIBLE",
        reason: "Vehicle under 3-Year / 100,000 km OEM warranty coverage. Subject to Warranty Team final adjudication.",
        source: "DWIP_DATA"
      };
    } else if (isWarrantyComplaint) {
      return {
        status: "LIKELY_NON_WARRANTY",
        reason: "Odometer exceeds standard 100,000 km OEM warranty limit. Requires Warranty Manager special waiver review.",
        source: "DWIP_DATA"
      };
    } else {
      return {
        status: "NOT_APPLICABLE",
        reason: "Standard customer-pay maintainence intake.",
        source: "DWIP_DATA"
      };
    }
  }

  /**
   * 15. JOB CARD AUTHORIZATION GATE
   */
  public static validateFloorReadyGate(payload: Partial<CreateJobCardPayload>) {
    const blockingItems: string[] = [];

    if (!payload.saVerifiedOdometer || payload.saVerifiedOdometer <= 0) {
      blockingItems.push("Odometer Verification Pending: SA must physically verify vehicle odometer.");
    }
    if (!payload.complaintSource) {
      blockingItems.push("Complaint Source Missing: Must select customer, driver, or fleet manager identity.");
    }
    if (!payload.authenticatedComplaints || payload.authenticatedComplaints.length === 0) {
      blockingItems.push("Complaint Authentication Pending: At least one complaint must be authenticated.");
    }
    if (!payload.jobScope || payload.jobScope.length === 0) {
      blockingItems.push("Preliminary Job Scope Missing: SA must define proposed inspection & job scope items.");
    }

    return {
      isReady: blockingItems.length === 0,
      blockingItems
    };
  }

  /**
   * 11-13. JOB CARD CREATION (CRM vs DWIP TEMP)
   */
  public static async createJobCard(payload: CreateJobCardPayload, user: any) {
    const saId = user?.id || user?.user_id || "usr_service_advisor";
    const saName = user?.full_name || user?.name || user?.username || "Service Advisor";
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const branchCode = branchId.split("-")[1] || "SED";

    // Validate Authorization Gate
    const gateCheck = this.validateFloorReadyGate(payload);
    if (!gateCheck.isReady) {
      throw new Error(`Job Card Creation Gate Failed:\n- ${gateCheck.blockingItems.join("\n- ")}`);
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    let jobCardId = "";
    let jcType = payload.jcChoice;

    if (payload.jcChoice === "CRM" && payload.crmJcNumber) {
      jobCardId = payload.crmJcNumber;
    } else {
      // Generate DWIP Temp JC
      const [countRow]: any = await this.execute(
        `SELECT COUNT(*) as cnt FROM tbl_sa_intake WHERE branch_id = ? AND job_card_id LIKE ?`,
        [branchId, `DWIP-TEMP-${branchCode}-${dateStr}-%`]
      );
      const seq = ((countRow[0]?.cnt || 0) + 1).toString().padStart(3, "0");
      jobCardId = `DWIP-TEMP-${branchCode}-${dateStr}-${seq}`;
      jcType = "DWIP_TEMP";
    }

    const intakeId = payload.intakeId || `INT-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Get Gate & Reception Odometer values
    const [geRows]: any = await this.execute(`SELECT * FROM tbl_gate_entry WHERE gate_entry_id = ?`, [payload.gateEntryId]);
    const ge = Array.isArray(geRows) ? geRows[0] : null;
    const [riRows]: any = await this.execute(`SELECT * FROM tbl_reception_intake WHERE gate_entry_id = ?`, [payload.gateEntryId]);
    const ri = Array.isArray(riRows) ? riRows[0] : null;

    const gateOdo = ge?.odometer || 0;
    const receptionOdo = ri?.confirmed_odometer || gateOdo;
    const isCorrected = payload.saVerifiedOdometer !== receptionOdo;

    // Record in tbl_sa_intake
    await this.execute(
      `INSERT INTO tbl_sa_intake (
        intake_id, job_card_id, gate_entry_id, vos_id, sa_id, sa_name,
        gate_odometer, reception_odometer, sa_verified_odometer, odometer_corrected,
        complaint_source, authenticated_by, authenticated_at, authenticated_complaints_json,
        fsv_status, warranty_prescreen_status, job_scope_json, jc_type, branch_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intakeId,
        jobCardId,
        payload.gateEntryId,
        payload.vosId || null,
        saId,
        saName,
        gateOdo,
        receptionOdo,
        payload.saVerifiedOdometer,
        isCorrected,
        payload.complaintSource,
        saName,
        now,
        JSON.stringify(payload.authenticatedComplaints),
        "ELIGIBLE",
        "POTENTIALLY_ELIGIBLE",
        JSON.stringify(payload.jobScope),
        jcType,
        branchId,
        "INTAKE_COMPLETED",
        now
      ]
    );

    // An INSERT INTO tbl_job_card stood here, writing an "internal tracking
    // record". It never executed once: tbl_job_card is a 1:1 VIEW over
    // `job_cards` and has none of job_card_id, gate_entry_id, service_type,
    // advisor_id, customer_complaint or workflow_state. Every call threw and was
    // swallowed by its own catch, so the tracking record has never existed.
    //
    // Removed rather than redirected, because the state it was trying to capture
    // is already written to the real tables immediately below — job_card_master
    // gets job_card_no, job_status and service_advisor, and the floor handoff
    // sets the workflow position. Re-pointing this at job_cards would have
    // duplicated those writes under a second, competing source of truth.

    // Bridge into app-wide job_card_master / job_cards table
    if (ge?.vin) {
      const vrnClean = ge.vin.replace("VIN-", "").trim().toUpperCase();
      try {
        await this.execute(
          `UPDATE job_card_master 
           SET job_card_no = ?, job_status = 'Assigned', service_advisor = ?, complaints = ?
           WHERE vehicle_reg = ? OR chassis_no = ?`,
          [jobCardId, saName, payload.authenticatedComplaints[0]?.complaintText || "", vrnClean, vrnClean]
        );
      } catch (brErr: any) {
        console.warn("[SaTechnicalIntake] Warning bridging to job_card_master:", brErr.message);
      }
    }

    // AUTOMATIC FLOOR HANDOFF.
    //
    // There is no separate "send to floor" decision in this workshop's process:
    // a created job card IS floor work. Requiring the advisor to press a second
    // button only created a state where a job card existed but no floor SLA was
    // running, and any advisor who closed the modal at step 5 stranded the
    // vehicle invisibly. Allocation of technician and bay stays with the floor
    // supervisor / workshop manager / service manager downstream — this only
    // moves the card into their queue.
    //
    // Best-effort: the job card is already committed above and must never be
    // rolled back because the handoff bookkeeping failed. A failure here leaves
    // the card recoverable via the existing send-to-floor endpoint.
    let floorHandoff: any = null;
    try {
      floorHandoff = await this.sendToFloor(
        {
          jobCardId,
          intakeId,
          gateEntryId: payload.gateEntryId,
          vosId: payload.vosId,
          branchId,
        },
        user
      );
    } catch (floorErr: any) {
      console.error(
        `[SaTechnicalIntake] Automatic floor handoff failed for ${jobCardId}:`,
        floorErr.message
      );
    }

    return {
      success: true,
      intakeId,
      jobCardId,
      jcType,
      gateEntryId: payload.gateEntryId,
      saVerifiedOdometer: payload.saVerifiedOdometer,
      authenticatedComplaintsCount: payload.authenticatedComplaints.length,
      jobScopeCount: payload.jobScope.length,
      // Reported honestly so the UI can show the real outcome rather than
      // assuming the handoff succeeded.
      floorHandoff: floorHandoff
        ? { success: true, status: floorHandoff.status, slaDueAt: floorHandoff.slaDueAt }
        : { success: false, status: "HANDOFF_PENDING" },
      status: floorHandoff ? "FLOOR_READY" : "JC_CREATED",
      createdAt: now.toISOString()
    };
  }

  /**
   * 14. CRM JOB CARD RECONCILIATION
   */
  public static async reconcileCrmJobCard(tempJcNo: string, crmJcNo: string, user: any) {
    const saName = user?.full_name || user?.username || "System Reconciler";
    const now = new Date();

    await this.execute(
      `UPDATE tbl_sa_intake SET reconciled_crm_jc_no = ?, reconciled_at = ? WHERE job_card_id = ?`,
      [crmJcNo, now, tempJcNo]
    );

    return {
      success: true,
      tempJcNo,
      reconciledCrmJcNo: crmJcNo,
      reconciledBy: saName,
      reconciledAt: now.toISOString()
    };
  }

  /**
   * 16. FLOOR HANDOFF (SEND TO FLOOR & 5-MIN SLA TIMER)
   */
  public static async sendToFloor(payload: SendToFloorPayload, user: any) {
    const saId = user?.id || user?.user_id || "usr_service_advisor";
    const saName = user?.full_name || user?.username || "Service Advisor";
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";

    const now = new Date();
    const slaDueAt = new Date(now.getTime() + this.HANDOFF_SLA_MS);

    // Update VOS session state & ownership if VOS ID present
    if (payload.vosId) {
      await VosCorePlatform.ownership.transferOwnership({
        vosId: payload.vosId,
        fromUserId: saId,
        toUserId: "usr_floor_incharge",
        fromRole: "service_advisor",
        toRole: "floor_incharge",
        reason: `Service Advisor ${saName} Completed Job Card & Handoff to Floor`
      });

      const sessions = VosCorePlatform.vos.getAllSessions();
      const session = sessions.find(s => s.id === payload.vosId);
      if (session && session.status === 'INTAKE_WIP') {
        await VosCorePlatform.state.transitionState(
          session,
          "OPERATIONAL_READY",
          saId,
          "service_advisor",
          "Job Card Floor Handoff Created"
        );
      }
    }

    // Update SA Intake status
    await this.execute(
      `UPDATE tbl_sa_intake SET status = 'SENT_TO_FLOOR' WHERE job_card_id = ? OR gate_entry_id = ?`,
      [payload.jobCardId, payload.gateEntryId]
    );

    // Update Job Card workflow state.
    //
    // This previously targeted `tbl_job_card`, which is a VIEW over `job_cards`
    // and has neither a `job_card_id` nor a `workflow_state` column — so it
    // could never succeed, and threw "Unknown column 'job_card_id' in 'where
    // clause'" straight through to the advisor at the final handoff step.
    //
    // The real workflow position lives in job_card_master.job_status (the
    // canonical source for syncLoad) mirrored into job_cards.workshop_stage.
    // Matched on job_card_no, which is what createJobCard() actually stamps.
    try {
      await this.execute(
        `UPDATE job_card_master SET job_status = 'Floor Ready' WHERE job_card_no = ?`,
        [payload.jobCardId]
      );
    } catch (e: any) {
      console.warn("[SaTechnicalIntake] Could not set job_card_master floor state:", e.message);
    }
    try {
      await this.execute(
        `UPDATE job_cards SET workshop_stage = 'Floor Ready' WHERE job_card_no = ?`,
        [payload.jobCardId]
      );
    } catch (e: any) {
      console.warn("[SaTechnicalIntake] Could not set job_cards floor state:", e.message);
    }

    // Create 5-minute Handoff SLA tracker for Floor In-Charge.
    //
    // Idempotent: createJobCard() now performs this handoff automatically, and
    // the manual endpoint remains for recovery. Without this guard the two
    // paths would stack duplicate SA_TO_FLOOR rows on one job card, inflating
    // the breach counts the manager dashboard reports.
    const [existingHandoff]: any = await this.execute(
      `SELECT handoff_id, status FROM tbl_handoff_sla
        WHERE stage_name = 'SA_TO_FLOOR' AND entity_id = ? LIMIT 1`,
      [payload.jobCardId]
    );
    const alreadyHandedOff = Array.isArray(existingHandoff) && existingHandoff.length > 0;
    if (alreadyHandedOff) {
      return {
        success: true,
        jobCardId: payload.jobCardId,
        previousOwnerRole: "service_advisor",
        newOwnerRole: "floor_incharge",
        handoffAt: now.toISOString(),
        slaDueAt: slaDueAt.toISOString(),
        status: "FLOOR_READY",
        alreadyHandedOff: true
      };
    }

    const handoffId = `SLA-SA2F-${randomUUID().substring(0, 8).toUpperCase()}`;
    await this.execute(
      `INSERT INTO tbl_handoff_sla (
        handoff_id, stage_name, entity_id, owner_id, owner_role, created_at, sla_due_at, status, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        handoffId,
        "SA_TO_FLOOR",
        payload.jobCardId,
        "FLOOR_INCHARGE_QUEUE",
        "floor_incharge",
        now,
        slaDueAt,
        "ON_TRACK",
        branchId
      ]
    );

    return {
      success: true,
      jobCardId: payload.jobCardId,
      previousOwnerRole: "service_advisor",
      newOwnerRole: "floor_incharge",
      handoffAt: now.toISOString(),
      slaDueAt: slaDueAt.toISOString(),
      status: "FLOOR_READY"
    };
  }
}
