import { pool as db } from "../../db/index";
import { v4 as uuidv4 } from "uuid";
import { TimelineEventRegistry } from "../vos/timeline/TimelineEventRegistry";
import { vosEventEngine } from "../vos/VosEventEngine";

export class GateOutEngine {
  // DB injection for tests
  private customDb: any = null;
  public setDb(mockDb: any) { this.customDb = mockDb; }
  private getConn = async () => this.customDb ? this.customDb.getConnection() : db.getConnection();
  private query = async (sql: string, params: any[] = []) => this.customDb ? this.customDb.execute(sql, params) : db.execute(sql, params);

  // 1. CASHIER QUEUE
  async getCashierQueue(branchId: number | string, cashierId?: string) {
    // A job is in the cashier queue if it has CRM evidence (tbl_crm_billing_evidence)
    // AND is not fully paid/gate-passed.
    const [rows] = await this.query(`
      SELECT 
        jc.job_id, jc.job_card_no, jc.vrn, jc.customer_name, jc.vehicle_model,
        ev.crm_invoice_number, ev.crm_invoice_amount, ev.created_at as evidence_time,
        tc.owner_id as claimed_by,
        (SELECT status FROM tbl_credit_requests cr WHERE cr.job_id = jc.job_id ORDER BY requested_at DESC LIMIT 1) as credit_status,
        (SELECT payment_mode FROM tbl_payments p WHERE p.job_id = jc.job_id AND status='COMPLETED' LIMIT 1) as payment_mode
      FROM job_cards jc
      JOIN tbl_crm_billing_evidence ev ON ev.job_id = jc.job_id
      LEFT JOIN tbl_gate_pass gp ON gp.job_id = jc.job_id AND gp.status != 'REVOKED'
      LEFT JOIN tbl_task_claims tc ON tc.job_id = jc.job_id AND tc.task_type = 'CASHIER'
      WHERE jc.bay_id = ? 
        AND gp.gate_pass_id IS NULL
    `, [branchId]); 

    if (cashierId) {
       // Only return unclaimed or claimed by this cashier
       return (rows as any[]).filter(r => !r.claimed_by || r.claimed_by === cashierId);
    }
    return rows;
  }

