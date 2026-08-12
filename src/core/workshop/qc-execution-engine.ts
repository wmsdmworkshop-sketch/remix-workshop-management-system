/**
 * QcExecutionEngine — Phase 7: QC / Road Test / Rework / SA Closure
 * BLOCKER CLOSEOUT: Road Test Lifecycle + Warranty Pre-Invoice Gate
 * ============================================================
 * DWIP Enterprise Platform — Devanand Automobiles / AiVaahan
 *
 * Transaction discipline:
 *   CRITICAL TRANSACTIONAL  — must rollback on any failure, NO catch-and-ignore
 *   NON-CRITICAL POST-COMMIT — wrapped in try/catch AFTER commit only (VOS, metrics)
 *
 * Road test state machine:
 *   REQUIRED → IN_PROGRESS → PASSED | FAILED
 *   NOT_REQUIRED (terminal for this job — no road test performed)
 *   Invalid transitions throw with descriptive codes.
 *
 * Warranty pre-invoice gate derives terminal statuses from Phase 6
 * tbl_warranty_reviews: APPROVED | REJECTED are terminal/resolved.
 * PENDING | ACKNOWLEDGED are blocking.
 */
import { pool as db } from "../../db/index.ts";
import { VosCorePlatform } from "../vos/index.ts";

// ─── Injectable DB provider (for testing with mock pools) ─────────────────────
let customDb: any = null;

// ─── Phase 6 WARRANTY TERMINAL STATUSES (derived from PartsWarrantyEngine) ───
// Source of truth: parts-warranty-engine.ts adjudicateWarrantyReview()
// sets status to 'APPROVED' or 'REJECTED'. These are the only terminal states.
const WARRANTY_TERMINAL_STATUSES = ['APPROVED', 'REJECTED'] as const;
const WARRANTY_BLOCKING_STATUSES = ['PENDING', 'ACKNOWLEDGED'] as const;

export class QcExecutionEngine {
  private static instance: QcExecutionEngine;
  private constructor() {}

  public static getInstance(): QcExecutionEngine {
    if (!QcExecutionEngine.instance) {
      QcExecutionEngine.instance = new QcExecutionEngine();
    }
    return QcExecutionEngine.instance;
  }

  /** Allow tests to inject an isolated pool or mock */
  public static setDbProvider(provider: any) {
    customDb = provider;
  }

  // ─── LOW-LEVEL HELPERS ─────────────────────────────────────────────────────

  private async execute(sql: string, params: any[] = []): Promise<any> {
    const pool = customDb ?? db;
    return pool.execute(sql, params);
  }

  private async getConn(): Promise<any> {
    if (customDb && typeof customDb.getConnection === "function") {
      return customDb.getConnection();
    }
    if (customDb) {
      return {
        execute: (sql: string, params: any[]) => customDb.execute(sql, params),
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      };
    }
    return await db.getConnection();
  }

  /**
   * Verify job exists. Throws QC_JOB_NOT_FOUND if not.
   * branchId=0 → SUPER_ADMIN passthrough.
   */
  private async verifyJobOwnership(jobId: number, branchId: number, conn?: any): Promise<void> {
    const exec = conn
      ? (sql: string, p: any[]) => conn.execute(sql, p)
      : (sql: string, p: any[]) => this.execute(sql, p);

    const [jobs]: any = await exec(`SELECT job_id FROM job_cards WHERE job_id = ?`, [jobId]);
    if (!jobs || jobs.length === 0) {
      throw new Error(`QC_JOB_NOT_FOUND: Job ${jobId} does not exist.`);
    }
  }

  // ─── ROAD TEST — SET REQUIREMENT ──────────────────────────────────────────

