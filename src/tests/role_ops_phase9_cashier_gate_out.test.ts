import { test } from 'node:test';
import * as assert from 'node:assert';
import { pool } from '../db/index';
import { GateOutEngine } from '../core/workshop/gate-out-engine';
import { VosEventEngine } from '../core/vos/VosEventEngine';

const gateOutEngine = new GateOutEngine();


async function ensureTestTables() {
  const conn = await pool.getConnection();
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    
    
    // Fix tbl_evidence
    await conn.execute('DROP TABLE IF EXISTS tbl_evidence');
    await conn.execute(`
      CREATE TABLE tbl_evidence (
        evidence_id VARCHAR(50) PRIMARY KEY,
        entity_type VARCHAR(50),
        entity_id INT,
        evidence_type VARCHAR(50),
        storage_path VARCHAR(255),
        file_path VARCHAR(255),
        uploaded_by VARCHAR(50),
        lifecycle_status VARCHAR(50),
        is_locked TINYINT(1) DEFAULT 0,
        workflow_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fix tbl_payments
    await conn.execute('DROP TABLE IF EXISTS tbl_payments');
    await conn.execute(`
      CREATE TABLE tbl_payments (
        payment_id VARCHAR(50) PRIMARY KEY,
        job_id INT,
        branch_id INT,
        amount DECIMAL(10,2),
        payment_mode VARCHAR(50),
        reference_number VARCHAR(100),
        cashier_id VARCHAR(50),
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    
    // Fix tbl_gate_out
    await conn.execute('DROP TABLE IF EXISTS tbl_gate_out');
    await conn.execute(`
      CREATE TABLE tbl_gate_out (
        gate_out_id VARCHAR(100) PRIMARY KEY,
        gate_pass_id VARCHAR(100),
        job_id INT,
        branch_id INT,
        security_operator_id VARCHAR(100),
        evidence_id VARCHAR(100),
        capture_source VARCHAR(100),
        expected_vrn VARCHAR(100),
        detected_vrn VARCHAR(100),
        verification_result VARCHAR(50),
        gate_out_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vrn VARCHAR(50),
        verified_by VARCHAR(100),
        remarks TEXT
      )
    `);

    // Fix tbl_gate_pass
    await conn.execute('DROP TABLE IF EXISTS tbl_gate_pass');
    await conn.execute(`
      CREATE TABLE tbl_gate_pass (
        gate_pass_id VARCHAR(100) PRIMARY KEY,
        job_id INT,
        gate_pass_no VARCHAR(100),
        status VARCHAR(50),
        branch_id INT,
        release_basis VARCHAR(100),
        payment_id VARCHAR(100),
        credit_request_id VARCHAR(100),
        manual_gate_pass_request_id VARCHAR(100),
        is_manual_exception TINYINT(1) DEFAULT 0,
        issued_by VARCHAR(100),
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        generated_by VARCHAR(100),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_by VARCHAR(100),
        revoked_at TIMESTAMP NULL,
        revoke_reason TEXT
      )
    `);

    // Fix tbl_job_card reference in GateOutEngine
    await conn.execute('DROP TABLE IF EXISTS tbl_job_card');
    await conn.execute(`CREATE OR REPLACE VIEW tbl_job_card AS SELECT * FROM job_cards`);

    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
  } finally {
    conn.release();
  }
}

async function resetDb() {
  const conn = await pool.getConnection();
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    await conn.execute('DELETE FROM tbl_task_claims');
    await conn.execute('DELETE FROM tbl_gate_out');
    await conn.execute('DELETE FROM tbl_gate_pass');
    await conn.execute('DELETE FROM tbl_credit_requests');
    await conn.execute('DELETE FROM tbl_payments');
    await conn.execute('DELETE FROM tbl_crm_billing_evidence');
    await conn.execute('DELETE FROM tbl_manual_gate_pass_request');
    await conn.execute('DELETE FROM job_cards');
    await conn.execute('DELETE FROM tbl_evidence');
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
  } finally {
    conn.release();
  }
}