  // 2. RECORD PAYMENT
  async recordPayment(payload: {
    jobId: string; branchId: string | number; amount: number; paymentMode: string;
    referenceNumber?: string; cashierId: string;
  }) {
    const { jobId, branchId, amount, paymentMode, referenceNumber, cashierId } = payload;
    
    // Validate reference based on mode
    if (['UPI', 'NEFT', 'RTGS', 'IMPS', 'CARD', 'CHEQUE'].includes(paymentMode.toUpperCase())) {
      if (!referenceNumber || referenceNumber.trim() === '') {
        throw new Error(`PAYMENT_REFERENCE_REQUIRED: Reference number is mandatory for ${paymentMode}`);
      }
    }

    const conn = await this.getConn();
    try {
      await conn.beginTransaction();

      // Check idempotent / already paid
      const [existing] = await conn.execute(`SELECT payment_id FROM tbl_payments WHERE job_id = ? AND status='COMPLETED'`, [jobId]) as any;
      if (existing.length > 0) throw new Error('PAYMENT_ALREADY_RECORDED');

      const paymentId = 'PAY-' + uuidv4().split('-')[0].toUpperCase();

      await conn.execute(`
        INSERT INTO tbl_payments (payment_id, job_id, branch_id, amount, payment_mode, reference_number, cashier_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
      `, [paymentId, jobId, branchId, amount, paymentMode.toUpperCase(), referenceNumber || null, cashierId]);

      // Emit VOS event
      await vosEventEngine.emitEvent({
        eventType: 'PAYMENT_RECORDED', 
        vosId: jobId, 
        payload: { paymentId, paymentMode, amount, branchId }, 
        actorId: cashierId,
        actorRole: 'CASHIER',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { paymentId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 3. RAISE CREDIT REQUEST
  async raiseCreditRequest(payload: {
    jobId: string; branchId: string | number; reason: string; amount: number; requestedBy: string;
  }) {
    const { jobId, branchId, reason, amount, requestedBy } = payload;
    
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      
      const [existing] = await conn.execute(`SELECT status FROM tbl_credit_requests WHERE job_id = ? AND status='REQUESTED'`, [jobId]) as any;
      if (existing.length > 0) throw new Error('CREDIT_ALREADY_REQUESTED');

      const creditId = 'CR-' + uuidv4().split('-')[0].toUpperCase();

      await conn.execute(`
        INSERT INTO tbl_credit_requests (credit_request_id, job_id, branch_id, amount, reason, requested_by, status)
        VALUES (?, ?, ?, ?, ?, ?, 'REQUESTED')
      `, [creditId, jobId, branchId, amount, reason, requestedBy]);

      await vosEventEngine.emitEvent({
        eventType: 'CREDIT_REQUESTED', 
        vosId: jobId, 
        payload: { creditId, reason, branchId }, 
        actorId: requestedBy,
        actorRole: 'CASHIER',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { creditId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 4. GM CREDIT DECISION
  async decideCreditRequest(payload: {
    creditRequestId: string; gmId: string; decision: 'APPROVE' | 'REJECT'; branchId: string | number;
  }) {
    const { creditRequestId, gmId, decision, branchId } = payload;
    
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      
      const [cr] = await conn.execute(`SELECT job_id, status FROM tbl_credit_requests WHERE credit_request_id = ? FOR UPDATE`, [creditRequestId]) as any;
      if (cr.length === 0) throw new Error('CREDIT_NOT_FOUND');
      if (cr[0].status !== 'REQUESTED') throw new Error('CREDIT_ALREADY_DECIDED');

      const newStatus = decision === 'APPROVE' ? 'GM_APPROVED' : 'GM_REJECTED';

      await conn.execute(`
        UPDATE tbl_credit_requests SET status = ?, gm_id = ?, decision_at = NOW() WHERE credit_request_id = ?
      `, [newStatus, gmId, creditRequestId]);

      const eventName = decision === 'APPROVE' ? 'CREDIT_APPROVED' : 'CREDIT_REJECTED';
      await vosEventEngine.emitEvent({
        eventType: eventName, 
        vosId: cr[0].job_id, 
        payload: { creditRequestId, gmId, branchId }, 
        actorId: gmId,
        actorRole: 'GM',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { status: newStatus };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 5. CREATE GATE PASS
  async createGatePass(payload: {
    jobId: string; branchId: string | number; issuedBy: string;
  }) {
    const { jobId, branchId, issuedBy } = payload;
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();

      // Check if gate pass already exists
      const [existingGp] = await conn.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ? AND status != 'REVOKED'`, [jobId]) as any;
      if (existingGp.length > 0) throw new Error('GATE_PASS_ALREADY_ISSUED');

      // Check release basis
      // 1. Paid?
      const [payments] = await conn.execute(`SELECT payment_id FROM tbl_payments WHERE job_id = ? AND status = 'COMPLETED'`, [jobId]) as any;
      // 2. Credit Approved?
      const [credits] = await conn.execute(`SELECT credit_request_id FROM tbl_credit_requests WHERE job_id = ? AND status = 'GM_APPROVED'`, [jobId]) as any;
      // 3. MGP Approved? (Phase 8 authority)
      const [mgps] = await conn.execute(`SELECT mgp_id FROM tbl_manual_gate_pass_request WHERE job_id = ? AND status = 'APPROVED'`, [jobId]) as any;

      let releaseBasis = '';
      let paymentId = null;
      let creditId = null;
      let mgpId = null;
      let isManualException = false;

      if (payments.length > 0) {
        releaseBasis = 'PAID';
        paymentId = payments[0].payment_id;
      } else if (credits.length > 0) {
        releaseBasis = 'CREDIT_APPROVED';
        creditId = credits[0].credit_request_id;
      } else if (mgps.length > 0) {
        releaseBasis = 'MANUAL_GATE_PASS';
        mgpId = mgps[0].mgp_id;
        isManualException = true;
      } else {
        throw new Error('GATE_PASS_NOT_ELIGIBLE: No valid payment, credit, or MGP found.');
      }

      const gpId = 'GP-' + uuidv4().split('-')[0].toUpperCase();
      const gpNo = `GP/${branchId}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

      await conn.execute(`
        INSERT INTO tbl_gate_pass (gate_pass_id, gate_pass_no, job_id, branch_id, release_basis, payment_id, credit_request_id, manual_gate_pass_request_id, is_manual_exception, status, issued_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?)
      `, [gpId, gpNo, jobId, branchId, releaseBasis, paymentId, creditId, mgpId, isManualException, issuedBy]);

      // Close SLA_BILLING_TO_CASHIER
      await conn.execute(`
        UPDATE tbl_handoff_sla sla 
        JOIN tbl_invoice inv ON sla.entity_id COLLATE utf8mb4_unicode_ci = CAST(inv.pre_invoice_id AS CHAR) COLLATE utf8mb4_unicode_ci
        SET sla.status = 'COMPLETED', sla.accepted_at = NOW()
        WHERE inv.job_id = ? AND sla.stage_name = 'SLA_BILLING_TO_CASHIER' AND sla.status = 'ON_TRACK'
      `, [jobId]);

      // Or if it was a manual exception that might not have an invoice linked in SLA
      await conn.execute(`
        UPDATE tbl_handoff_sla SET status = 'COMPLETED', accepted_at = NOW()
        WHERE entity_id = ? AND stage_name = 'SLA_BILLING_TO_CASHIER' AND status = 'ON_TRACK'
      `, [jobId]);

      // Create SLA_CASHIER_TO_SECURITY
      const slaDueAt = new Date(Date.now() + 5 * 60000);
      await conn.execute(`
        INSERT INTO tbl_handoff_sla (
          handoff_id, stage_name, entity_id, owner_id, owner_role, 
          sla_due_at, status, branch_id
        ) VALUES (?, 'SLA_CASHIER_TO_SECURITY', ?, 'SECURITY_TEAM', 'SECURITY', ?, 'ON_TRACK', ?)
      `, [`SLA-${uuidv4().split('-')[0].toUpperCase()}`, gpId, slaDueAt, branchId]);


      await vosEventEngine.emitEvent({
        eventType: 'GATE_PASS_CREATED', 
        vosId: jobId, 
        payload: { gatePassId: gpId, releaseBasis, branchId }, 
        actorId: issuedBy,
        actorRole: 'CASHIER',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { gatePassId: gpId, gatePassNo: gpNo };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 6. SECURITY EXIT QUEUE
  async getSecurityExitQueue(branchId: string | number, securityId?: string) {
    const [rows] = await this.query(`
      SELECT 
        gp.gate_pass_id, gp.gate_pass_no, gp.job_id, gp.release_basis, gp.is_manual_exception,
        jc.vrn, jc.customer_name, jc.vehicle_model,
        tc.owner_id as claimed_by
      FROM tbl_gate_pass gp
      JOIN tbl_job_card jc ON jc.job_id = gp.job_id
      LEFT JOIN tbl_gate_out go ON go.job_id = gp.job_id
      LEFT JOIN tbl_task_claims tc ON tc.job_id = gp.job_id AND tc.task_type = 'SECURITY'
      WHERE gp.branch_id = ? AND gp.status = 'ISSUED' AND go.gate_out_id IS NULL
    `, [branchId]);
    
    if (securityId) {
      return (rows as any[]).filter(r => !r.claimed_by || r.claimed_by === securityId);
    }
    return rows;
  }

  // 7. GATE OUT VEHICLE
  async gateOutVehicle(payload: {
    gatePassId: string; jobId: string; branchId: string | number; securityOperatorId: string;
    captureSource: 'ANPR' | 'MANUAL_CAMERA'; expectedVrn: string; detectedVrn: string;
    evidenceId: string; // From existing media upload
  }) {
    const { gatePassId, jobId, branchId, securityOperatorId, captureSource, expectedVrn, detectedVrn, evidenceId } = payload;
    
    if (!evidenceId) throw new Error('REAR_EVIDENCE_REQUIRED: Gate out cannot proceed without rear VRN evidence.');
    if (expectedVrn.replace(/[^A-Z0-9]/ig, '') !== detectedVrn.replace(/[^A-Z0-9]/ig, '')) {
      throw new Error('VRN_MISMATCH: Detected VRN does not match expected VRN. Manual override required.');
    }

    const conn = await this.getConn();
    try {
      await conn.beginTransaction();

      // Verify evidenceId against tbl_evidence
      const [evidenceRows] = await conn.execute(`SELECT evidence_id, lifecycle_status FROM tbl_evidence WHERE evidence_id = ? LIMIT 1`, [evidenceId]) as any;
      if (evidenceRows.length === 0) {
        throw new Error('REAR_EVIDENCE_REQUIRED: Provided evidenceId is not valid or does not exist in tbl_evidence.');
      }

      // Lock gate pass to prevent concurrent gate outs
      const [gp] = await conn.execute(`SELECT status, branch_id FROM tbl_gate_pass WHERE gate_pass_id = ? FOR UPDATE`, [gatePassId]) as any;
      if (gp.length === 0) throw new Error('GATE_PASS_INVALID');
      if (gp[0].status === 'REVOKED') throw new Error('GATE_PASS_INVALID: Gate pass is revoked.');
      if (gp[0].branch_id != branchId) throw new Error('CROSS_BRANCH_ACCESS_DENIED');

      const [existingGo] = await conn.execute(`SELECT gate_out_id FROM tbl_gate_out WHERE job_id = ? FOR UPDATE`, [jobId]) as any;
      if (existingGo.length > 0) throw new Error('VEHICLE_ALREADY_GATED_OUT');

      const goId = 'GO-' + uuidv4().split('-')[0].toUpperCase();

      await conn.execute(`
        INSERT INTO tbl_gate_out (gate_out_id, gate_pass_id, job_id, branch_id, security_operator_id, evidence_id, capture_source, expected_vrn, detected_vrn, verification_result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
      `, [goId, gatePassId, jobId, branchId, securityOperatorId, evidenceId, captureSource, expectedVrn, detectedVrn]);

      await conn.execute(`UPDATE tbl_gate_pass SET status = 'VERIFIED' WHERE gate_pass_id = ?`, [gatePassId]);
      
      // Close SLA_CASHIER_TO_SECURITY
      await conn.execute(`
        UPDATE tbl_handoff_sla SET status = 'COMPLETED', accepted_at = NOW()
        WHERE entity_id = ? AND stage_name = 'SLA_CASHIER_TO_SECURITY' AND status = 'ON_TRACK'
      `, [gatePassId]);

      // We do not close financial state if it's MGP. Phase 8 will handle it on reconciliation.
      
      await vosEventEngine.emitEvent({
        eventType: 'VEHICLE_GATED_OUT', 
        vosId: jobId, 
        payload: { gateOutId: goId, captureSource, branchId }, 
        actorId: securityOperatorId,
        actorRole: 'SECURITY',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { gateOutId: goId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 8. CLAIM TASK (CASHIER OR SECURITY)
  async claimTask(payload: { jobId: string; taskType: 'CASHIER' | 'SECURITY'; ownerId: string }) {
    const { jobId, taskType, ownerId } = payload;
    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      
      const [existing] = await conn.execute(`SELECT owner_id FROM tbl_task_claims WHERE job_id = ? AND task_type = ? FOR UPDATE`, [jobId, taskType]) as any;
      if (existing.length > 0 && existing[0].owner_id !== ownerId) {
        throw new Error(`TASK_ALREADY_CLAIMED: This task is already claimed by another user.`);
      }

      if (existing.length === 0) {
        const claimId = 'CLAIM-' + uuidv4().split('-')[0].toUpperCase();
        await conn.execute(`
          INSERT INTO tbl_task_claims (claim_id, job_id, task_type, owner_id)
          VALUES (?, ?, ?, ?)
        `, [claimId, jobId, taskType, ownerId]);
      }
      
      await conn.commit();
      return { success: true, ownerId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // 9. REVOKE GATE PASS
  async revokeGatePass(payload: { gatePassId: string; revokedBy: string; reason: string; branchId: string | number }) {
    const { gatePassId, revokedBy, reason, branchId } = payload;
    if (!reason || reason.trim() === '') throw new Error('REVOCATION_REASON_REQUIRED');

    const conn = await this.getConn();
    try {
      await conn.beginTransaction();
      
      const [gp] = await conn.execute(`SELECT status, job_id, branch_id FROM tbl_gate_pass WHERE gate_pass_id = ? FOR UPDATE`, [gatePassId]) as any;
      if (gp.length === 0) throw new Error('GATE_PASS_NOT_FOUND');
      if (gp[0].status === 'REVOKED') throw new Error('GATE_PASS_ALREADY_REVOKED');
      if (gp[0].status === 'VERIFIED') throw new Error('GATE_PASS_CANNOT_BE_REVOKED: Vehicle already gated out.');
      if (gp[0].branch_id != branchId) throw new Error('CROSS_BRANCH_ACCESS_DENIED');

      await conn.execute(`
        UPDATE tbl_gate_pass 
        SET status = 'REVOKED', revoked_by = ?, revoked_at = NOW(), revoke_reason = ? 
        WHERE gate_pass_id = ?
      `, [revokedBy, reason, gatePassId]);

      await vosEventEngine.emitEvent({
        eventType: 'GATE_PASS_REVOKED', 
        vosId: gp[0].job_id, 
        payload: { gatePassId, reason, branchId }, 
        actorId: revokedBy,
        actorRole: 'CASHIER',
        correlationId: uuidv4()
      });

      await conn.commit();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // --- READ MODELS ---

  async getMyCreditRequests(branchId: number | string, cashierId: string) {
    const [rows] = await this.query(`
      SELECT cr.*, jc.vrn, jc.customer_name 
      FROM tbl_credit_requests cr
      JOIN job_cards jc ON jc.job_id = cr.job_id
      WHERE cr.branch_id = ? AND cr.requested_by = ?
      ORDER BY cr.requested_at DESC
    `, [branchId, cashierId]);
    return rows;
  }

  async getGMPendingCreditApprovals(branchId: number | string) {
    const [rows] = await this.query(`
      SELECT cr.*, jc.vrn, jc.customer_name, jc.job_card_no
      FROM tbl_credit_requests cr
      JOIN job_cards jc ON jc.job_id = cr.job_id
      WHERE cr.branch_id = ? AND cr.status = 'REQUESTED'
      ORDER BY cr.requested_at DESC
    `, [branchId]);
    return rows;
  }

  async getPaidToday(branchId: number | string, cashierId: string) {
    const [rows] = await this.query(`
      SELECT p.*, jc.vrn, jc.customer_name 
      FROM tbl_payments p
      JOIN job_cards jc ON jc.job_id = p.job_id
      WHERE p.branch_id = ? AND p.cashier_id = ? AND DATE(p.recorded_at) = CURDATE()
      ORDER BY p.recorded_at DESC
    `, [branchId, cashierId]);
    return rows;
  }

  async getGatePassReady(branchId: number | string) {
    const [rows] = await this.query(`
      SELECT gp.*, jc.vrn, jc.customer_name 
      FROM tbl_gate_pass gp
      JOIN job_cards jc ON jc.job_id = gp.job_id
      LEFT JOIN tbl_gate_out go ON go.gate_pass_id = gp.gate_pass_id
      WHERE gp.branch_id = ? AND gp.status = 'ISSUED' AND go.gate_out_id IS NULL
      ORDER BY gp.issued_at DESC
    `, [branchId]);
    return rows;
  }

  async getGatedOutToday(branchId: number | string) {
    const [rows] = await this.query(`
      SELECT go.*, gp.gate_pass_no, jc.vrn, jc.customer_name 
      FROM tbl_gate_out go
      JOIN tbl_gate_pass gp ON gp.gate_pass_id = go.gate_pass_id
      JOIN job_cards jc ON jc.job_id = go.job_id
      WHERE go.branch_id = ? AND DATE(go.gate_out_time) = CURDATE()
      ORDER BY go.gate_out_time DESC
    `, [branchId]);
    return rows;
  }

  async getSABillingVisibility(branchId: number | string, saId: string) {
    const [rows] = await this.query(`
      SELECT 
        jc.job_id, jc.job_card_no, jc.vrn, jc.customer_name,
        ev.crm_invoice_number, ev.status as invoice_status,
        (SELECT payment_mode FROM tbl_payments p WHERE p.job_id = jc.job_id AND status='COMPLETED' LIMIT 1) as payment_mode,
        (SELECT status FROM tbl_credit_requests cr WHERE cr.job_id = jc.job_id ORDER BY requested_at DESC LIMIT 1) as credit_status,
        gp.gate_pass_id, gp.status as gate_pass_status,
        go.gate_out_id, go.gate_out_time
      FROM job_cards jc
      LEFT JOIN tbl_crm_billing_evidence ev ON ev.job_id = jc.job_id
      LEFT JOIN tbl_gate_pass gp ON gp.job_id = jc.job_id AND gp.status != 'REVOKED'
      LEFT JOIN tbl_gate_out go ON go.gate_pass_id = gp.gate_pass_id
      WHERE jc.bay_id = ? AND jc.created_by = ? AND jc.workshop_stage IN ('BILLING_PENDING', 'BILLING_COMPLETED', 'DELIVERY_PENDING', 'CLOSED')
    `, [branchId, saId]);
    return rows;
  }

}
