import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { db } from "../db/index.ts";
import { RealtimeOwnershipPipeline } from "../core/workshop/realtime-ownership-pipeline.ts";
import { OperationsCommandCenter } from "../core/workshop/operations-command-center.ts";

describe("Phase 10 - Operations Command Control & SLA Evaluator", () => {
  const testBranchId = 1;
  const testHandoffId = `TEST-SLA-${Date.now()}`;
  const testJobId = `TEST-JOB-${Date.now()}`;
  const testVrn = `TEST-VRN-${Date.now()}`;

  before(async () => {
    // Drop existing mock tables to ensure clean schema
    await db.execute(`DROP TABLE IF EXISTS tbl_gate_entry`);
    await db.execute(`DROP TABLE IF EXISTS tbl_reception_intake`);
    await db.execute(`DROP TABLE IF EXISTS tbl_job_card`);
    await db.execute(`DROP TABLE IF EXISTS tbl_manager_assignment`);
    await db.execute(`DROP TABLE IF EXISTS tbl_gate_pass`);
    await db.execute(`DROP TABLE IF EXISTS tbl_payments`);
    await db.execute(`DROP TABLE IF EXISTS tbl_gate_out`);
    await db.execute(`DROP TABLE IF EXISTS tbl_invoice`);
    await db.execute(`DROP TABLE IF EXISTS tbl_evidence`);

    // Create missing tables for test environment
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_entry (
      gate_entry_id VARCHAR(100) PRIMARY KEY,
      vin VARCHAR(100),
      odometer INT
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_reception_intake (
      intake_id VARCHAR(100) PRIMARY KEY,
      gate_entry_id VARCHAR(100),
      status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_job_card (
      job_card_id VARCHAR(100) PRIMARY KEY,
      gate_entry_id VARCHAR(100),
      service_type VARCHAR(100),
      advisor_id VARCHAR(100),
      customer_complaint VARCHAR(255),
      workflow_state VARCHAR(50),
      created_at TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_manager_assignment (
      assignment_id VARCHAR(100) PRIMARY KEY,
      intake_id VARCHAR(100),
      gate_entry_id VARCHAR(100),
      vos_id VARCHAR(100),
      assigned_sa_id VARCHAR(100),
      assigned_sa_name VARCHAR(100),
      assigning_manager_id VARCHAR(100),
      assigned_at TIMESTAMP,
      recommendation_sa_id VARCHAR(100),
      recommendation_reason VARCHAR(255),
      is_override BOOLEAN,
      override_reason VARCHAR(255),
      branch_id VARCHAR(100),
      status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_pass (
      gate_pass_id VARCHAR(100) PRIMARY KEY,
      job_id VARCHAR(100),
      gate_pass_no VARCHAR(100),
      status VARCHAR(50),
      branch_id VARCHAR(100),
      release_basis VARCHAR(100),
      payment_id VARCHAR(100),
      credit_request_id VARCHAR(100),
      manual_gate_pass_request_id VARCHAR(100),
      is_manual_exception BOOLEAN,
      issued_by VARCHAR(100),
      issued_at TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_payments (
      payment_id VARCHAR(100) PRIMARY KEY,
      job_id VARCHAR(100),
      status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_invoice (
      pre_invoice_id VARCHAR(100) PRIMARY KEY,
      job_id VARCHAR(100),
      invoice_no VARCHAR(100),
      status VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_out (
      gate_out_id VARCHAR(100) PRIMARY KEY,
      gate_pass_id VARCHAR(100),
      job_id VARCHAR(100),
      branch_id VARCHAR(100),
      security_operator_id VARCHAR(100),
      evidence_id VARCHAR(100),
      capture_source VARCHAR(100),
      expected_vrn VARCHAR(100),
      detected_vrn VARCHAR(100),
      verification_result VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_evidence (
      evidence_id VARCHAR(100) PRIMARY KEY,
      lifecycle_status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_manager_overrides (
      override_id INT AUTO_INCREMENT PRIMARY KEY,
      job_id VARCHAR(100),
      target_stage VARCHAR(100),
      reason TEXT,
      manager_id VARCHAR(100),
      branch_id VARCHAR(100),
      override_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(`DELETE FROM tbl_handoff_sla WHERE handoff_id LIKE 'TEST-SLA-%'`);
    await db.execute(`DELETE FROM tbl_sa_intake WHERE vrn LIKE 'TEST-VRN-%'`);
    
    // Seed test job
    await db.execute(
      `INSERT INTO tbl_sa_intake (intake_id, vrn, customer_name, customer_phone, status, branch_id)
       VALUES (?, ?, 'Test Customer', '9999999999', 'PENDING_SA_ASSIGNMENT', ?)`,
      [testJobId, testVrn, testBranchId]
    );

    // Seed test handoff SLA (breached by 15 mins)
    const dueAt = new Date(Date.now() - 15 * 60000); 
    await db.execute(
      `INSERT INTO tbl_handoff_sla (handoff_id, entity_id, stage_name, owner_role, status, branch_id, sla_due_at)
       VALUES (?, ?, 'SLA_MANAGER_TO_SA', 'TECHNICIAN', 'ON_TRACK', ?, ?)`,
      [testHandoffId, testJobId, testBranchId, dueAt]
    );
  });

  after(async () => {
    await db.execute(`DELETE FROM tbl_sla_history WHERE instance_id = ?`, [testHandoffId]);
    await db.execute(`DELETE FROM tbl_handoff_sla WHERE handoff_id = ?`, [testHandoffId]);
    await db.execute(`DELETE FROM tbl_sa_intake WHERE intake_id = ?`, [testJobId]);
  });

  test("1. SLA Evaluator properly escalates breached SLA", async () => {
    const result = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations(testBranchId.toString());
    
    assert.strictEqual(result.success, true);
    assert.ok(result.handoffs_scanned >= 1);
    
    // Verify it updated in DB
    const [rows]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE handoff_id = ?`, [testHandoffId]);
    assert.strictEqual(rows[0].status, 'BREACHED');
    assert.ok(rows[0].escalation_level > 0, "Escalation level should be advanced");
  });

  test("2. SLA Evaluator is idempotent (does not duplicate escalation)", async () => {
    // Run it immediately again
    const result2 = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations(testBranchId.toString());
    
    assert.strictEqual(result2.success, true);
    // Since time hasn't advanced by another threshold, it should not create new escalations
    assert.strictEqual(result2.escalations_created, 0);
    assert.strictEqual(result2.escalations_advanced, 0);
    assert.ok(result2.already_processed > 0);
  });

  test("3. Operational Truth API aggregates correct vehicle state", async () => {
    const truthResult = await OperationsCommandCenter.getOperationalTruth(testVrn, testBranchId.toString());
    
    assert.strictEqual(truthResult.success, true);
    assert.strictEqual(truthResult.data.identifier, testVrn);
    
    const truth = truthResult.data.operational_truth;
    assert.strictEqual(truth.q3_what_stage_is_it_in, 'SLA_MANAGER_TO_SA');
    assert.strictEqual(truth.q5_is_it_breached, true);
  });

  test("4. Manager -> SA Handoff (Creation to Closure)", async () => {
    const intakeId = `INT-${Date.now()}`;
    const gateEntryId = `GE-${Date.now()}`;
    const branchId = testBranchId.toString();
    const saId = 'SA-999';

    // Insert dummy gate entry to satisfy startIntake query
    await db.execute(`INSERT INTO tbl_gate_entry (gate_entry_id, vin, odometer) VALUES (?, 'TEST-VIN', 1000)`, [gateEntryId]);

    // 1. Manager Assignment creates SLA
    const assignResult = await RealtimeOwnershipPipeline.assignServiceAdvisor({
      intakeId,
      gateEntryId,
      assignedSaId: saId,
      assignedSaName: 'Test SA',
      branchId
    }, { id: 'MGR-1', role: 'service_manager', branchId });

    // Verify SLA_MANAGER_TO_SA was created
    const [slaRows]: any = await db.execute(
      `SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_MANAGER_TO_SA'`,
      [intakeId]
    );
    assert.strictEqual(slaRows.length > 0, true, 'SLA should be created');
    assert.strictEqual(slaRows[0].status, 'ON_TRACK', 'SLA should be ON_TRACK');

    // 2. SA starts intake which closes SLA
    const { SaTechnicalIntakeEngine } = await import('../core/workshop/sa-technical-intake.ts');
    // Mock intake record
    await db.execute(`INSERT INTO tbl_reception_intake (intake_id, gate_entry_id) VALUES (?, ?)`, [intakeId, gateEntryId]);
    await SaTechnicalIntakeEngine.startIntake(gateEntryId, { id: saId, branchId });

    // Verify SLA_MANAGER_TO_SA was closed
    const [closedSlaRows]: any = await db.execute(
      `SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_MANAGER_TO_SA'`,
      [intakeId]
    );
    assert.strictEqual(closedSlaRows[0].status, 'ACCEPTED', 'SLA should be ACCEPTED/CLOSED');

    // Cleanup
    await db.execute(`DELETE FROM tbl_handoff_sla WHERE entity_id = ?`, [intakeId]);
    await db.execute(`DELETE FROM tbl_reception_intake WHERE intake_id = ?`, [intakeId]);
    await db.execute(`DELETE FROM tbl_manager_assignment WHERE intake_id = ?`, [intakeId]);
    await db.execute(`DELETE FROM tbl_gate_entry WHERE gate_entry_id = ?`, [gateEntryId]);
  });

  test("5. Cashier -> Security Handoff (Creation to Closure)", async () => {
    const { GateOutEngine } = await import('../core/workshop/gate-out-engine.ts');
    const jobId = `JOB-${Date.now()}`;
    const mockGe = `GE-MOCK-${Date.now()}`;
    const branchId = testBranchId.toString();

    // Insert mock gate entry and job card
    await db.execute(`INSERT INTO tbl_gate_entry (gate_entry_id, vin, odometer) VALUES (?, 'VIN-123', 0)`, [mockGe]);
    await db.execute(`INSERT INTO tbl_job_card (job_card_id, gate_entry_id, workflow_state) VALUES (?, ?, 'INVOICED')`, [jobId, mockGe]);
    await db.execute(`INSERT INTO tbl_payments (payment_id, job_id, status) VALUES ('PAY-123', ?, 'COMPLETED')`, [jobId]);
    await db.execute(`INSERT INTO tbl_evidence (evidence_id, lifecycle_status) VALUES ('EV-123', 'ACTIVE')`);

    // 1. Cashier creates gate pass, generating SLA_CASHIER_TO_SECURITY
    const engine = new GateOutEngine();
    const gpResult = await engine.createGatePass({
      jobId, 
      branchId,
      issuedBy: 'CASH-1'
    });
    assert.ok(gpResult.gatePassId);

    // Verify SLA created
    const [slaRows]: any = await db.execute(
      `SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_CASHIER_TO_SECURITY'`,
      [gpResult.gatePassId]
    );
    assert.strictEqual(slaRows.length > 0, true, 'SLA should be created');
    assert.strictEqual(slaRows[0].status, 'ON_TRACK', 'SLA should be ON_TRACK');

    // 2. Security gates out vehicle, closing SLA
    const goResult = await engine.gateOutVehicle({
      gatePassId: gpResult.gatePassId,
      jobId,
      securityOperatorId: 'SEC-1',
      branchId,
      expectedVrn: 'VRN-123',
      detectedVrn: 'VRN-123',
      evidenceId: 'EV-123',
      captureSource: 'ANPR'
    });
    assert.ok(goResult.gateOutId);

    // Verify SLA closed
    const [closedSlaRows]: any = await db.execute(
      `SELECT status, accepted_at FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_CASHIER_TO_SECURITY'`,
      [gpResult.gatePassId]
    );
    assert.strictEqual(closedSlaRows[0].status, 'COMPLETED', 'SLA should be COMPLETED');
    assert.ok(closedSlaRows[0].accepted_at, 'Accepted timestamp should be set');

    // Cleanup
    await db.execute(`DELETE FROM tbl_handoff_sla WHERE entity_id = ?`, [gpResult.gatePassId]);
    await db.execute(`DELETE FROM tbl_gate_out WHERE gate_pass_id = ?`, [gpResult.gatePassId]);
    await db.execute(`DELETE FROM tbl_gate_pass WHERE gate_pass_id = ?`, [gpResult.gatePassId]);
    await db.execute(`DELETE FROM tbl_job_card WHERE job_card_id = ?`, [jobId]);
    await db.execute(`DELETE FROM tbl_gate_entry WHERE gate_entry_id = ?`, [mockGe]);
    await db.execute(`DELETE FROM tbl_evidence WHERE evidence_id = 'EV-123'`);
  });

  test("6. Manager Override Functionality", async () => {
    const jobId = 'JOB-TEST-OVR-' + Date.now();
    
    // Setup initial SLA
    await db.execute(
      `INSERT INTO tbl_handoff_sla (entity_id, stage_name, owner_id, owner_role, status) VALUES (?, 'QC_PENDING', 'QC-1', 'qc_inspector', 'ON_TRACK')`,
      [jobId]
    );

    const { OperationsCommandCenter } = await import('../core/workshop/operations-command-center');
    
    await OperationsCommandCenter.overrideVehicleStage(
      jobId, 
      'FINAL_REVIEW', 
      'Customer requested urgent delivery', 
      'MGR-1', 
      'BR-SEDAM'
    );

    // Verify Audit record
    const [auditRows]: any = await db.execute(`SELECT * FROM tbl_manager_overrides WHERE job_id = ?`, [jobId]);
    assert.strictEqual(auditRows.length, 1, 'Audit record should be created');
    assert.strictEqual(auditRows[0].target_stage, 'FINAL_REVIEW');
    assert.strictEqual(auditRows[0].reason, 'Customer requested urgent delivery');
    
    // Verify SLA closure
    const [oldSla]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'QC_PENDING'`, [jobId]);
    assert.strictEqual(oldSla[0].status, 'OVERRIDDEN');

    // Verify New SLA
    const [newSla]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'FINAL_REVIEW'`, [jobId]);
    assert.strictEqual(newSla[0].status, 'ON_TRACK');
    assert.strictEqual(newSla[0].owner_role, 'MANAGER_OVERRIDE');

    // Cleanup
    await db.execute(`DELETE FROM tbl_manager_overrides WHERE job_id = ?`, [jobId]);
    await db.execute(`DELETE FROM tbl_handoff_sla WHERE entity_id = ?`, [jobId]);
  });
});
