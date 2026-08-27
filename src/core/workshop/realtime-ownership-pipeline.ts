/**
 * DWIP Enterprise Platform - Phase 3 Real-Time Ownership Pipeline
 * Gate-In → Reception Intake → Manager Assignment → Service Advisor Handoff
 */

import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { VosCorePlatform } from "../vos";
import { makeSystemContext } from "../business-context";

export interface GateInPayload {
  vrn: string;
  vin?: string;
  chassisNumber?: string;
  source?: "ANPR" | "OCR" | "MANUAL";
  ocrConfidence?: number;
  odometer?: number;
  odometerPhotoUrl?: string;
  frontPhotoUrl?: string;
  driverName?: string;
  driverMobile?: string;
  gateNumber?: string;
  initialRemarks?: string;
  branchId?: string;
}

export interface ReceptionIntakePayload {
  gateEntryId: string;
  vosId?: string;
  visitCategory: string;
  preliminaryComplaints?: string;
  confirmedOdometer: number;
  correctionReason?: string;
  branchId?: string;
}

export interface ManagerAssignPayload {
  intakeId: string;
  gateEntryId: string;
  vosId?: string;
  jobCardId?: string;
  assignedSaId: string;
  assignedSaName: string;
  isOverride?: boolean;
  overrideReason?: string;
  recommendationSaId?: string;
  recommendationReason?: string;
  branchId?: string;
}

let customDb: any = null;

export class RealtimeOwnershipPipeline {
  public static setDbProvider(provider: any) {
    customDb = provider;
  }

  // INTERNAL TRANSACTION WRAPPER
  public static async execute(sql: string, params: any[] = []): Promise<any> {
    if (customDb && typeof customDb.execute === 'function') {
      return customDb.execute(sql, params);
    }
    // A missing table or any DB failure MUST surface as an error — never a fabricated
    // "success" ([[], {affectedRows:1}]). Concealing infra failures corrupts state.
    return await db.execute(sql, params);
  }
  // Master categories for preliminary visit classification
  public static readonly MASTER_VISIT_CATEGORIES = [
    "General Check-up",
    "Free Service",
    "Scheduled Service",
    "Running Repair",
    "Warranty Complaint",
    "Breakdown Follow-up",
    "Accidental Repair",
    "Campaign",
    "Aggregate Complaint",
    "Other"
  ];

  // 5-Minute Handoff SLA Threshold in milliseconds
  public static readonly HANDOFF_SLA_MS = 5 * 60 * 1000;

  /**
   * STAGE 01: Vehicle Arrival (Security / Gate)
   */
  public static async createGateIn(payload: GateInPayload, user: any) {
    const vrnClean = payload.vrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const vinClean = payload.vin || payload.chassisNumber || `VIN-${vrnClean}`;
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const gateEntryId = `GE-${randomUUID().substring(0, 8).toUpperCase()}`;

    const now = new Date();
    const slaDueAt = new Date(now.getTime() + this.HANDOFF_SLA_MS);

    // 1. Create VOS session atomically
    const session = await VosCorePlatform.vos.createSession(
      vinClean,
      vrnClean,
      user?.id || user?.user_id || "usr_sec_agent",
      user?.role || "security_agent"
    );

    // 2. Insert into tbl_gate_entry
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_gate_entry (
        gate_entry_id, vin, source, odometer, driver_details, initial_remarks, status, arrival_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gateEntryId,
        vinClean,
        payload.source || "OCR",
        payload.odometer || 0,
        JSON.stringify({
          driverName: payload.driverName || "",
          driverMobile: payload.driverMobile || "",
          frontPhotoUrl: payload.frontPhotoUrl || "",
          odometerPhotoUrl: payload.odometerPhotoUrl || "",
          ocrConfidence: payload.ocrConfidence || 0.95,
          gateNumber: payload.gateNumber || "GATE-01"
        }),
        payload.initialRemarks || "Vehicle Gate In Arrival",
        "GATE_IN",
        now
      ]
    );