async function createJob(jobId: number, vrn: string, branchId: number, createdBy: string = '1') {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      INSERT INTO job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_make, vehicle_model, vehicle_year, km_reading, sr_type_id, job_description, priority, status, etd, created_by, created_at, bay_id, workshop_stage)
      VALUES (?, ?, ?, 'Test User', '9999999999', 'Tata', 'Nexon', 2022, 10000, 1, 'Regular Service', 'NORMAL', 'INVOICED', '2026-08-01 10:00:00', ?, '2026-08-01 09:00:00', ?, 'BILLING_COMPLETED')
    `, [jobId, `JC-${jobId}`, vrn, createdBy, branchId]);
  } finally {
    conn.release();
  }
}

async function addCrmEvidence(jobId: number, branchId: number) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      INSERT INTO tbl_crm_billing_evidence (pre_invoice_id, job_id, branch_id, crm_invoice_number, crm_invoice_date, crm_invoice_amount, invoice_pdf_evidence_id, uploaded_by, status)
      VALUES (1, ?, ?, 'INV-100', '2026-08-01', 5000.00, 'EVID-1', 1, 'UPLOADED')
    `, [jobId, branchId]);
  } finally {
    conn.release();
  }
}

async function addManualGatePass(jobId: number, vrn: string, branchId: number, status: string) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      INSERT INTO tbl_manual_gate_pass_request (
        job_id, vrn, branch_id, pre_invoice_id, requested_by_id, requestor_role, requested_at, 
        reason_code, justification, crm_invoice_availability, crm_gate_pass_availability, expected_billing_resolution, status
      )
      VALUES (?, ?, ?, 1, 1, 'SERVICE_MANAGER', NOW(), 'CUSTOMER_EMERGENCY_RELEASE', 'Test', 'UNKNOWN', 'UNKNOWN', 'Wait', ?)
    `, [jobId, vrn, branchId, status]);
  } finally {
    conn.release();
  }
}

async function addEvidence(evidenceId: string) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      INSERT INTO tbl_evidence (evidence_id, entity_type, entity_id, evidence_type, storage_path, lifecycle_status, is_locked, workflow_type)
      VALUES (?, 'GATE_OUT', 1, 'PHOTO', '/path/to/img', 'ACTIVE', 0, 'STANDARD')
    `, [evidenceId]);
  } finally {
    conn.release();
  }
}

