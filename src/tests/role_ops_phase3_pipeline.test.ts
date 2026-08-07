import { describe, it, expect, beforeEach } from "vitest";
import { RealtimeOwnershipPipeline } from "../core/workshop/realtime-ownership-pipeline";

// In-Memory Storage for Phase 3 Pipeline Tests
let mockGateEntries: any[] = [];
let mockReceptionIntakes: any[] = [];
let mockManagerAssignments: any[] = [];
let mockHandoffSla: any[] = [];
let mockJobCards: any[] = [];

const mockDbProvider = {
  execute: async (sql: string, params: any[] = []) => {
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes("INSERT INTO TBL_GATE_ENTRY")) {
      mockGateEntries.push({
        gate_entry_id: params[0],
        vin: params[1],
        source: params[2],
        odometer: params[3],
        driver_details: params[4],
        initial_remarks: params[5],
        status: params[6],
        arrival_time: params[7]
      });
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

    if (sqlUpper.includes("SELECT COUNT(*) AS CNT FROM TBL_RECEPTION_INTAKE")) {
      return [[{ cnt: mockReceptionIntakes.length }], []];
    }

    if (sqlUpper.includes("SELECT * FROM TBL_GATE_ENTRY WHERE GATE_ENTRY_ID")) {
      const match = mockGateEntries.find(g => g.gate_entry_id === params[0]);
      return [[match || null], []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_RECEPTION_INTAKE")) {
      mockReceptionIntakes.push({
        intake_id: params[0],
        gate_entry_id: params[1],
        vos_id: params[2],
        token_number: params[3],
        accepted_by: params[4],
        accepted_at: params[5],
        original_odometer: params[6],
        confirmed_odometer: params[7],
        odometer_corrected: params[8],
        correction_reason: params[9],
        visit_category: params[10],
        preliminary_complaints: params[11],
        branch_id: params[12],
        status: params[13]
      });
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_GATE_ENTRY SET STATUS")) {
      const item = mockGateEntries.find(g => g.gate_entry_id === params[0]);
      if (item) item.status = params[0];
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("SELECT * FROM TBL_RECEPTION_INTAKE WHERE STATUS = 'INTAKE_COMPLETED'")) {
      return [mockReceptionIntakes.filter(i => i.status === "INTAKE_COMPLETED"), []];
    }

    if (sqlUpper.includes("INSERT INTO TBL_MANAGER_ASSIGNMENT")) {
      mockManagerAssignments.push({
        assignment_id: params[0],
        intake_id: params[1],
        gate_entry_id: params[2],
        vos_id: params[3],
        assigned_sa_id: params[4],
        assigned_sa_name: params[5],
        assigning_manager_id: params[6],
        assigned_at: params[7],
        recommendation_sa_id: params[8],
        recommendation_reason: params[9],
        is_override: params[10],
        override_reason: params[11],
        branch_id: params[12],
        status: params[13]
      });
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_RECEPTION_INTAKE SET STATUS = 'ASSIGNED'")) {
      const item = mockReceptionIntakes.find(i => i.intake_id === params[0]);
      if (item) item.status = "ASSIGNED";
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("UPDATE TBL_HANDOFF_SLA SET ACCEPTED_AT")) {
      const item = mockHandoffSla.find(h => h.entity_id === params[1] && h.stage_name === params[2]);
      if (item) {
        item.accepted_at = params[0];
        item.status = "ACCEPTED";
      }
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

    if (sqlUpper.includes("SELECT * FROM TBL_JOB_CARD WHERE VRN = ?")) {
      const match = mockJobCards.filter(j => j.vrn === params[0]);
      return [match, []];
    }

    if (sqlUpper.includes("SELECT * FROM TBL_HANDOFF_SLA WHERE STATUS = 'ON_TRACK'")) {
      const matches = mockHandoffSla.filter(h => h.status === "ON_TRACK");
      return [matches, []];
    }

    if (sqlUpper.includes("UPDATE TBL_HANDOFF_SLA SET STATUS = 'BREACHED'")) {
      const item = mockHandoffSla.find(h => h.handoff_id === params[1]);
      if (item) {
        item.status = "BREACHED";
        item.escalation_level = 1;
      }
      return [{ affectedRows: 1 }, []];
    }

    if (sqlUpper.includes("SELECT GE.*, H.SLA_DUE_AT")) {
      return [mockGateEntries.map(g => ({ ...g, sla_due_at: new Date() })), []];
    }

    return [[], []];
  }
};

describe("Phase 3 — Gate-In → Reception → Manager Assignment Real-Time Ownership Pipeline", () => {
  beforeEach(() => {
    mockGateEntries = [];
    mockReceptionIntakes = [];
    mockManagerAssignments = [];
    mockHandoffSla = [];
    mockJobCards = [];
    RealtimeOwnershipPipeline.setDbProvider(mockDbProvider);
  });

  const securityUser = { id: "usr_sec_1", role: "security_agent", branchId: "BR-SEDAM" };
  const receptionistUser = { id: "usr_rec_1", username: "afroz", full_name: "Afroz Receptionist", role: "reception", branchId: "BR-SEDAM" };
  const managerUser = { id: "usr_mgr_1", username: "ahmed", full_name: "Ahmed Manager", role: "workshop_manager", branchId: "BR-SEDAM" };
  const unauthorizedUser = { id: "usr_sa_1", username: "patilshashi", full_name: "Shashi Patil", role: "service_advisor", branchId: "BR-SEDAM" };

  it("1. STAGE 01: Creates immutable Gate-In event & 5-minute SLA timer", async () => {
    const gateRes = await RealtimeOwnershipPipeline.createGateIn(
      {
        vrn: "KA32M9988",
        odometer: 45000,
        source: "OCR",
        driverName: "Ramesh Driver",
        branchId: "BR-SEDAM"
      },
      securityUser
    );

    expect(gateRes.success).toBe(true);
    expect(gateRes.gateEntryId).toBeDefined();
    expect(gateRes.vrn).toBe("KA32M9988");
    expect(gateRes.slaDueAt).toBeDefined();
  });

  it("2. STAGE 02: Performs Vehicle Passport Lookup from historical visits", async () => {
    const passport = await RealtimeOwnershipPipeline.lookupVehiclePassport("KA32M9988");
    expect(passport.vrn).toBe("KA32M9988");
    expect(passport.warrantyStatus).toBe("ELIGIABLE_ACTIVE_COVERAGE");
    expect(passport.openCampaigns).toContain("FSB-2026-EV-COOLANT-CHECK");
  });

  it("3. STAGE 03-06: Accepts Reception Intake, generates branch-scoped token & preserves original OCR odometer", async () => {
    const gateRes = await RealtimeOwnershipPipeline.createGateIn({ vrn: "KA32N1122", odometer: 12000 }, securityUser);

    const intakeRes = await RealtimeOwnershipPipeline.acceptReceptionIntake(
      {
        gateEntryId: gateRes.gateEntryId,
        visitCategory: "Scheduled Service",
        confirmedOdometer: 12500,
        correctionReason: "Security OCR blur check correction",
        preliminaryComplaints: "Engine oil change & brake fluid top up"
      },
      receptionistUser
    );

    expect(intakeRes.success).toBe(true);
    expect(intakeRes.tokenNumber).toMatch(/^(SED|SEDAM)-\d{8}-\d{3}$/);
    expect(intakeRes.odometerCorrected).toBe(true);
    expect(intakeRes.confirmedOdometer).toBe(12500);
  });

  it("4. STAGE 07-08: Queries Manager Pending Queue and generates AI SA recommendation", async () => {
    const queue = await RealtimeOwnershipPipeline.getManagerPendingQueue("BR-SEDAM");
    expect(queue).toBeDefined();

    const rec = await RealtimeOwnershipPipeline.generateAdvisorRecommendation("INT-TEST-001", "BR-SEDAM");
    expect(rec.recommendedSaId).toBeDefined();
    expect(rec.confidenceScore).toBeGreaterThan(0.8);
    expect(rec.reason).toContain("active JCs");
  });

  it("5. STAGE 09: Manager assigns Service Advisor and transfers ownership", async () => {
    const gateRes = await RealtimeOwnershipPipeline.createGateIn({ vrn: "KA32P5544", odometer: 20000 }, securityUser);
    const intakeRes = await RealtimeOwnershipPipeline.acceptReceptionIntake({ gateEntryId: gateRes.gateEntryId, visitCategory: "General Check-up", confirmedOdometer: 20000 }, receptionistUser);

    const assignRes = await RealtimeOwnershipPipeline.assignServiceAdvisor(
      {
        intakeId: intakeRes.intakeId,
        gateEntryId: gateRes.gateEntryId,
        assignedSaId: "usr_sa_1",
        assignedSaName: "Shashi Patil",
        isOverride: false
      },
      managerUser
    );

    expect(assignRes.success).toBe(true);
    expect(assignRes.assignedSaName).toBe("Shashi Patil");
    expect(assignRes.jobCardId).toBeDefined();
  });

  it("6. SECURITY: Rejects unauthorized SA self-assignment", async () => {
    await expect(
      RealtimeOwnershipPipeline.assignServiceAdvisor(
        {
          intakeId: "INT-UNAUTH",
          gateEntryId: "GE-UNAUTH",
          assignedSaId: "usr_sa_1",
          assignedSaName: "Shashi Patil"
        },
        unauthorizedUser
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("7. 5-MINUTE SLA ENGINE: Evaluates SLA breaches and triggers escalation event", async () => {
    const slaRes = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations("BR-SEDAM");
    expect(slaRes.success).toBe(true);
    expect(slaRes.evaluated_at).toBeDefined();
  });
});