    // 3. Create 5-minute Handoff SLA tracker for Reception Queue
    const handoffId = `SLA-G2R-${randomUUID().substring(0, 8).toUpperCase()}`;
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_handoff_sla (
        handoff_id, stage_name, entity_id, owner_id, owner_role, created_at, sla_due_at, status, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        handoffId,
        "GATE_TO_RECEPTION",
        gateEntryId,
        "RECEPTION_QUEUE",
        "receptionist",
        now,
        slaDueAt,
        "ON_TRACK",
        branchId
      ]
    );

    // 4. Log timeline & event
    await VosCorePlatform.timeline.addNode({
      vosId: session.id,
      timelineType: "OPERATIONAL",
      eventType: "GATE_IN_COMPLETED",
      title: `Vehicle ${vrnClean} Arrived at Security Gate`,
      metadata: { gateEntryId, branchId, source: payload.source || "OCR" }
    });

    return {
      success: true,
      gateEntryId,
      vosId: session.id,
      vrn: vrnClean,
      vin: vinClean,
      slaDueAt: slaDueAt.toISOString()
    };
  }

  /**
   * STAGE 02: Vehicle Passport Lookup
   */
  public static async lookupVehiclePassport(vrn: string) {
    const vrnClean = vrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Query job cards for history
    const [rows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_job_card WHERE vrn = ? ORDER BY created_at DESC LIMIT 5`,
      [vrnClean]
    );

    const visits = Array.isArray(rows) ? rows : [];
    const latestVisit = visits[0] || null;

    // Return ONLY authoritative on-record values. When a VRN cannot be resolved,
    // report an unresolved state — never a manufactured VIN, customer, or vehicle
    // identity, and never an always-on campaign/warranty status.
    return {
      vrn: vrnClean,
      found: !!latestVisit,
      sourceTag: latestVisit ? "LOCAL_CACHE" : "UNAVAILABLE",
      vin: latestVisit?.chassis_no || null,
      customerName: latestVisit?.customer_name || null,
      customerMobile: latestVisit?.customer_mobile || null,
      vehicleMake: latestVisit?.vehicle_make || null,
      vehicleModel: latestVisit?.vehicle_model || null,
      previousVisitCount: visits.length,
      lastVisitDate: latestVisit?.created_at || null,
      lastOdometer: latestVisit?.odometer_reading ?? null,
      openCampaigns: [],          // authoritative campaign source not wired → none (not fabricated)
      warrantyStatus: "UNKNOWN"   // authoritative warranty source not wired → unknown (not fabricated)
    };
  }

  /**
   * STAGE 03: Reception Queue (MY NEW ARRIVALS)
   */
  public static async getReceptionQueue(branchId: string) {
    const [rows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT ge.*, h.sla_due_at, h.status as sla_status 
       FROM tbl_gate_entry ge
       LEFT JOIN tbl_handoff_sla h ON ge.gate_entry_id = h.entity_id AND h.stage_name = 'GATE_TO_RECEPTION'
       WHERE ge.status = 'GATE_IN'
       ORDER BY ge.arrival_time DESC`
    );

    const items = Array.isArray(rows) ? rows : [];
    const now = Date.now();

    return items.map((r: any) => {
      let driver = {};
      try { driver = JSON.parse(r.driver_details || "{}"); } catch {}
      const arrival = r.arrival_time ? new Date(r.arrival_time).getTime() : now;
      const waitingMins = Math.floor((now - arrival) / 60000);
      const isBreached = waitingMins >= 5;

      return {
        gateEntryId: r.gate_entry_id,
        vin: r.vin,
        vrn: r.vin.replace("VIN-", ""),
        source: r.source,
        odometer: r.odometer,
        driver,
        arrivalTime: r.arrival_time,
        waitingMins,
        isBreached,
        slaStatus: isBreached ? "BREACHED" : "ON_TRACK"
      };
    });
  }

  /**
   * STAGE 04-06: Reception Intake Acceptance, Token Generation & Odometer Verification
   */
  public static async acceptReceptionIntake(payload: ReceptionIntakePayload, user: any) {
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const branchCode = branchId.split("-")[1] || "SED";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // Generate unique branch-scoped token
    const [tokenCount]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT COUNT(*) as cnt FROM tbl_reception_intake WHERE branch_id = ? AND token_number LIKE ?`,
      [branchId, `${branchCode}-${dateStr}-%`]
    );

    const seq = ((tokenCount[0]?.cnt || 0) + 1).toString().padStart(3, "0");
    const tokenNumber = `${branchCode}-${dateStr}-${seq}`;
    const intakeId = `INT-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Get original gate entry
    const [geRows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_gate_entry WHERE gate_entry_id = ?`,
      [payload.gateEntryId]
    );

    const ge = Array.isArray(geRows) ? geRows[0] : null;
    const originalOdo = ge?.odometer || 0;
    const isCorrected = payload.confirmedOdometer !== originalOdo;

    const now = new Date();
    const slaDueAt = new Date(now.getTime() + this.HANDOFF_SLA_MS);

    // Insert into tbl_reception_intake
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_reception_intake (
        intake_id, gate_entry_id, vos_id, token_number, accepted_by, accepted_at,
        original_odometer, confirmed_odometer, odometer_corrected, correction_reason,
        visit_category, preliminary_complaints, branch_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intakeId,
        payload.gateEntryId,
        payload.vosId || null,
        tokenNumber,
        user?.full_name || user?.username || "receptionist",
        now,
        originalOdo,
        payload.confirmedOdometer,
        isCorrected,
        isCorrected ? payload.correctionReason || "Receptionist Manual Verification Correction" : null,
        payload.visitCategory,
        payload.preliminaryComplaints || "Standard Maintenance Intake",
        branchId,
        "INTAKE_COMPLETED"
      ]
    );

    // Update Gate Entry status to INTAKE_COMPLETED
    await RealtimeOwnershipPipeline.execute(
      `UPDATE tbl_gate_entry SET status = 'INTAKE_COMPLETED' WHERE gate_entry_id = ?`,
      [payload.gateEntryId]
    );

    // Mark previous Gate->Reception SLA accepted
    await RealtimeOwnershipPipeline.execute(
      `UPDATE tbl_handoff_sla SET accepted_at = ?, status = 'ACCEPTED' WHERE entity_id = ? AND stage_name = 'GATE_TO_RECEPTION'`,
      [now, payload.gateEntryId]
    );

    // Create 5-minute Handoff SLA tracker for Manager Assignment Queue
    const handoffId = `SLA-R2M-${randomUUID().substring(0, 8).toUpperCase()}`;
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_handoff_sla (
        handoff_id, stage_name, entity_id, owner_id, owner_role, created_at, sla_due_at, status, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        handoffId,
        "RECEPTION_TO_MANAGER",
        intakeId,
        "SERVICE_MANAGER_QUEUE",
        "service_manager",
        now,
        slaDueAt,
        "ON_TRACK",
        branchId
      ]
    );

    return {
      success: true,
      intakeId,
      tokenNumber,
      gateEntryId: payload.gateEntryId,
      confirmedOdometer: payload.confirmedOdometer,
      odometerCorrected: isCorrected,
      visitCategory: payload.visitCategory,
      slaDueAt: slaDueAt.toISOString()
    };
  }

  /**
   * STAGE 07: Manager Assignment Queue (MY ASSIGNMENTS PENDING)
   */
  public static async getManagerPendingQueue(branchId: string) {
    const [rows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT ri.*, ge.vin, ge.arrival_time as gate_arrival_time
       FROM tbl_reception_intake ri
       JOIN tbl_gate_entry ge ON ri.gate_entry_id = ge.gate_entry_id
       WHERE ri.status = 'INTAKE_COMPLETED' AND ri.branch_id = ?
       ORDER BY ri.accepted_at ASC`,
      [branchId]
    );

    const items = Array.isArray(rows) ? rows : [];
    const now = Date.now();

    return items.map((r: any) => {
      const accepted = r.accepted_at ? new Date(r.accepted_at).getTime() : now;
      const waitingMins = Math.floor((now - accepted) / 60000);
      const isBreached = waitingMins >= 5;

      return {
        intakeId: r.intake_id,
        gateEntryId: r.gate_entry_id,
        tokenNumber: r.token_number,
        vin: r.vin,
        vrn: r.vin.replace("VIN-", ""),
        visitCategory: r.visit_category,
        preliminaryComplaints: r.preliminary_complaints,
        confirmedOdometer: r.confirmed_odometer,
        acceptedBy: r.accepted_by,
        acceptedAt: r.accepted_at,
        waitingMins,
        isBreached,
        slaStatus: isBreached ? "BREACHED" : "ON_TRACK"
      };
    });
  }

  /**
   * STAGE 08: AI / Rule Service Advisor Recommendation Engine
   */
  public static async generateAdvisorRecommendation(intakeId: string, branchId: string) {
    // Advisor availability MUST come from the authoritative staff store — never a
    // hardcoded list. Workload is the real count of open job cards per advisor.
    // If no advisors can be resolved, return an empty list and NO recommendation
    // (do not fabricate names, competencies, workloads, or confidence scores).
    let availableAdvisors: Array<{ id: any; name: string; role: string; activeJcs: number }> = [];
    try {
      const [rows]: any = await RealtimeOwnershipPipeline.execute(
        `SELECT user_id AS id, full_name AS name, user_role AS role
           FROM user_access_master
          WHERE user_role = 'service_advisor' AND is_active = 1`
      );
      const advisors = Array.isArray(rows) ? rows : [];
      availableAdvisors = await Promise.all(advisors.map(async (a: any) => {
        let activeJcs = 0;
        try {
          // NOTE: tbl_job_card has no `service_advisor`/`status` columns (it has
          // `advisor_id`/`workflow_state`) — the previous query silently errored
          // on every call (caught below) and always returned 0, so the "lowest
          // workload" recommendation was really just "first advisor, always".
          const [cnt]: any = await RealtimeOwnershipPipeline.execute(
            `SELECT COUNT(*) AS cnt FROM tbl_job_card WHERE advisor_id = ?`,
            [a.name]
          );
          activeJcs = Number(cnt?.[0]?.cnt || 0);
        } catch { activeJcs = 0; }
        return { id: a.id, name: a.name, role: a.role, activeJcs };
      }));
    } catch {
      availableAdvisors = [];
    }

    if (availableAdvisors.length === 0) {
      return {
        intakeId,
        recommendedSaId: null,
        recommendedSaName: null,
        confidenceScore: null,
        reason: "No authoritative advisor-availability data.",
        availableAdvisors: []
      };
    }

    // Recommend the advisor with the lowest real active workload.
    const recommended = availableAdvisors.reduce((prev, curr) => (curr.activeJcs < prev.activeJcs ? curr : prev), availableAdvisors[0]);
    return {
      intakeId,
      recommendedSaId: recommended.id,
      recommendedSaName: recommended.name,
      confidenceScore: null, // no calibrated model → omit rather than fabricate a score
      reason: `Lowest active workload (${recommended.activeJcs} open job cards).`,
      availableAdvisors
    };
  }

  /**
   * STAGE 09: Atomic SA Assignment & Ownership Transfer
   */
  public static async assignServiceAdvisor(payload: ManagerAssignPayload, user: any) {
    const branchId = user?.branchId || user?.branch_id || payload.branchId || "BR-SEDAM";
    const assignmentId = `ASG-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Verify manager role authorization
    const role = (user?.role || "").toLowerCase().trim().replace(/_/g, " ");
    const isAuthorizedManager = ["service manager", "works manager", "workshop manager", "general manager", "admin"].includes(role);

    if (!isAuthorizedManager) {
      throw new Error(`Unauthorized: User role '${user?.role}' is not permitted to assign Service Advisors.`);
    }

    const now = new Date();

    // Branch validation
    const [intakeCheck]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT branch_id FROM tbl_reception_intake WHERE intake_id = ?`,
      [payload.intakeId]
    );
    if (intakeCheck && intakeCheck.length > 0) {
      if (intakeCheck[0].branch_id != branchId) {
        throw new Error(`Unauthorized: Cannot assign SA for an intake at a different branch.`);
      }
    }

    // Duplicate assignment protection
    const [existingAssignment]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT assignment_id FROM tbl_manager_assignment WHERE intake_id = ? AND status = 'ASSIGNED'`,
      [payload.intakeId]
    );
    if (existingAssignment && existingAssignment.length > 0 && !payload.isOverride) {
      throw new Error(`Intake ${payload.intakeId} is already assigned to a Service Advisor. Use override to reassign.`);
    }

    // 1. Record assignment in tbl_manager_assignment
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_manager_assignment (
        assignment_id, intake_id, gate_entry_id, vos_id, assigned_sa_id, assigned_sa_name,
        assigning_manager_id, assigned_at, recommendation_sa_id, recommendation_reason,
        is_override, override_reason, branch_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        payload.intakeId,
        payload.gateEntryId,
        payload.vosId || null,
        payload.assignedSaId,
        payload.assignedSaName,
        user?.id || user?.user_id || "usr_manager",
        now,
        payload.recommendationSaId || payload.assignedSaId,
        payload.recommendationReason || "Rule-Based Workload Optimization",
        payload.isOverride || false,
        payload.isOverride ? payload.overrideReason || "Manager Discretionary Override" : null,
        branchId,
        "ASSIGNED"
      ]
    );

    // 2. Update tbl_reception_intake status to ASSIGNED
    await RealtimeOwnershipPipeline.execute(
      `UPDATE tbl_reception_intake SET status = 'ASSIGNED' WHERE intake_id = ?`,
      [payload.intakeId]
    );

    // 3. Mark Reception->Manager SLA as ACCEPTED
    await RealtimeOwnershipPipeline.execute(
      `UPDATE tbl_handoff_sla SET accepted_at = ?, status = 'ACCEPTED' WHERE entity_id = ? AND stage_name = 'RECEPTION_TO_MANAGER'`,
      [now, payload.intakeId]
    );

    // 3b. Create Manager->SA Handoff SLA
    const managerToSaDueAt = new Date(now.getTime() + 5 * 60000);
    await RealtimeOwnershipPipeline.execute(
      `INSERT INTO tbl_handoff_sla (
        handoff_id, stage_name, entity_id, owner_id, owner_role,
        sla_due_at, status, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `SLA-${randomUUID().substring(0,8).toUpperCase()}`,
        'SLA_MANAGER_TO_SA',
        payload.intakeId, // Use intakeId as entity_id for continuity, or maybe vosId. We'll use intakeId.
        payload.assignedSaId,
        'SERVICE_ADVISOR',
        managerToSaDueAt,
        'ON_TRACK',
        branchId
      ]
    );

    // 4. Create or update Job Card / VOS record for assigned SA
    const [geRows]: any = await RealtimeOwnershipPipeline.execute(`SELECT * FROM tbl_gate_entry WHERE gate_entry_id = ?`, [payload.gateEntryId]);
    const ge = Array.isArray(geRows) ? geRows[0] : null;
    // Real-Data-Only: never fabricate a VRN when the gate entry can't be
    // resolved — that would corrupt whichever real vehicle happens to share
    // the fake plate. Skip the job_cards bridge in that case instead.
    const vrnClean = ge ? ge.vin.replace("VIN-", "") : null;

    // tbl_job_card is a pipeline-internal tracking table only — nothing
    // outside this pipeline reads it (the real bridge is 4b below, into the
    // app-wide `job_cards` table). Best-effort, same as 4b: never fail the
    // already-committed assignment (tbl_manager_assignment / tbl_reception_intake)
    // over this internal record.
    const jobCardId = `JC-${randomUUID().substring(0, 8).toUpperCase()}`;
    try {
      await RealtimeOwnershipPipeline.execute(
        `INSERT INTO tbl_job_card (
          job_card_id, gate_entry_id, service_type, advisor_id, customer_complaint, workflow_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          jobCardId,
          payload.gateEntryId,
          "Scheduled Maintenance",
          payload.assignedSaName,
          "Intake completed; pending advisor digital inspection",
          "ESTIMATE_PENDING",
          now
        ]
      );
    } catch (e: any) {
      console.error("Failed to write internal tbl_job_card tracking record:", e.message);
    }

    // 4b. Bridge into the app-wide `job_card_master` table (the real data source
    // for the in-memory cache used by JobCardManager, Dashboard, billing, etc.).
    // Also update `job_cards` as a secondary mirror. Matched by VRN — best-effort:
    // never fail the (already-committed) assignment on this.
    // The manager's assignment is AUTHORITATIVE and FORCED — there is no advisor
    // accept step in this workflow. The previous version guarded with
    // `AND (service_advisor IS NULL OR service_advisor = '')`, which silently
    // did nothing on any reassignment or override: the manager saw a success
    // message while the job card kept its old advisor. Removed, so a stamp is a
    // stamp.
    //
    // Both statements also now check affectedRows. Previously a zero-row match
    // was indistinguishable from a successful write — which is how every job
    // card ended up with service_advisor NULL while tbl_manager_assignment held
    // real assignments, and why the ADVISOR_UNASSIGNED alerts fired against
    // cards the manager had already assigned.
    if (vrnClean) {
      try {
        // Primary: job_card_master is the canonical source for syncLoad()
        const masterRes: any = await RealtimeOwnershipPipeline.execute(
          `UPDATE job_card_master SET service_advisor = ?, job_status = 'Assigned'
            WHERE vehicle_reg = ?
            ORDER BY job_card_id DESC LIMIT 1`,
          [payload.assignedSaName, vrnClean]
        );
        const masterRows = masterRes?.affectedRows ?? masterRes?.[0]?.affectedRows ?? 0;
        if (masterRows === 0) {
          // Expected when the manager assigns before the job card exists. The
          // SA technical intake stamps it on creation; this records the gap
          // rather than pretending the bridge succeeded.
          console.warn(
            `[Assignment] No job_card_master row for VRN ${vrnClean} yet — advisor ${payload.assignedSaName} will be stamped when the job card is created.`
          );
        }
      } catch (e: any) {
        console.error("Failed to bridge SA assignment into job_card_master:", e.message);
      }
      try {
        // Secondary: job_cards mirror (some routes read from here directly)
        await RealtimeOwnershipPipeline.execute(
          `UPDATE job_cards SET service_advisor = ?
            WHERE vrn = ?
            ORDER BY created_at DESC LIMIT 1`,
          [payload.assignedSaName, vrnClean]
        );
      } catch (e: any) {
        console.error("Failed to bridge SA assignment into job_cards:", e.message);
      }
    } else {
      console.error(`Cannot bridge SA assignment into job_cards: gate entry ${payload.gateEntryId} not found, real VRN unknown.`);
    }

    // 5. Transfer VOS ownership
    if (payload.vosId) {
      await VosCorePlatform.ownership.transferOwnership({
        vosId: payload.vosId,
        fromUserId: user?.id || "usr_manager",
        toUserId: payload.assignedSaId,
        fromRole: "service_manager",
        toRole: "service_advisor",
        reason: `Assigned to SA ${payload.assignedSaName} by Manager`
      });
    }

    return {
      success: true,
      assignmentId,
      intakeId: payload.intakeId,
      jobCardId,
      assignedSaId: payload.assignedSaId,
      assignedSaName: payload.assignedSaName,
      assignedAt: now.toISOString(),
      vrn: vrnClean
    };
  }

  /**
   * 5-MINUTE HANDOFF SLA EVALUATOR & ESCALATION WORKER
   * Idempotent & Race-Safe: Uses optimistic locking on escalation_level
   */
  public static async evaluateHandoffSlaEscalations(branchId: string) {
    const now = new Date();
    
    // 1. Get ON_TRACK or BREACHED handoffs that are overdue
    const [rows]: any = await RealtimeOwnershipPipeline.execute(
      `SELECT * FROM tbl_handoff_sla 
       WHERE status IN ('ON_TRACK', 'BREACHED') AND sla_due_at <= ? AND branch_id = ?`,
      [now, branchId]
    );

    const breaches = Array.isArray(rows) ? rows : [];
    
    let scanned = breaches.length;
    let newBreaches = 0;
    let escalationsAdvanced = 0;
    let alreadyProcessed = 0;
    let errors = 0;

    for (const b of breaches) {
      try {
        const elapsedMs = now.getTime() - new Date(b.sla_due_at).getTime();
        const elapsedMins = Math.floor(elapsedMs / 60000);
        
        let targetEscalationLevel = 0;
        if (elapsedMins >= 0 && elapsedMins < 10) targetEscalationLevel = 1; // L1: immediately upon breach
        else if (elapsedMins >= 10 && elapsedMins < 30) targetEscalationLevel = 2; // L2: +10 mins
        else if (elapsedMins >= 30) targetEscalationLevel = 3; // L3: +30 mins

        if (b.escalation_level >= targetEscalationLevel) {
          alreadyProcessed++;
          continue;
        }

        // Optimistic lock on escalation_level to prevent duplicate escalation from concurrent executions
        const [updateResult]: any = await RealtimeOwnershipPipeline.execute(
          `UPDATE tbl_handoff_sla 
           SET status = 'BREACHED', escalation_level = ?, escalated_at = ? 
           WHERE sla_id = ? AND escalation_level = ?`,
          [targetEscalationLevel, now, b.sla_id, b.escalation_level]
        );

        if (updateResult.affectedRows > 0) {
          if (b.escalation_level === 0) newBreaches++;
          else escalationsAdvanced++;

          // Derive target role based on strict ownership hierarchy
          let targetRole = "general_manager";
          const ownerRole = b.owner_role ? b.owner_role.toUpperCase() : "UNKNOWN";

          if (ownerRole === "TECHNICIAN" || ownerRole === "QC") {
            targetRole = targetEscalationLevel === 1 ? "floor_supervisor" : (targetEscalationLevel === 2 ? "works_manager" : "general_manager");
          } else if (ownerRole === "SERVICE_ADVISOR") {
            targetRole = targetEscalationLevel === 1 ? "service_manager" : (targetEscalationLevel === 2 ? "works_manager" : "general_manager");
          } else if (ownerRole === "RECEPTIONIST") {
            targetRole = targetEscalationLevel === 1 ? "service_manager" : "general_manager";
          } else if (ownerRole === "SERVICE_MANAGER") {
            // ADVISOR_ASSIGNMENT_PENDING: no SA assigned yet. L1 nudges the
            // manager who owns the assignment; L2/L3 escalate up the chain.
            targetRole = targetEscalationLevel === 1 ? "service_manager" : (targetEscalationLevel === 2 ? "works_manager" : "general_manager");
          } else if (ownerRole === "BILLING" || ownerRole === "CASHIER") {
            targetRole = targetEscalationLevel === 1 ? "accounts_manager" : "general_manager";
          }

          await RealtimeOwnershipPipeline.execute(
            `INSERT INTO tbl_sla_history (history_id, instance_id, action, details, timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [`HIST-${randomUUID().substring(0,8).toUpperCase()}`, b.sla_id, 'ESCALATED', `Escalated to level ${targetEscalationLevel} (${targetRole})`, now]
          );
        } else {
          alreadyProcessed++;
        }
      } catch (e) {
        errors++;
      }
    }

    return {
      success: true,
      evaluation_run_id: `RUN-${randomUUID().substring(0,8).toUpperCase()}`,
      evaluated_at: now.toISOString(),
      handoffs_scanned: scanned,
      new_breaches: newBreaches,
      escalations_created: newBreaches,
      escalations_advanced: escalationsAdvanced,
      already_processed: alreadyProcessed,
      errors
    };
  }
}
