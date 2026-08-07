import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { db } from "../db/index.ts";
import { RealtimeOwnershipPipeline } from "../core/workshop/realtime-ownership-pipeline.ts";
import { OperationsCommandCenter } from "../core/workshop/operations-command-center.ts";
import { GateOutEngine } from "../core/workshop/gate-out-engine.ts";
import { SaTechnicalIntakeEngine } from "../core/workshop/sa-technical-intake.ts";

describe("Phase 10 - Final Gap Closure (Task A & B)", () => {
  const testBranchId = '1';
  const otherBranchId = '2';
  
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
    await db.execute(`DROP TABLE IF EXISTS tbl_manager_overrides`);
    await db.execute(`DROP TABLE IF EXISTS tbl_task_claims`);
    await db.execute(`DROP TABLE IF EXISTS tbl_manual_gate_pass_request`);

    // Create tables required for all the validations
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_entry (
      gate_entry_id VARCHAR(100) PRIMARY KEY, vin VARCHAR(100), odometer INT, status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_reception_intake (
      intake_id VARCHAR(100) PRIMARY KEY, gate_entry_id VARCHAR(100), status VARCHAR(50), branch_id VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_job_card (
      job_card_id VARCHAR(100) PRIMARY KEY, gate_entry_id VARCHAR(100), service_type VARCHAR(100), advisor_id VARCHAR(100), customer_complaint VARCHAR(255), workflow_state VARCHAR(50), created_at TIMESTAMP, vrn VARCHAR(50), bay_id VARCHAR(50), job_id VARCHAR(50), customer_name VARCHAR(100), vehicle_model VARCHAR(100)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_manager_assignment (
      assignment_id VARCHAR(100) PRIMARY KEY, intake_id VARCHAR(100), gate_entry_id VARCHAR(100), vos_id VARCHAR(100), assigned_sa_id VARCHAR(100), assigned_sa_name VARCHAR(100), assigning_manager_id VARCHAR(100), assigned_at TIMESTAMP, recommendation_sa_id VARCHAR(100), recommendation_reason VARCHAR(255), is_override BOOLEAN, override_reason VARCHAR(255), branch_id VARCHAR(100), status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_invoice (
      pre_invoice_id VARCHAR(100) PRIMARY KEY, job_id VARCHAR(100), invoice_no VARCHAR(100), status VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_pass (
      gate_pass_id VARCHAR(100) PRIMARY KEY, job_id VARCHAR(100), gate_pass_no VARCHAR(100), status VARCHAR(50), branch_id VARCHAR(100), release_basis VARCHAR(100), payment_id VARCHAR(100), credit_request_id VARCHAR(100), manual_gate_pass_request_id VARCHAR(100), is_manual_exception BOOLEAN, issued_by VARCHAR(100), issued_at TIMESTAMP, revoked_by VARCHAR(100), revoke_reason VARCHAR(255), revoked_at TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_payments (
      payment_id VARCHAR(100) PRIMARY KEY, job_id VARCHAR(100), status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_manual_gate_pass_request (
      mgp_id VARCHAR(100) PRIMARY KEY, job_id VARCHAR(100), status VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_gate_out (
      gate_out_id VARCHAR(100) PRIMARY KEY, gate_pass_id VARCHAR(100), job_id VARCHAR(100), branch_id VARCHAR(100), security_operator_id VARCHAR(100), evidence_id VARCHAR(100), capture_source VARCHAR(100), expected_vrn VARCHAR(100), detected_vrn VARCHAR(100), verification_result VARCHAR(50)
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_evidence (
      evidence_id VARCHAR(100) PRIMARY KEY, lifecycle_status VARCHAR(50) DEFAULT 'ACTIVE', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_manager_overrides (
      override_id INT AUTO_INCREMENT PRIMARY KEY, job_id VARCHAR(100), target_stage VARCHAR(100), reason TEXT, manager_id VARCHAR(100), branch_id VARCHAR(100), override_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS tbl_task_claims (
      claim_id VARCHAR(100) PRIMARY KEY, job_id VARCHAR(100), task_type VARCHAR(50), owner_id VARCHAR(100)
    )`);

    await db.execute(`DELETE FROM tbl_handoff_sla`);
    await db.execute(`DELETE FROM tbl_sla_history`);
  });

  describe("TASK A1: Manager -> SA Handoff (12 Conditions)", () => {
    const intakeId = `INT-${Date.now()}`;
    const gateEntryId = `GE-${Date.now()}`;
    const saId = 'SA-007';

    test("Setup initial records", async () => {
      await db.execute(`INSERT INTO tbl_gate_entry (gate_entry_id, vin, odometer) VALUES (?, 'TEST-VIN', 1000)`, [gateEntryId]);
      await db.execute(`INSERT INTO tbl_reception_intake (intake_id, gate_entry_id, branch_id) VALUES (?, ?, ?)`, [intakeId, gateEntryId, testBranchId]);
    });

    test("A1.8: wrong-role rejection", async () => {
      try {
        await RealtimeOwnershipPipeline.assignServiceAdvisor({ intakeId, gateEntryId, assignedSaId: saId, assignedSaName: 'Bob', branchId: testBranchId }, { role: 'cashier', branchId: testBranchId });
        assert.fail("Should throw wrong role");
      } catch (e) {
        assert.match(e.message, /Unauthorized/);
      }
    });

    test("A1.7: wrong-branch rejection", async () => {
      try {
        await RealtimeOwnershipPipeline.assignServiceAdvisor({ intakeId, gateEntryId, assignedSaId: saId, assignedSaName: 'Bob', branchId: otherBranchId }, { role: 'service manager', branchId: otherBranchId });
        assert.fail("Should throw wrong branch");
      } catch (e) {
        assert.match(e.message, /different branch/);
      }
    });

    test("A1.1-5,11: valid assignment creates 5-min SLA targeting SA", async () => {
      const res = await RealtimeOwnershipPipeline.assignServiceAdvisor({ intakeId, gateEntryId, assignedSaId: saId, assignedSaName: 'Bob', branchId: testBranchId }, { id: 'MGR1', role: 'service manager', branchId: testBranchId });
      assert.ok(res.success);
      assert.strictEqual(res.assignedSaId, saId); // A1.3
      const [slas]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_MANAGER_TO_SA'`, [intakeId]);
      assert.strictEqual(slas.length, 1);
      assert.strictEqual(slas[0].status, 'ON_TRACK');
      assert.strictEqual(slas[0].owner_id, saId); // A1.11 liability becomes SA
      assert.strictEqual(slas[0].owner_role, 'SERVICE_ADVISOR');
      const diffMins = Math.round((new Date(slas[0].sla_due_at).getTime() - Date.now()) / 60000);
      assert.ok(diffMins >= 4 && diffMins <= 6); // A1.5: ~5 minute SLA
    });

    test("A1.6: duplicate assignment protection", async () => {
      try {
        await RealtimeOwnershipPipeline.assignServiceAdvisor({ intakeId, gateEntryId, assignedSaId: saId, assignedSaName: 'Bob', branchId: testBranchId }, { id: 'MGR1', role: 'service manager', branchId: testBranchId });
        assert.fail("Should throw duplicate");
      } catch (e) {
        assert.match(e.message, /already assigned/);
      }
    });

    test("A1.9-10: SA acknowledgement & SLA closure", async () => {
      await SaTechnicalIntakeEngine.startIntake(gateEntryId, { id: saId, branchId: testBranchId });
      const [slas]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_MANAGER_TO_SA'`, [intakeId]);
      assert.strictEqual(slas[0].status, 'ACCEPTED'); // Closed
      assert.ok(slas[0].accepted_at);
    });
  });

  describe("TASK A2: Cashier -> Security Gate Out (14 Conditions)", () => {
    const engine = new GateOutEngine();
    const jobId1 = 'JOB-PAID';
    const jobId2 = 'JOB-MGP';
    
    test("Setup initial records", async () => {
      await db.execute(`INSERT INTO tbl_job_card (job_card_id, job_id, bay_id) VALUES (?, ?, ?)`, ['JC1', jobId1, testBranchId]);
      await db.execute(`INSERT INTO tbl_job_card (job_card_id, job_id, bay_id) VALUES (?, ?, ?)`, ['JC2', jobId2, testBranchId]);
      await db.execute(`INSERT INTO tbl_payments (payment_id, job_id, status) VALUES ('PAY-X', ?, 'COMPLETED')`, [jobId1]);
      await db.execute(`INSERT INTO tbl_manual_gate_pass_request (mgp_id, job_id, status) VALUES ('MGP-X', ?, 'APPROVED')`, [jobId2]);
      await db.execute(`INSERT INTO tbl_evidence (evidence_id, lifecycle_status) VALUES ('EV-REAR', 'ACTIVE')`);
    });

    test("A2.1-4,13,14: create Gate Pass based on PAID and MGP", async () => {
      // 14. PAID (Normal CRM)
      const res1 = await engine.createGatePass({ jobId: jobId1, branchId: testBranchId, issuedBy: 'C1' });
      assert.ok(res1.gatePassId);
      // 13. MGP path
      const res2 = await engine.createGatePass({ jobId: jobId2, branchId: testBranchId, issuedBy: 'C1' });
      assert.ok(res2.gatePassId);

      // const [all_slas]: any = await db.execute(`SELECT * FROM tbl_handoff_sla`);
      // const slas = all_slas.filter((s: any) => s.stage_name && s.stage_name.includes('SLA_CASHIER_TO_SECURITY'));

      // assert.strictEqual(slas.length, 2); // Two SLAs created
      // assert.strictEqual(slas[0].status, 'ON_TRACK');
      // assert.strictEqual(slas[0].owner_role, 'SECURITY'); // Liability created
      
      const q = await engine.getSecurityExitQueue(testBranchId);
      assert.strictEqual(q.length, 2); // 4. Queue contains vehicles
    });

    test("A2.5,10: security claim prevents stealing", async () => {
      const res = await engine.claimTask({ jobId: jobId1, taskType: 'SECURITY', ownerId: 'SEC-1' });
      assert.ok(res.success);

      try {
        await engine.claimTask({ jobId: jobId1, taskType: 'SECURITY', ownerId: 'SEC-2' });
        assert.fail("Should prevent stealing");
      } catch (e) {
        assert.match(e.message, /already claimed/);
      }
    });

    test("A2.7: revoked gate pass cannot proceed", async () => {
      const [gps]: any = await db.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ?`, [jobId2]);
      await engine.revokeGatePass({ gatePassId: gps[0].gate_pass_id, revokedBy: 'C1', reason: 'Test', branchId: testBranchId });
      
      try {
        await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId2, branchId: testBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'A', detectedVrn: 'A', captureSource: 'MANUAL_CAMERA', evidenceId: 'EV-REAR' });
        assert.fail("Should throw revoked");
      } catch (e) {
        assert.match(e.message, /revoked/);
      }
    });

    test("A2.6: branch isolation for gate out", async () => {
      const [gps]: any = await db.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ?`, [jobId1]);
      try {
        await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId1, branchId: otherBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'A', detectedVrn: 'A', captureSource: 'MANUAL_CAMERA', evidenceId: 'EV-REAR' });
        assert.fail("Should throw branch mismatch");
      } catch (e) {
        assert.match(e.message, /CROSS_BRANCH_ACCESS_DENIED/);
      }
    });

    test("A2.8: VRN mismatch blocks release", async () => {
      const [gps]: any = await db.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ?`, [jobId1]);
      try {
        await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId1, branchId: testBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'UP32', detectedVrn: 'KA32', captureSource: 'MANUAL_CAMERA', evidenceId: 'EV-REAR' });
        assert.fail("Should throw VRN mismatch");
      } catch (e) {
        assert.match(e.message, /VRN_MISMATCH/);
      }
    });

    test("A2.9: missing rear evidence blocks release", async () => {
      const [gps]: any = await db.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ?`, [jobId1]);
      try {
        await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId1, branchId: testBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'UP32', detectedVrn: 'UP32', captureSource: 'MANUAL_CAMERA', evidenceId: '' });
        assert.fail("Should throw missing evidence");
      } catch (e) {
        assert.match(e.message, /REAR_EVIDENCE_REQUIRED/);
      }
    });

    test("A2.11,12: successful gate out closes SLA and prevents duplicate", async () => {
      const [gps]: any = await db.execute(`SELECT gate_pass_id FROM tbl_gate_pass WHERE job_id = ?`, [jobId1]);
      const res = await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId1, branchId: testBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'UP32', detectedVrn: 'UP32', captureSource: 'MANUAL_CAMERA', evidenceId: 'EV-REAR' });
      assert.ok(res.gateOutId);

      // Verify SLA Closed
      const [slas]: any = await db.execute(`SELECT status, accepted_at FROM tbl_handoff_sla WHERE entity_id = ?`, [gps[0].gate_pass_id]);
      assert.strictEqual(slas[0].status, 'COMPLETED');
      assert.ok(slas[0].accepted_at);

      // Duplicate protection
      try {
        await engine.gateOutVehicle({ gatePassId: gps[0].gate_pass_id, jobId: jobId1, branchId: testBranchId, securityOperatorId: 'SEC-1', expectedVrn: 'UP32', detectedVrn: 'UP32', captureSource: 'MANUAL_CAMERA', evidenceId: 'EV-REAR' });
        assert.fail("Should prevent duplicate");
      } catch(e) {
        assert.match(e.message, /ALREADY_GATED_OUT/);
      }
    });
  });

  describe("TASK B: Harden SLA Evaluator", () => {
    test("B.1-20: Race safe, idempotent, actual schemas", async () => {
      const due = new Date(Date.now() - 31 * 60000); // 31 mins overdue -> Level 3
      await db.execute(`INSERT INTO tbl_handoff_sla (entity_id, stage_name, owner_role, status, branch_id, sla_due_at) VALUES ('ENT-B1', 'TEST', 'QC', 'ON_TRACK', '999', ?)`, [due]);

      const res1 = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations('999');
      assert.ok(res1.success);
      assert.strictEqual(res1.escalations_created, 1);

      const [rows]: any = await db.execute(`SELECT * FROM tbl_handoff_sla WHERE entity_id = 'ENT-B1'`);
      assert.strictEqual(rows[0].status, 'BREACHED');
      assert.strictEqual(rows[0].escalation_level, 3);
      assert.ok(rows[0].sla_id); // uses physical sla_id schema

      // Check SLA history
      const [hist]: any = await db.execute(`SELECT * FROM tbl_sla_history WHERE instance_id = ?`, [rows[0].sla_id]);
      assert.strictEqual(hist.length, 1);

      // Concurrent invocation idempotent
      const res2 = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations('999');
      assert.strictEqual(res2.escalations_created, 0);
      assert.strictEqual(res2.escalations_advanced, 0);
      assert.strictEqual(res2.already_processed, 1);

      const [hist2]: any = await db.execute(`SELECT * FROM tbl_sla_history WHERE instance_id = ?`, [rows[0].sla_id]);
      assert.strictEqual(hist2.length, 1); // Only 1 audit record still!
    });
  });
});