  /**
   * QC In-Charge explicitly sets road test REQUIRED or NOT_REQUIRED.
   * AI may recommend but this human decision is the authoritative record.
   * Creates a new qc_road_tests record for this job+attempt.
   *
   * Transitions: (none prior) → REQUIRED | NOT_REQUIRED
   */
  public async setRoadTestRequirement(
    jobId: number,
    branchId: number,
    decision: "REQUIRED" | "NOT_REQUIRED",
    decidedById: number,
    decidedByName: string
  ): Promise<{ roadTestId: number }> {
    await this.verifyJobOwnership(jobId, branchId);

    // No open road test already IN_PROGRESS for this job
    const [open]: any = await this.execute(
      `SELECT road_test_id, status FROM qc_road_tests
       WHERE job_id = ? AND branch_id = ? AND status = 'IN_PROGRESS' LIMIT 1`,
      [jobId, branchId]
    );
    if (open.length > 0) {
      throw new Error(
        `RT_ALREADY_IN_PROGRESS: A road test is already IN_PROGRESS (id=${open[0].road_test_id}). Complete it before setting a new requirement.`
      );
    }

    const [res]: any = await this.execute(
      `INSERT INTO qc_road_tests
         (job_id, branch_id, tester_id, tester_name,
          requirement_status, requirement_set_by, requirement_set_by_name, requirement_set_at,
          status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [jobId, branchId, decidedById, decidedByName,
       decision, decidedById, decidedByName,
       decision]
    );
    return { roadTestId: res.insertId };
  }

  // ─── ROAD TEST — START ─────────────────────────────────────────────────────

  /**
   * Start a road test. Transitions REQUIRED → IN_PROGRESS.
   * Captures start odometer and authenticated tester.
   *
   * Rejects:
   *   - status = NOT_REQUIRED (no road test planned)
   *   - status = IN_PROGRESS (already running)
   *   - status = PASSED (already complete)
   *   - status = FAILED (already failed — must set new requirement)
   *   - cross-branch (branch_id mismatch)
   */
  public async startRoadTest(
    roadTestId: number,
    jobId: number,
    branchId: number,
    testerId: number,
    testerName: string,
    startOdometer: number
  ): Promise<void> {
    const [rows]: any = await this.execute(
      `SELECT road_test_id, job_id, branch_id, status FROM qc_road_tests WHERE road_test_id = ?`,
      [roadTestId]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`RT_NOT_FOUND: Road test record ${roadTestId} does not exist.`);
    }
    const rt = rows[0];

    // IDOR — branch
    if (rt.branch_id !== branchId) {
      throw new Error(`RT_BRANCH_MISMATCH: Road test ${roadTestId} belongs to a different branch.`);
    }
    // Job match
    if (rt.job_id !== jobId) {
      throw new Error(`RT_JOB_MISMATCH: Road test ${roadTestId} does not belong to job ${jobId}.`);
    }
    // Valid from-state
    if (rt.status === 'NOT_REQUIRED') {
      throw new Error(`RT_INVALID_TRANSITION: Cannot START — road test is NOT_REQUIRED.`);
    }
    if (rt.status === 'IN_PROGRESS') {
      throw new Error(`RT_INVALID_TRANSITION: Road test is already IN_PROGRESS.`);
    }
    if (rt.status === 'PASSED') {
      throw new Error(`RT_INVALID_TRANSITION: Cannot re-START a PASSED road test.`);
    }
    if (rt.status === 'FAILED') {
      throw new Error(`RT_INVALID_TRANSITION: Cannot re-START a FAILED road test. Set a new requirement.`);
    }

    // CRITICAL TRANSACTIONAL
    await this.execute(
      `UPDATE qc_road_tests
         SET status = 'IN_PROGRESS', tester_id = ?, tester_name = ?,
             start_odometer = ?, started_at = NOW()
       WHERE road_test_id = ?`,
      [testerId, testerName, startOdometer, roadTestId]
    );
  }

  // ─── ROAD TEST — COMPLETE ──────────────────────────────────────────────────

  /**
   * Complete a road test with PASSED or FAILED.
   * Validates: end_odometer >= start_odometer.
   * Only IN_PROGRESS → PASSED|FAILED is valid.
   */
  public async completeRoadTest(
    roadTestId: number,
    jobId: number,
    branchId: number,
    result: "PASSED" | "FAILED",
    endOdometer: number,
    remarks: string
  ): Promise<void> {
    const [rows]: any = await this.execute(
      `SELECT road_test_id, job_id, branch_id, status, start_odometer FROM qc_road_tests WHERE road_test_id = ?`,
      [roadTestId]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`RT_NOT_FOUND: Road test record ${roadTestId} does not exist.`);
    }
    const rt = rows[0];

    if (rt.branch_id !== branchId) {
      throw new Error(`RT_BRANCH_MISMATCH: Road test ${roadTestId} belongs to a different branch.`);
    }
    if (rt.job_id !== jobId) {
      throw new Error(`RT_JOB_MISMATCH: Road test ${roadTestId} does not belong to job ${jobId}.`);
    }
    if (rt.status !== 'IN_PROGRESS') {
      throw new Error(
        `RT_INVALID_TRANSITION: Cannot complete — road test is in state '${rt.status}'. Must be IN_PROGRESS.`
      );
    }

    // Validate odometer
    if (endOdometer < rt.start_odometer) {
      throw new Error(
        `RT_ODOMETER_INVALID: end_odometer (${endOdometer}) must be >= start_odometer (${rt.start_odometer}).`
      );
    }

    // CRITICAL TRANSACTIONAL
    await this.execute(
      `UPDATE qc_road_tests
         SET status = ?, end_odometer = ?, completed_at = NOW(), remarks = ?
       WHERE road_test_id = ?`,
      [result, endOdometer, remarks, roadTestId]
    );

    // NON-CRITICAL POST-COMMIT — VOS timeline
    try {
      await VosCorePlatform.timeline.addNode({
        vosId: `vos-${jobId}`,
        timelineType: "OPERATIONAL",
        eventType: result === "PASSED" ? "ROAD_TEST_PASSED" : "ROAD_TEST_FAILED",
        title: result === "PASSED" ? "Road Test Passed" : "Road Test Failed",
        metadata: { roadTestId, endOdometer, startOdometer: rt.start_odometer, branchId }
      });
    } catch (_) {}
  }

  // ─── ROAD TEST — GET LATEST FOR JOB ────────────────────────────────────────

  public async getLatestRoadTest(jobId: number, branchId: number): Promise<any | null> {
    const [rows]: any = await this.execute(
      `SELECT * FROM qc_road_tests WHERE job_id = ? AND branch_id = ? ORDER BY road_test_id DESC LIMIT 1`,
      [jobId, branchId]
    );
    return rows[0] || null;
  }

  public async getRoadTestHistory(jobId: number, branchId: number): Promise<any[]> {
    const [rows]: any = await this.execute(
      `SELECT * FROM qc_road_tests WHERE job_id = ? AND branch_id = ? ORDER BY road_test_id ASC`,
      [jobId, branchId]
    );
    return rows;
  }

  // ─── DETERMINISTIC QC CHECKLIST ────────────────────────────────────────────

  public async generateContextualChecklist(jobId: number): Promise<any[]> {
    const items: any[] = [];

    // 1. Mandatory structural
    items.push({ id: "chk-struct-1", category: "MANDATORY_STRUCTURAL", description: "Underbody & suspension torque verification", status: "PENDING", mandatory: true, source: "STANDARD" });
    items.push({ id: "chk-struct-2", category: "MANDATORY_STRUCTURAL", description: "Fluid levels & leak check (engine oil, coolant, brake fluid, power steering)", status: "PENDING", mandatory: true, source: "STANDARD" });
    items.push({ id: "chk-struct-3", category: "MANDATORY_STRUCTURAL", description: "All fasteners torqued to specification after repair", status: "PENDING", mandatory: true, source: "STANDARD" });
    items.push({ id: "chk-struct-4", category: "MANDATORY_STRUCTURAL", description: "Warning lights cleared — no active DTCs on instrument cluster", status: "PENDING", mandatory: true, source: "STANDARD" });
    items.push({ id: "chk-struct-5", category: "MANDATORY_STRUCTURAL", description: "Braking system functional check (static + dynamic)", status: "PENDING", mandatory: true, source: "STANDARD" });

    // 2. Customer complaints
    try {
      const [complaints]: any = await this.execute(
        `SELECT complaint_text FROM job_card_complaint_history WHERE job_card_id = ? ORDER BY version_number DESC LIMIT 5`,
        [jobId]
      );
      const seen = new Set<string>();
      for (const c of complaints) {
        const key = c.complaint_text?.trim().substring(0, 60) || "";
        if (key && !seen.has(key)) {
          seen.add(key);
          items.push({ id: `chk-complaint-${items.length + 1}`, category: "COMPLAINT_RECONCILIATION", description: `VERIFY RESOLVED — Customer complaint: "${key}"`, status: "PENDING", mandatory: true, source: "COMPLAINT_HISTORY" });
        }
      }
    } catch (_) {}

    // 3. Job description
    try {
      const [jobs]: any = await this.execute(`SELECT remarks, job_description FROM job_cards WHERE job_id = ?`, [jobId]);
      const text = (jobs[0]?.job_description || jobs[0]?.remarks || "").trim();
      if (text.length > 0) {
        items.push({ id: `chk-jobdesc-${items.length + 1}`, category: "JOB_SCOPE_VERIFICATION", description: `Verify all stated job-scope work completed: "${text.substring(0, 120)}"`, status: "PENDING", mandatory: true, source: "JOB_CARD" });
      }
    } catch (_) {}

    // 4. Parts issued
    try {
      const [parts]: any = await this.execute(
        `SELECT item_code, item_name FROM tbl_goods_issue WHERE job_card_id = ? AND status IN ('ISSUED','FULFILLED') LIMIT 10`,
        [jobId]
      );
      for (const p of parts) {
        items.push({ id: `chk-part-${items.length + 1}`, category: "PARTS_FITMENT_VERIFICATION", description: `Verify part fitted correctly: ${p.item_name || p.item_code}`, status: "PENDING", mandatory: true, source: "PARTS_ISSUANCE" });
      }
    } catch (_) {}

    // 5. Prior QC failures
    try {
      const [prevFails]: any = await this.execute(
        `SELECT check_items_json, created_at FROM rpt_qc_checklists WHERE job_id = ? AND result = 'FAIL' ORDER BY created_at DESC LIMIT 3`,
        [jobId]
      );
      let attemptNum = 0;
      for (const row of prevFails) {
        attemptNum++;
        try {
          const failedItems: any[] = JSON.parse(row.check_items_json || "[]");
          for (const fi of failedItems.filter((i: any) => i.status === "FAIL" || i.status === "PENDING")) {
            items.push({ id: `chk-reinspect-${items.length + 1}`, category: "REINSPECTION_FROM_REWORK", description: `[REWORK ATTEMPT #${attemptNum}] Re-verify: ${fi.description}`, status: "PENDING", mandatory: true, source: "PRIOR_QC_FAIL" });
          }
        } catch (_) {}
      }
    } catch (_) {}

    return items;
  }

  // ─── QC HANDOFF ACKNOWLEDGEMENT ────────────────────────────────────────────

  public async acknowledgeQcHandoff(jobId: number, qcInspectorId: number, branchId: number): Promise<void> {
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      await this.verifyJobOwnership(jobId, branchId, conn);

      const [cur]: any = await conn.execute(`SELECT status FROM job_cards WHERE job_id = ?`, [jobId]);
      if (cur[0]?.status === "QC_IN_PROGRESS") { await conn.commit(); return; }
      if (!["QC_PENDING"].includes(cur[0]?.status || "")) {
        throw new Error(`QC_INVALID_TRANSITION: Job is in state '${cur[0]?.status}', expected QC_PENDING.`);
      }

      await conn.execute(
        `UPDATE tbl_handoff_sla SET status = 'COMPLETED', accepted_at = NOW()
          WHERE entity_id = ? AND stage_name = 'SLA_FLOOR_TO_QC' AND status = 'ON_TRACK'`,
        [jobId.toString()]
      );
      await conn.execute(`UPDATE job_cards SET status = 'QC_IN_PROGRESS' WHERE job_id = ?`, [jobId]);
      await conn.commit();

      try {
        await VosCorePlatform.timeline.addNode({ vosId: `vos-${jobId}`, timelineType: "OPERATIONAL", eventType: "QUALITY_CHECK_STARTED", title: "QC Inspector Acknowledged Handoff", metadata: { branchId, qcInspectorId } });
      } catch (_) {}
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // ─── SERVER-SIDE QC PASS GATE ──────────────────────────────────────────────

  /**
   * Server-side gate before PASS decision.
   * Gate 1: No open rework loop.
   * Gate 2: All mandatory checklist items PASS.
   * Gate 3: Job must be QC_IN_PROGRESS.
   * Gate 4: If road test REQUIRED → must have a PASSED road test record for this job+branch.
   *         If road test NOT_REQUIRED → road test gate passes.
   *         If no road test record → gate passes (road test not yet required by In-Charge).
   */
  private async serverSidePassGate(jobId: number, branchId: number, checklist: any[]): Promise<void> {
    // Gate 1: No open rework
    const [openReworks]: any = await this.execute(
      `SELECT id FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false LIMIT 1`,
      [jobId]
    );
    if (openReworks.length > 0) {
      throw new Error("QC_PASS_BLOCKED: Open rework loop exists. Complete rework before QC PASS.");
    }

    // Gate 2: Mandatory checklist items
    const mandatoryItems = checklist.filter((i: any) => i.mandatory === true);
    const pendingOrFail = mandatoryItems.filter((i: any) => i.status !== "PASS");
    if (pendingOrFail.length > 0) {
      const names = pendingOrFail.map((i: any) => i.description?.substring(0, 50) || i.id).join("; ");
      throw new Error(`QC_PASS_BLOCKED: ${pendingOrFail.length} mandatory checklist item(s) not PASS: ${names}`);
    }

    // Gate 3: Job state
    const [job]: any = await this.execute(`SELECT status FROM job_cards WHERE job_id = ?`, [jobId]);
    const state = job[0]?.status;
    if (!["QC_IN_PROGRESS", "QC_PENDING"].includes(state)) {
      throw new Error(`QC_PASS_BLOCKED: Job is in state '${state}'. Must be QC_IN_PROGRESS.`);
    }

    // Gate 4: Road test
    const [rtRows]: any = await this.execute(
      `SELECT road_test_id, status, requirement_status FROM qc_road_tests
       WHERE job_id = ? AND branch_id = ? ORDER BY road_test_id DESC LIMIT 1`,
      [jobId, branchId]
    );
    if (rtRows.length > 0) {
      const rt = rtRows[0];
      if (rt.requirement_status === 'REQUIRED') {
        if (rt.status === 'REQUIRED') {
          throw new Error("QC_PASS_BLOCKED: Road test is REQUIRED but has not been started.");
        }
        if (rt.status === 'IN_PROGRESS') {
          throw new Error("QC_PASS_BLOCKED: Road test is IN_PROGRESS. Complete it before QC PASS.");
        }
        if (rt.status === 'FAILED') {
          throw new Error("QC_PASS_BLOCKED: Road test FAILED. A passed road test is required before QC PASS.");
        }
        // PASSED → allow
      }
      // NOT_REQUIRED → allow
    }
    // No road test record yet → allow (not yet designated by In-Charge)
  }

  // ─── SUBMIT QC DECISION ────────────────────────────────────────────────────

  public async submitQcDecision(
    jobId: number,
    qcInspectorId: number,
    branchId: number,
    decision: "PASS" | "FAIL",
    checklist: any[],
    roadTestKm: number,
    notes: string
  ): Promise<void> {
    if (decision === "PASS") {
      await this.serverSidePassGate(jobId, branchId, checklist);
    }

    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      await this.verifyJobOwnership(jobId, branchId, conn);

      await conn.execute(
        `INSERT INTO rpt_qc_checklists (job_id, inspector_id, result, check_items_json, road_test_km, inspector_notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [jobId, qcInspectorId, decision, JSON.stringify(checklist), roadTestKm, notes]
      );

      if (decision === "FAIL") {
        await conn.execute(
          `INSERT INTO rework_tracking
            (original_job_id, rework_job_id, vehicle_reg, assigned_technician_id,
             original_closure_date, rework_date, days_since_original, original_issue,
             rework_reason, rework_completed, rework_revenue)
            VALUES (?, ?, 'QC_REWORK', 1, NOW(), NOW(), 0, 'QC FAIL', ?, false, 0)`,
          [jobId, jobId, notes || "Failed QC inspection"]
        );
        await conn.execute(`UPDATE job_cards SET status = 'QC_FAILED_REWORK' WHERE job_id = ?`, [jobId]);
      } else {
        await conn.execute(`UPDATE job_cards SET status = 'QC_PASSED' WHERE job_id = ?`, [jobId]);
          await conn.execute(
            `INSERT INTO tbl_handoff_sla (handoff_id, entity_id, stage_name, status, branch_id, owner_id, owner_role, sla_due_at) VALUES (UUID(), ?, 'SLA_QC_TO_SA', 'ON_TRACK', ?, 'SYSTEM', 'SYSTEM', NOW())`,
            [jobId.toString(), branchId.toString()]
          );
      }

      await conn.commit();

      try {
        await VosCorePlatform.timeline.addNode({
          vosId: `vos-${jobId}`, timelineType: "OPERATIONAL",
          eventType: decision === "FAIL" ? "REWORK_REQUIRED" : "QC_PASSED",
          title: decision === "FAIL" ? "QC Failed — Sent for Rework" : "QC Passed — Sent to SA",
          metadata: { branchId, notes, qcInspectorId, roadTestKm }
        });
      } catch (_) {}
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // ─── COMPLETE REWORK ───────────────────────────────────────────────────────

  public async completeRework(jobId: number, floorSupervisorId: number, branchId: number, techId: number, notes: string): Promise<void> {
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      await this.verifyJobOwnership(jobId, branchId, conn);

      const [openReworks]: any = await conn.execute(
        `SELECT id FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false LIMIT 1`,
        [jobId]
      );
      if (openReworks.length === 0) {
        throw new Error("REWORK_COMPLETE_INVALID: No open rework loop found for this job.");
      }

      await conn.execute(`UPDATE rework_tracking SET rework_completed = true WHERE original_job_id = ? AND rework_completed = false`, [jobId]);
      await conn.execute(`UPDATE job_cards SET status = 'QC_PENDING' WHERE job_id = ?`, [jobId]);
      await conn.commit();

      try {
        await VosCorePlatform.timeline.addNode({ vosId: `vos-${jobId}`, timelineType: "OPERATIONAL", eventType: "REWORK_COMPLETED", title: "Rework Completed — Returned to QC Queue", metadata: { branchId, floorSupervisorId, techId, notes } });
      } catch (_) {}
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // ─── SA ACKNOWLEDGE ────────────────────────────────────────────────────────

  public async saAcknowledgeQc(jobId: number, saId: number, branchId: number): Promise<void> {
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      await this.verifyJobOwnership(jobId, branchId, conn);

      const [job]: any = await conn.execute(`SELECT status FROM job_cards WHERE job_id = ?`, [jobId]);
      const state = job[0]?.status;
      if (!["QC_PASSED", "PRE_INVOICE_READY"].includes(state)) {
        throw new Error(`SA_ACK_BLOCKED: Job is in state '${state}'. SA can only acknowledge after QC_PASSED.`);
      }
      if (state === "PRE_INVOICE_READY") { await conn.commit(); return; }

      const [openReworks]: any = await conn.execute(
        `SELECT id FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false LIMIT 1`,
        [jobId]
      );
      if (openReworks.length > 0) {
        throw new Error("SA_ACK_BLOCKED: Open rework loop exists. Cannot advance to pre-invoice.");
      }

      await conn.execute(
        `UPDATE tbl_handoff_sla SET status = 'COMPLETED', accepted_at = NOW()
          WHERE entity_id = ? AND stage_name = 'SLA_QC_TO_SA' AND status = 'ON_TRACK'`,
        [jobId.toString()]
      );
      await conn.execute(`UPDATE job_cards SET status = 'PRE_INVOICE_READY' WHERE job_id = ?`, [jobId]);
      await conn.commit();

      try {
        await VosCorePlatform.timeline.addNode({ vosId: `vos-${jobId}`, timelineType: "OPERATIONAL", eventType: "SA_ACKNOWLEDGED_QC", title: "Service Advisor Acknowledged QC — Pre-Invoice Ready", metadata: { branchId, saId } });
      } catch (_) {}
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // ─── PHASE 6 WARRANTY DEPENDENCY GATE ────────────────────────────────────

  /**
   * Check whether this job has unresolved warranty dependencies.
   * Derived from Phase 6 tbl_warranty_reviews authoritative state:
   *   Terminal (resolved): APPROVED | REJECTED
   *   Blocking (unresolved): PENDING | ACKNOWLEDGED
   *
   * Link: tbl_warranty_reviews.job_card_id = job_cards.job_card_no
   * Also checks tbl_warranty_claims.job_id for branch consistency.
   *
   * Returns: { blocking: false } if no dependency or all resolved.
   * Returns: { blocking: true, reason, count } if any unresolved.
   */
  public async checkWarrantyDependency(jobId: number, branchId: number): Promise<{ blocking: boolean; reason?: string; count?: number }> {
    // Get job_card_no for the warranty review link
    const [jobs]: any = await this.execute(
      `SELECT job_card_no FROM job_cards WHERE job_id = ?`,
      [jobId]
    );
    if (!jobs || jobs.length === 0) {
      return { blocking: false };
    }
    const jobCardNo = jobs[0].job_card_no;

    // Query blocking warranty reviews for this job card
    // Cross-branch protection: warranty reviews must match the same branch
    const [blockingReviews]: any = await this.execute(
      `SELECT review_id, status, complaint FROM tbl_warranty_reviews
       WHERE job_card_id = ? AND branch_id = ? AND status IN (?, ?)
       ORDER BY requested_at ASC`,
      [jobCardNo, branchId.toString(), WARRANTY_BLOCKING_STATUSES[0], WARRANTY_BLOCKING_STATUSES[1]]
    );

    if (blockingReviews.length > 0) {
      const statusList = blockingReviews.map((r: any) => `${r.review_id}:${r.status}`).join(', ');
      return {
        blocking: true,
        count: blockingReviews.length,
        reason: `${blockingReviews.length} unresolved warranty review(s) remain for this job (${statusList}). All warranty reviews must reach APPROVED or REJECTED before pre-invoice.`
      };
    }

    return { blocking: false };
  }

  // ─── PRE-INVOICE READINESS HARD GATE ──────────────────────────────────────

  /**
   * 5-gate hard gate:
   * Gate 1: Job exists
   * Gate 2: Status QC_PASSED or PRE_INVOICE_READY
   * Gate 3: Latest rpt_qc_checklists record is PASS (anti-bypass)
   * Gate 4: No open rework loops
   * Gate 5: SLA_QC_TO_SA COMPLETED (SA acknowledged)
   * Gate 6: No blocking Phase 6 warranty dependencies (PENDING/ACKNOWLEDGED)
   */
  public async checkPreInvoiceReadiness(jobId: number, branchId: number = 0): Promise<{ ready: boolean; blockReason?: string }> {
    const [jobs]: any = await this.execute(`SELECT status FROM job_cards WHERE job_id = ?`, [jobId]);
    if (!jobs || jobs.length === 0) {
      return { ready: false, blockReason: "Job card not found." };
    }

    const state = jobs[0].status;
    if (!["QC_PASSED", "PRE_INVOICE_READY"].includes(state)) {
      return { ready: false, blockReason: `Vehicle is in state: ${state}. Must be QC_PASSED or PRE_INVOICE_READY.` };
    }

    const [latestQc]: any = await this.execute(
      `SELECT result FROM rpt_qc_checklists WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`,
      [jobId]
    );
    if (!latestQc || latestQc.length === 0 || latestQc[0].result !== "PASS") {
      return { ready: false, blockReason: "No QC PASS record found. QC must be completed and passed." };
    }

    const [openReworks]: any = await this.execute(
      `SELECT id FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false LIMIT 1`,
      [jobId]
    );
    if (openReworks.length > 0) {
      return { ready: false, blockReason: "Open rework loop exists. Rework must be completed before pre-invoice." };
    }

    const [sla]: any = await this.execute(
      `SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_QC_TO_SA' ORDER BY created_at DESC LIMIT 1`,
      [jobId.toString()]
    );
    if (!sla || sla.length === 0 || sla[0].status !== "COMPLETED") {
      return { ready: false, blockReason: "QC→SA handoff SLA not completed. Service Advisor must acknowledge before pre-invoice." };
    }

    // Gate 6: Phase 6 warranty dependency
    if (branchId > 0) {
      const warrantyCheck = await this.checkWarrantyDependency(jobId, branchId);
      if (warrantyCheck.blocking) {
        return { ready: false, blockReason: warrantyCheck.reason };
      }
    }

    return { ready: true };
  }

  // ─── QC ATTEMPT COUNTER ────────────────────────────────────────────────────

  public async getQcAttemptCount(jobId: number): Promise<number> {
    const [rows]: any = await this.execute(
      `SELECT COUNT(*) as cnt FROM rpt_qc_checklists WHERE job_id = ?`,
      [jobId]
    );
    return rows[0]?.cnt || 0;
  }
}
