import { describe, it, expect, beforeEach } from "vitest";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { BreakdownProgramProfile } from "../workflows/breakdown/profiles";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { BreakdownWorkflowStrategy } from "../workflows/breakdown/breakdown-strategy";
import { BreakdownProvider } from "../workflows/breakdown/breakdown-provider";

import { BreakdownIncidentEngine } from "../workflows/breakdown/incident-engine";
import { BreakdownDispatchEngine } from "../workflows/breakdown/dispatch-engine";
import { BreakdownGpsEngine } from "../workflows/breakdown/gps-engine";
import { BreakdownEtaEngine } from "../workflows/breakdown/eta-engine";
import { BreakdownAssignmentEngine } from "../workflows/breakdown/assignment-engine";
import { BreakdownDiagnosisEngine } from "../workflows/breakdown/diagnosis-engine";
import { BreakdownRecoveryEngine } from "../workflows/breakdown/recovery-engine";
import { BreakdownHandoverEngine } from "../workflows/breakdown/handover-engine";
import { BreakdownClosureEngine } from "../workflows/breakdown/closure-engine";
import { BreakdownSlaEngine } from "../workflows/breakdown/sla-engine";

import { BreakdownCustomer } from "../workflows/breakdown/customer-models";
import { BreakdownLocation } from "../workflows/breakdown/location-models";
import { BreakdownQrt } from "../workflows/breakdown/qrt-models";
import { BreakdownDiagnosis } from "../workflows/breakdown/diagnosis-models";
import { BreakdownRecovery } from "../workflows/breakdown/recovery-models";
import { BreakdownHandover } from "../workflows/breakdown/handover-models";
import { BusinessCase, BusinessContext } from "../core";
import { BreakdownIncidentStatus, QrtStatus } from "../workflows/breakdown/constants";

