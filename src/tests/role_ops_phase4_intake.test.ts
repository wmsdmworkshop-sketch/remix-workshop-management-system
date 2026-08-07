import { describe, it, expect, beforeEach } from "vitest";
import { SaTechnicalIntakeEngine } from "../core/workshop/sa-technical-intake";

// In-Memory Storage for Phase 4 Intake Tests
let mockGateEntries: any[] = [];
let mockReceptionIntakes: any[] = [];
let mockManagerAssignments: any[] = [];
let mockSaIntakes: any[] = [];
let mockAmendmentAudits: any[] = [];
let mockHandoffSla: any[] = [];
let mockJobCards: any[] = [];

const mockDbProvider = {
  execute: async (sql: string, params: any[] = []) => {
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes("SELECT MA.*, RI.VISIT_CATEGORY")) {
      const filtered = mockManagerAssignments.filter(
        m => m.assigned_sa_id === params[0] || (m.assigned_sa_name || "").toLowerCase() === (params[1] || "").toLowerCase()
      );
      return [filtered.map(m => ({ ...m, vin: "VIN-KA32M9988", visit_category: "Scheduled Service", confirmed_odometer: 45000 })), []];
    }

    if (sqlUpper.includes("SELECT * FROM TBL_GATE_ENTRY WHERE GATE_ENTRY_ID")) {
      const match = mockGateEntries.find(g => g.gate_entry_id === params[0]) || { gate_entry_id: params[0], vin: "VIN-KA32M9988", odometer: 45000 };
      return [[match], []];
    }

    if (sqlUpper.includes("SELECT * FROM TBL_RECEPTION_INTAKE WHERE GATE_ENTRY_ID")) {
      const match = mockReceptionIntakes.find(r => r.gate_entry_id === params[0]) || { intake_id: "INT-REC-01", confirmed_odometer: 45000 };
      return [[match], []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_COMPLAINT_AMENDMENT_AUDIT")) {
      mockAmendmentAudits.push({
        audit_id: params[0],
        intake_id: params[1],
        job_card_id: params[2],
        previous_complaints_json: params[3],
        new_complaints_json: params[4],
        amended_by: params[5],
        amended_at: params[6],
        amendment_reason: params[7],
        branch_id: params[8]
      });
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("SELECT COUNT(*) AS CNT FROM TBL_SA_INTAKE")) {
      return [[{ cnt: mockSaIntakes.length }], []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_SA_INTAKE")) {
      mockSaIntakes.push({
        intake_id: params[0],
        job_card_id: params[1],
        gate_entry_id: params[2],
        vos_id: params[3],
        sa_id: params[4],
        sa_name: params[5],
        gate_odometer: params[6],
        reception_odometer: params[7],
        sa_verified_odometer: params[8],
        odometer_corrected: params[9],
        complaint_source: params[10],
        authenticated_by: params[11],
        authenticated_at: params[12],
        authenticated_complaints_json: params[13],
        fsv_status: params[14],
        warranty_prescreen_status: params[15],
        job_scope_json: params[16],
        jc_type: params[17],
        branch_id: params[18],
        status: params[19],
        created_at: params[20]
      });
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_JOB_CARD")) {
      mockJobCards.push({
        job_card_id: params[0],
        gate_entry_id: params[1],
        service_type: params[2],
        advisor_id: params[3],
        customer_complaint: params[4],
        workflow_state: params[5],
        created_at: params[6]
      });
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_SA_INTAKE SET RECONCILED_CRM_JC_NO")) {
      const item = mockSaIntakes.find(i => i.job_card_id === params[2]);
      if (item) {
        item.reconciled_crm_jc_no = params[0];
        item.reconciled_at = params[1];
      }
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_SA_INTAKE SET STATUS = 'SENT_TO_FLOOR'")) {
      const item = mockSaIntakes.find(i => i.job_card_id === params[0] || i.gate_entry_id === params[1]);
      if (item) item.status = "SENT_TO_FLOOR";
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_JOB_CARD SET WORKFLOW_STATE = 'FLOOR_READY'")) {
      const item = mockJobCards.find(j => j.job_card_id === params[0]);
      if (item) item.workflow_state = "FLOOR_READY";
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_HANDOFF_SLA")) {
      mockHandoffSla.push({
        handoff_id: params[0],
        stage_name: params[1],
        entity_id: params[2],
        owner_id: params[3],
        owner_role: params[4],
        created_at: params[5],
        sla_due_at: params[6],
        status: params[7],
        branch_id: params[8]
      });
      return [{ affectedRows: 1 }, []];
    }

    return [[], []];
  }
};

describe("Phase 4 — SA Technical Intake, Complaint Authentication & JC Creation", () => {
  beforeEach(() => {
    mockGateEntries = [
      { gate_entry_id: "GE-001", vin: "VIN-KA32M9988", odometer: 45000 }
    ];
    mockReceptionIntakes = [
      { intake_id: "INT-REC-01", gate_entry_id: "GE-001", confirmed_odometer: 45000 }
    ];
    mockManagerAssignments = [
      { assignment_id: "ASG-001", intake_id: "INT-REC-01", gate_entry_id: "GE-001", assigned_sa_id: "usr_sa_1", assigned_sa_name: "Shashi Patil", branch_id: "BR-SEDAM", status: "ASSIGNED" }
    ];
    mockSaIntakes = [];
    mockAmendmentAudits = [];
    mockHandoffSla = [];
    mockJobCards = [];
    SaTechnicalIntakeEngine.setDbProvider(mockDbProvider);
  });

  const saUser = { id: "usr_sa_1", username: "patilshashi", full_name: "Shashi Patil", role: "service_advisor", branchId: "BR-SEDAM" };
  const otherSaUser = { id: "usr_sa_99", username: "other_sa", full_name: "Other SA", role: "service_advisor", branchId: "BR-SEDAM" };

  it("1. QUEUE: SA retrieves assigned vehicles under MY ATTENTION", async () => {
    const queue = await SaTechnicalIntakeEngine.getSaAssignedQueue("usr_sa_1", "Shashi Patil", "BR-SEDAM");
    expect(queue.length).toBe(1);
    expect(queue[0].gateEntryId).toBe("GE-001");
  });

  it("2. SECURITY ISOLATION: Other SA receives empty queue for non-assigned vehicles", async () => {
    const queue = await SaTechnicalIntakeEngine.getSaAssignedQueue("usr_sa_99", "Other SA", "BR-SEDAM");
    expect(queue.length).toBe(0);
  });

  it("3. INTAKE START: Starts technical intake and records workflow event", async () => {
    const res = await SaTechnicalIntakeEngine.startIntake("GE-001", saUser);
    expect(res.success).toBe(true);
    expect(res.intakeStartedAt).toBeDefined();
  });

  it("4. ODOMETER AUDIT: Verifies odometer and preserves original gate/reception readings", async () => {
    const odoRes = await SaTechnicalIntakeEngine.verifyOdometer(
      {
        gateEntryId: "GE-001",
        saVerifiedOdometer: 45200,
        correctionReason: "Cluster verification adjustment"
      },
      saUser
    );

    expect(odoRes.success).toBe(true);
    expect(odoRes.gateOdometer).toBe(45000);
    expect(odoRes.receptionOdometer).toBe(45000);
    expect(odoRes.saVerifiedOdometer).toBe(45200);
    expect(odoRes.odometerCorrected).toBe(true);
  });

  it("5. COMPLAINT AUTHENTICATION: Authenticates customer/driver complaints", async () => {
    const compRes = await SaTechnicalIntakeEngine.authenticateComplaints(
      {
        gateEntryId: "GE-001",
        complaintSource: "DRIVER",
        complaints: [
          { complaintText: "Clutch pedal hard & gear slip", category: "TRANSMISSION", priority: "High" }
        ]
      },
      saUser
    );

    expect(compRes.success).toBe(true);
    expect(compRes.authenticatedBy).toBe("Shashi Patil");
    expect(compRes.complaints.length).toBe(1);
  });

  it("6. AUDITED AMENDMENT: Amending authenticated complaints logs audit record", async () => {
    const amendRes = await SaTechnicalIntakeEngine.amendAuthenticatedComplaints(
      {
        intakeId: "INT-REC-01",
        newComplaints: [{ complaintText: "Clutch slip & brake noise" }],
        amendmentReason: "Additional driver feedback during walkaround"
      },
      saUser
    );

    expect(amendRes.success).toBe(true);
    expect(amendRes.auditId).toBeDefined();
    expect(mockAmendmentAudits.length).toBe(1);
  });

  it("7. REPEAT FAILURE INTELLIGENCE: Flags repeat clutch complaint within history window", async () => {
    const intel = await SaTechnicalIntakeEngine.evaluateRepeatFailures("KA32M9988", [
      { complaintText: "Clutch slipping on slope" }
    ]);

    expect(intel.hasRepeatWarning).toBe(true);
    expect(intel.suggestion).toContain("AI SUGGESTION");
    expect(intel.suggestion.toLowerCase()).toContain("clutch");
  });

  it("8. FSV ELIGIBILITY: Evaluates 1st Free Service eligibility", async () => {
    const fsv = await SaTechnicalIntakeEngine.evaluateFsvEligibility("VIN-KA32M9988", 12000);
    expect(fsv.status).toBe("ELIGIBLE");
    expect(fsv.serviceName).toContain("1st Free Service");
  });

  it("9. WARRANTY PRE-SCREEN: Evaluates potential warranty eligibility without auto-approving claim", async () => {
    const warr = await SaTechnicalIntakeEngine.evaluateWarrantyPreScreen("VIN-KA32M9988", 45000, [
      { complaintText: "Coolant leak", isWarranty: true }
    ]);

    expect(warr.status).toBe("POTENTIALLY_ELIGIBLE");
    expect(warr.reason).toContain("Subject to Warranty Team final adjudication");
  });

  it("10. AUTHORIZATION GATE: Validates missing intake fields and blocks unverified JC creation", async () => {
    const gateCheck = SaTechnicalIntakeEngine.validateFloorReadyGate({});
    expect(gateCheck.isReady).toBe(false);
    expect(gateCheck.blockingItems.length).toBeGreaterThan(0);
  });

  it("11. DWIP TEMP JC CREATION: Creates DWIP Temp JC with unique identifier", async () => {
    const jcRes = await SaTechnicalIntakeEngine.createJobCard(
      {
        gateEntryId: "GE-001",
        saVerifiedOdometer: 45000,
        complaintSource: "DRIVER",
        authenticatedComplaints: [{ complaintText: "Clutch slip" }],
        jobScope: [{ complaint: "Clutch slip", proposedInspection: "Clutch plate check", jobType: "Running Repair" }],
        jcChoice: "DWIP_TEMP"
      },
      saUser
    );

    expect(jcRes.success).toBe(true);
    expect(jcRes.jobCardId).toMatch(/^DWIP-TEMP-(SED|SEDAM)-\d{8}-\d{3}$/);
    expect(jcRes.jcType).toBe("DWIP_TEMP");
  });

  it("12. CRM RECONCILIATION: Reconciles DWIP Temp JC to CRM JC", async () => {
    // Create DWIP Temp JC first
    const jcRes = await SaTechnicalIntakeEngine.createJobCard(
      {
        gateEntryId: "GE-001",
        saVerifiedOdometer: 45000,
        complaintSource: "DRIVER",
        authenticatedComplaints: [{ complaintText: "Clutch slip" }],
        jobScope: [{ complaint: "Clutch slip", proposedInspection: "Clutch plate check", jobType: "Running Repair" }],
        jcChoice: "DWIP_TEMP"
      },
      saUser
    );

    const reconRes = await SaTechnicalIntakeEngine.reconcileCrmJobCard(jcRes.jobCardId, "CRM-JC-900881", saUser);

    expect(reconRes.success).toBe(true);
    expect(reconRes.reconciledCrmJcNo).toBe("CRM-JC-900881");
  });

  it("13. FLOOR HANDOFF & 5-MIN SLA: Transfers ownership to Floor In-Charge & starts 5-minute SLA", async () => {
    const handoffRes = await SaTechnicalIntakeEngine.sendToFloor(
      {
        jobCardId: "DWIP-TEMP-SED-20260803-001",
        gateEntryId: "GE-001"
      },
      saUser
    );

    expect(handoffRes.success).toBe(true);
    expect(handoffRes.newOwnerRole).toBe("floor_incharge");
    expect(handoffRes.slaDueAt).toBeDefined();
    expect(mockHandoffSla.length).toBe(1);
    expect(mockHandoffSla[0].stage_name).toBe("SA_TO_FLOOR");
  });
});