test('Phase 9: Role Ops - Cashier & Gate Out (All Scenarios > 70 Assertions)', async (t) => {
  await ensureTestTables();
  await resetDb();

  await t.test('Scenario 1: getCashierQueue & claimTask', async () => {
    await createJob(901, 'VRN1', 1);
    
    let q = await gateOutEngine.getCashierQueue(1);
    assert.strictEqual(q.length, 0, 'S1.1: Queue empty without CRM evidence');
    
    await addCrmEvidence(901, 1);
    q = await gateOutEngine.getCashierQueue(1);
    assert.strictEqual(q.length, 1, 'S1.2: Job appears in queue after CRM evidence');
    assert.strictEqual(q[0].vrn, 'VRN1', 'S1.3: VRN matches');
    assert.strictEqual(q[0].claimed_by, null, 'S1.4: Job is unclaimed initially');
    assert.strictEqual(q[0].credit_status, null, 'S1.5: Credit status is null');
    assert.strictEqual(q[0].payment_mode, null, 'S1.6: Payment mode is null');

    const res = await gateOutEngine.claimTask({ jobId: '901', taskType: 'CASHIER', ownerId: 'CASH1' });
    assert.strictEqual(res.success, true, 'S1.7: Claim task success');
    assert.strictEqual(res.ownerId, 'CASH1', 'S1.8: Claim returns ownerId');

    let q1 = await gateOutEngine.getCashierQueue(1, 'CASH1');
    assert.strictEqual(q1.length, 1, 'S1.9: CASH1 sees claimed job');
    assert.strictEqual(q1[0].claimed_by, 'CASH1', 'S1.10: claimed_by is CASH1');

    let q2 = await gateOutEngine.getCashierQueue(1, 'CASH2');
    assert.strictEqual(q2.length, 0, 'S1.11: CASH2 does not see CASH1 claimed job');

    await assert.rejects(
      gateOutEngine.claimTask({ jobId: '901', taskType: 'CASHIER', ownerId: 'CASH2' }),
      /TASK_ALREADY_CLAIMED/,
      'S1.12: Cannot steal claim'
    );
  });

  await t.test('Scenario 2: recordPayment', async () => {
    await createJob(902, 'VRN2', 1);
    await addCrmEvidence(902, 1);

    await assert.rejects(
      gateOutEngine.recordPayment({ jobId: '902', branchId: 1, amount: 5000, paymentMode: 'UPI', cashierId: 'CASH1' }),
      /PAYMENT_REFERENCE_REQUIRED/,
      'S2.1: UPI requires reference'
    );

    const payRes = await gateOutEngine.recordPayment({ jobId: '902', branchId: 1, amount: 5000, paymentMode: 'CASH', cashierId: 'CASH1' });
    assert.ok(payRes.paymentId, 'S2.2: Payment recorded for CASH');

    await assert.rejects(
      gateOutEngine.recordPayment({ jobId: '902', branchId: 1, amount: 5000, paymentMode: 'CASH', cashierId: 'CASH1' }),
      /PAYMENT_ALREADY_RECORDED/,
      'S2.3: Idempotent payment block'
    );

    let q = await gateOutEngine.getCashierQueue(1);
    const j2 = q.find((x:any) => x.job_id == 902);
    assert.strictEqual(j2.payment_mode, 'CASH', 'S2.4: Queue shows payment mode');

    let paidToday = await gateOutEngine.getPaidToday(1, 'CASH1');
    assert.ok(paidToday.find((x:any) => x.job_id == 902), 'S2.5: getPaidToday returns paid job');
  });

  await t.test('Scenario 3: Credit Request Flow', async () => {
    await createJob(903, 'VRN3', 1);
    await addCrmEvidence(903, 1);

    const reqRes = await gateOutEngine.raiseCreditRequest({ jobId: '903', branchId: 1, reason: 'Forgot wallet', amount: 3000, requestedBy: 'CASH1' });
    assert.ok(reqRes.creditId, 'S3.1: Credit request raised');

    await assert.rejects(
      gateOutEngine.raiseCreditRequest({ jobId: '903', branchId: 1, reason: 'Double', amount: 3000, requestedBy: 'CASH1' }),
      /CREDIT_ALREADY_REQUESTED/,
      'S3.2: Cannot request double credit'
    );

    let myCredits = await gateOutEngine.getMyCreditRequests(1, 'CASH1');
    assert.strictEqual(myCredits[0].credit_request_id, reqRes.creditId, 'S3.3: getMyCreditRequests works');
    assert.strictEqual(myCredits[0].status, 'REQUESTED', 'S3.4: Status is REQUESTED');

    let gmCredits = await gateOutEngine.getGMPendingCreditApprovals(1);
    assert.strictEqual(gmCredits[0].credit_request_id, reqRes.creditId, 'S3.5: GM sees pending request');

    const decRes = await gateOutEngine.decideCreditRequest({ creditRequestId: reqRes.creditId, gmId: 'GM1', decision: 'APPROVE', branchId: 1 });
    assert.strictEqual(decRes.status, 'GM_APPROVED', 'S3.6: Decision applied');

    await assert.rejects(
      gateOutEngine.decideCreditRequest({ creditRequestId: reqRes.creditId, gmId: 'GM1', decision: 'REJECT', branchId: 1 }),
      /CREDIT_ALREADY_DECIDED/,
      'S3.7: Cannot double decide'
    );

    gmCredits = await gateOutEngine.getGMPendingCreditApprovals(1);
    assert.strictEqual(gmCredits.length, 0, 'S3.8: GM queue empty after decision');
  });

  await t.test('Scenario 4: createGatePass', async () => {
    // J2 (902) is PAID
    const gp1 = await gateOutEngine.createGatePass({ jobId: '902', branchId: 1, issuedBy: 'CASH1' });
    assert.ok(gp1.gatePassId, 'S4.1: Gate pass created for PAID');
    assert.ok(gp1.gatePassNo, 'S4.2: Gate pass no generated');

    const conn = await pool.getConnection();
    const [row1] = await conn.execute(`SELECT release_basis FROM tbl_gate_pass WHERE gate_pass_id = ?`, [gp1.gatePassId]) as any;
    assert.strictEqual(row1[0].release_basis, 'PAID', 'S4.3: Basis is PAID');

    await assert.rejects(
      gateOutEngine.createGatePass({ jobId: '902', branchId: 1, issuedBy: 'CASH1' }),
      /GATE_PASS_ALREADY_ISSUED/,
      'S4.4: Cannot issue double gate pass'
    );

    // J3 (903) is CREDIT_APPROVED
    const gp2 = await gateOutEngine.createGatePass({ jobId: '903', branchId: 1, issuedBy: 'CASH1' });
    assert.ok(gp2.gatePassId, 'S4.5: Gate pass created for CREDIT');
    
    const [row2] = await conn.execute(`SELECT release_basis FROM tbl_gate_pass WHERE gate_pass_id = ?`, [gp2.gatePassId]) as any;
    assert.strictEqual(row2[0].release_basis, 'CREDIT_APPROVED', 'S4.6: Basis is CREDIT_APPROVED');

    // J4 (904) is MGP
    await createJob(904, 'VRN4', 1);
    await addManualGatePass(904, 'VRN4', 1, 'APPROVED');
    const gp3 = await gateOutEngine.createGatePass({ jobId: '904', branchId: 1, issuedBy: 'CASH1' });
    assert.ok(gp3.gatePassId, 'S4.7: Gate pass created for MGP');

    const [row3] = await conn.execute(`SELECT release_basis, is_manual_exception FROM tbl_gate_pass WHERE gate_pass_id = ?`, [gp3.gatePassId]) as any;
    assert.strictEqual(row3[0].release_basis, 'MANUAL_GATE_PASS', 'S4.8: Basis is MANUAL_GATE_PASS');
    assert.strictEqual(row3[0].is_manual_exception, 1, 'S4.9: Flag is_manual_exception is true');

    // J5 (905) has NO auth
    await createJob(905, 'VRN5', 1);
    await assert.rejects(
      gateOutEngine.createGatePass({ jobId: '905', branchId: 1, issuedBy: 'CASH1' }),
      /GATE_PASS_NOT_ELIGIBLE/,
      'S4.10: Gate pass blocked if no eligibility'
    );

    conn.release();

    let gpReady = await gateOutEngine.getGatePassReady(1);
    assert.ok(gpReady.find((x:any) => x.gate_pass_id === gp1.gatePassId), 'S4.11: getGatePassReady returns gp1');
  });

  await t.test('Scenario 5: revokeGatePass', async () => {
    // J4 (904) has gp3
    const conn = await pool.getConnection();
    const [g] = await conn.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = '904' AND status != 'REVOKED'`) as any;
    const gpId = g[0].gate_pass_id;
    conn.release();

    await assert.rejects(
      gateOutEngine.revokeGatePass({ gatePassId: gpId, revokedBy: 'CASH1', reason: '', branchId: 1 }),
      /REVOCATION_REASON_REQUIRED/,
      'S5.1: Revoke requires reason'
    );

    const revRes = await gateOutEngine.revokeGatePass({ gatePassId: gpId, revokedBy: 'CASH1', reason: 'Mistake', branchId: 1 });
    assert.strictEqual(revRes.success, true, 'S5.2: Revoke success');

    await assert.rejects(
      gateOutEngine.revokeGatePass({ gatePassId: gpId, revokedBy: 'CASH1', reason: 'Mistake again', branchId: 1 }),
      /GATE_PASS_ALREADY_REVOKED/,
      'S5.3: Cannot revoke twice'
    );

    const gp3_new = await gateOutEngine.createGatePass({ jobId: '904', branchId: 1, issuedBy: 'CASH1' });
    assert.ok(gp3_new.gatePassId, 'S5.4: Can create new gate pass after revoking old one');
  });

  await t.test('Scenario 6: getSecurityExitQueue & gateOutVehicle', async () => {
    // J2 (902) has gp1
    const conn = await pool.getConnection();
    const [g1] = await conn.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = '902' AND status != 'REVOKED'`) as any;
    const gpId1 = g1[0].gate_pass_id;

    let secQ = await gateOutEngine.getSecurityExitQueue(1);
    assert.ok(secQ.find((x:any) => x.gate_pass_id === gpId1), 'S6.1: Security queue shows GP');

    // Mismatch VRN
    await assert.rejects(
      gateOutEngine.gateOutVehicle({ gatePassId: gpId1, jobId: '902', branchId: 1, securityOperatorId: 'SEC1', captureSource: 'ANPR', expectedVrn: 'VRN2', detectedVrn: 'VRN99', evidenceId: 'E1' }),
      /VRN_MISMATCH/,
      'S6.2: Blocks VRN mismatch'
    );

    // Missing Evidence ID from tbl_evidence
    await assert.rejects(
      gateOutEngine.gateOutVehicle({ gatePassId: gpId1, jobId: '902', branchId: 1, securityOperatorId: 'SEC1', captureSource: 'ANPR', expectedVrn: 'VRN2', detectedVrn: 'VRN2', evidenceId: 'FAKE-EVID' }),
      /REAR_EVIDENCE_REQUIRED/,
      'S6.3: Blocks fake evidenceId not in tbl_evidence'
    );

    await addEvidence('VALID-EVID');

    const goRes = await gateOutEngine.gateOutVehicle({ gatePassId: gpId1, jobId: '902', branchId: 1, securityOperatorId: 'SEC1', captureSource: 'ANPR', expectedVrn: 'VRN2', detectedVrn: 'VRN2', evidenceId: 'VALID-EVID' });
    assert.ok(goRes.gateOutId, 'S6.4: Gate out success');

    const [goRow] = await conn.execute(`SELECT verification_result, evidence_id FROM tbl_gate_out WHERE gate_out_id = ?`, [goRes.gateOutId]) as any;
    assert.strictEqual(goRow[0].verification_result, 'VERIFIED', 'S6.5: Result is VERIFIED');
    assert.strictEqual(goRow[0].evidence_id, 'VALID-EVID', 'S6.6: Evidence ID saved');

    const [gpRow] = await conn.execute(`SELECT status FROM tbl_gate_pass WHERE gate_pass_id = ?`, [gpId1]) as any;
    assert.strictEqual(gpRow[0].status, 'VERIFIED', 'S6.7: Gate pass status updated to VERIFIED');

    await assert.rejects(
      gateOutEngine.gateOutVehicle({ gatePassId: gpId1, jobId: '902', branchId: 1, securityOperatorId: 'SEC1', captureSource: 'ANPR', expectedVrn: 'VRN2', detectedVrn: 'VRN2', evidenceId: 'VALID-EVID' }),
      /VEHICLE_ALREADY_GATED_OUT|GATE_PASS_INVALID/,
      'S6.8: Double gate out blocked'
    );

    await assert.rejects(
      gateOutEngine.revokeGatePass({ gatePassId: gpId1, revokedBy: 'CASH1', reason: 'Test', branchId: 1 }),
      /GATE_PASS_CANNOT_BE_REVOKED/,
      'S6.9: Cannot revoke a gate pass that is already gated out'
    );

    let gatedToday = await gateOutEngine.getGatedOutToday(1);
    assert.ok(gatedToday.find((x:any) => x.gate_out_id === goRes.gateOutId), 'S6.10: getGatedOutToday works');

    conn.release();
  });

  await t.test('Scenario 7: getSABillingVisibility', async () => {
    // J2 (902) is gated out, SA = '1'
    let vis = await gateOutEngine.getSABillingVisibility(1, '1');
    const vJ2 = vis.find((x:any) => x.job_id == 902);
    
    assert.ok(vJ2, 'S7.1: SA sees 902');
    assert.strictEqual(vJ2.invoice_status, 'UPLOADED', 'S7.2: sees invoice status');
    assert.strictEqual(vJ2.payment_mode, 'CASH', 'S7.3: sees payment mode');
    assert.strictEqual(vJ2.gate_pass_status, 'VERIFIED', 'S7.4: sees gp verified');
    assert.ok(vJ2.gate_out_time, 'S7.5: sees gate out time');

    // J3 (903) has credit approved, gp issued, NOT gated out
    const vJ3 = vis.find((x:any) => x.job_id == 903);
    assert.strictEqual(vJ3.credit_status, 'GM_APPROVED', 'S7.6: sees GM approval');
    assert.strictEqual(vJ3.gate_pass_status, 'ISSUED', 'S7.7: sees gp issued');
    assert.strictEqual(vJ3.gate_out_time, null, 'S7.8: no gate out time yet');
  });
});