describe("Breakdown & Roadside Assistance Workflow Integration", () => {
  let programRegistry: ProgramRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    programRegistry = new ProgramRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should successfully register Breakdown in the Program Registry", () => {
    programRegistry.register(BreakdownProgramProfile);
    
    const resolved = programRegistry.resolve("BREAKDOWN_ROADSIDE_ASSISTANCE", "1.0.0");
    expect(resolved).toBeDefined();
    expect(resolved.capabilities.supports_recovery).toBe(true);
  });

  it("should create incident with correct priority and severity", () => {
    const vipCustomer = { customer_id: "C1", name: "Alice", phone: "123", is_vip: true } as BreakdownCustomer;
    const incident = BreakdownIncidentEngine.createIncident(vipCustomer, "ACCIDENT");
    
    expect(incident.priority).toBe("HIGH"); // VIP -> HIGH
    expect(incident.severity).toBe("CRITICAL"); // ACCIDENT -> CRITICAL
    expect(incident.status).toBe(BreakdownIncidentStatus.OPEN);
  });

  it("should calculate GPS distance and find QRT", () => {
    const loc1 = { latitude: 10, longitude: 10 } as BreakdownLocation;
    const loc2 = { latitude: 10.1, longitude: 10.1 } as BreakdownLocation;
    
    const dist = BreakdownGpsEngine.calculateDistance(loc1, loc2);
    expect(dist).toBeGreaterThan(0);
    
    const qrts = [{ qrt_id: "Q1" }, { qrt_id: "Q2" }];
    const nearest = BreakdownGpsEngine.findNearestQrt(loc1, qrts);
    expect(nearest).toBe("Q1");
  });

  it("should calculate ETA and SLA breaches", () => {
    // 30km urban = 60 mins. Max ETA urban = 60 mins.
    const eta1 = BreakdownEtaEngine.calculateEta("I1", 30, false);
    expect(eta1.travel_time_mins).toBe(60);
    expect(eta1.sla_breached).toBe(false);
    expect(eta1.sla_remaining_mins).toBe(0);
    
    // 40km urban = 80 mins. Max ETA urban = 60 mins. -> Breach
    const eta2 = BreakdownEtaEngine.calculateEta("I2", 40, false);
    expect(eta2.travel_time_mins).toBe(80);
    expect(eta2.sla_breached).toBe(true);
  });

  it("should manage QRT assignment", () => {
    let qrt = { current_status: QrtStatus.AVAILABLE } as BreakdownQrt;
    qrt = BreakdownAssignmentEngine.assignQrt(qrt);
    expect(qrt.current_status).toBe(QrtStatus.DISPATCHED);
    expect(qrt.dispatch_time).toBeDefined();
    
    qrt = BreakdownAssignmentEngine.markReached(qrt);
    expect(qrt.current_status).toBe(QrtStatus.ON_SITE);
    expect(qrt.reached_time).toBeDefined();
  });

  it("should evaluate diagnosis for towing", () => {
    const diag1 = { can_continue_journey: true, temporary_repair_done: true, failure_category: "MECHANICAL" } as BreakdownDiagnosis;
    expect(BreakdownDiagnosisEngine.evaluateDiagnosis(diag1).needsTow).toBe(false);
    
    const diag2 = { can_continue_journey: false, temporary_repair_done: false, failure_category: "MECHANICAL" } as BreakdownDiagnosis;
    expect(BreakdownDiagnosisEngine.evaluateDiagnosis(diag2).needsTow).toBe(true);
    
    const diag3 = { can_continue_journey: true, temporary_repair_done: true, failure_category: "ACCIDENT" } as BreakdownDiagnosis;
    // Auto tow on accident rule
    expect(BreakdownDiagnosisEngine.evaluateDiagnosis(diag3).needsTow).toBe(true);
  });

  it("should manage recovery", () => {
    let recovery = { incident_id: "I1", tow_required: true, tow_assigned: false } as BreakdownRecovery;
    recovery = BreakdownRecoveryEngine.assignTow(recovery, "VEND1");
    expect(recovery.tow_assigned).toBe(true);
    expect(recovery.tow_vendor_id).toBe("VEND1");
    
    recovery = BreakdownRecoveryEngine.completeRecovery(recovery, 1500);
    expect(recovery.recovery_completed_time).toBeDefined();
    expect(recovery.recovery_cost).toBe(1500);
  });

  it("should manage workshop handover", () => {
    let handover = { incident_id: "I1", workshop_id: "W1" } as BreakdownHandover;
    handover = BreakdownHandoverEngine.acknowledgeArrival(handover);
    expect(handover.workshop_status).toBe("IN_WORKSHOP");
    
    handover = BreakdownHandoverEngine.assignJobCard(handover, "JC-123", "ADV-1");
    expect(handover.job_card_id).toBe("JC-123");
    expect(handover.workshop_status).toBe("REPAIRING");
  });

  it("should execute Breakdown strategy transitions correctly using Provider", async () => {
    const provider = new BreakdownProvider();
    const strategy = new BreakdownWorkflowStrategy(provider);
    strategyRegistry.registerStrategy(strategy);
    
    const resolvedStrategy = strategyRegistry.getStrategy("BREAKDOWN_ROADSIDE_ASSISTANCE");
    expect(resolvedStrategy).toBeDefined();

    const mockCase: BusinessCase = {
      business_case_id: "BC-1",
      workflow_type: "BREAKDOWN_ROADSIDE_ASSISTANCE",
      status: "OPEN",
      references: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const context: BusinessContext = {
      identity: { entity_type: "USER", entity_id: "U1" },
      actor: { user_id: "U1", role: "DISPATCHER", branch_id: "CALL_CENTER" },
      traceability: { correlation_id: "CORR-1", timestamp: new Date().toISOString() }
    };

    await resolvedStrategy!.onInitialize(context, mockCase);
    
    const incident = { incident_number: "INC-1" } as any;
    
    const transitionResult = await resolvedStrategy!.onBeforeTransition(context, mockCase, {
      current_state: "OPEN",
      target_state: "ASSIGNED",
      payload: incident
    });

    expect(transitionResult.success).toBe(true);
    expect(mockCase.references?.length).toBe(1);
    expect(mockCase.references![0].entity_type).toBe("BREAKDOWN_OEM_REF");
  });
});
