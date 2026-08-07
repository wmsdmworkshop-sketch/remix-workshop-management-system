import { describe, it, expect, beforeEach } from "vitest";
import { FsbCampaignEngine } from "../workflows/fsb/campaign-engine";
import { FsbVehicleEligibilityEngine } from "../workflows/fsb/vehicle-eligibility-engine";
import { FsbCompletionEngine } from "../workflows/fsb/completion-engine";
import { FsbComplianceEngine } from "../workflows/fsb/compliance-engine";
import { FsbClaimEngine } from "../workflows/fsb/claim-engine";
import { FsbClosureEngine } from "../workflows/fsb/closure-engine";
import { FsbCampaign } from "../workflows/fsb/campaign-models";
import { FsbVehicleTarget } from "../workflows/fsb/vehicle-models";
import { FsbCompletionRecord } from "../workflows/fsb/completion-models";
import { FsbCampaignStatus, FsbVehicleStatus } from "../workflows/fsb/constants";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { FsbProgramProfile } from "../workflows/fsb/profiles";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { FsbWorkflowStrategy } from "../workflows/fsb/fsb-strategy";
import { FsbProvider } from "../workflows/fsb/fsb-provider";
import { BusinessCase, BusinessContext } from "../core";

describe("FSB & Campaign Workflow Integration & Engines", () => {
  let programRegistry: ProgramRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    programRegistry = new ProgramRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should successfully register FSB in the generic Program Registry", () => {
    programRegistry.register(FsbProgramProfile);
    const resolved = programRegistry.resolve("FSB_CAMPAIGN", "1.0.0");
    expect(resolved).toBeDefined();
    expect(resolved.capabilities.supports_financial).toBe(true);
    expect(resolved.capabilities.supports_oem).toBe(true);
  });

  it("should manage Campaign Lifecycle", () => {
    let campaign = { status: FsbCampaignStatus.DRAFT } as FsbCampaign;
    
    campaign = FsbCampaignEngine.activate(campaign);
    expect(campaign.status).toBe(FsbCampaignStatus.ACTIVE);
    
    campaign = FsbCampaignEngine.suspend(campaign);
    expect(campaign.status).toBe(FsbCampaignStatus.SUSPENDED);
    
    campaign = FsbCampaignEngine.activate(campaign); // Resume
    expect(campaign.status).toBe(FsbCampaignStatus.ACTIVE);
    
    campaign = FsbCampaignEngine.close(campaign);
    expect(campaign.status).toBe(FsbCampaignStatus.CLOSED);
  });

  it("should validate vehicle eligibility rules correctly", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const campaign = { 
      expiry_date: futureDate.toISOString(),
      model: ["ModelX", "ModelY"]
    } as FsbCampaign;
    
    const eligibleVehicle = { model: "ModelX", eligibility_status: "PENDING" } as FsbVehicleTarget;
    const rejectedVehicle = { model: "ModelZ", eligibility_status: "PENDING" } as FsbVehicleTarget;
    const completedVehicle = { model: "ModelX", eligibility_status: "ALREADY_COMPLETED" } as FsbVehicleTarget;
    
    expect(FsbVehicleEligibilityEngine.evaluate(campaign, eligibleVehicle)).toBe(FsbVehicleStatus.ELIGIBLE);
    expect(FsbVehicleEligibilityEngine.evaluate(campaign, rejectedVehicle)).toBe(FsbVehicleStatus.REJECTED);
    expect(FsbVehicleEligibilityEngine.evaluate(campaign, completedVehicle)).toBe(FsbVehicleStatus.ALREADY_COMPLETED);
    
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    campaign.expiry_date = pastDate.toISOString();
    expect(FsbVehicleEligibilityEngine.evaluate(campaign, eligibleVehicle)).toBe(FsbVehicleStatus.EXPIRED);
  });

  it("should evaluate completion correctly", () => {
    const validJob = { parts_used: ["P1"], labour_hours: 1.5, completion_status: "IN_PROGRESS" } as FsbCompletionRecord;
    const inspectedOnly = { parts_used: [], labour_hours: 0, completion_status: "INSPECTED_OK" } as FsbCompletionRecord;
    const noAction = { parts_used: [], labour_hours: 0, completion_status: "PENDING" } as FsbCompletionRecord;
    
    expect(FsbCompletionEngine.processCompletion(validJob)).toBe("COMPLETED");
    expect(FsbCompletionEngine.processCompletion(inspectedOnly)).toBe("INSPECTED_OK");
    expect(FsbCompletionEngine.processCompletion(noAction)).toBe("PENDING");
  });

  it("should calculate compliance correctly", () => {
    expect(FsbComplianceEngine.calculateCoverage(100, 45)).toBe(45);
    expect(FsbComplianceEngine.calculateCoverage(0, 0)).toBe(0);
    
    const branchVehicles = [
      { branch_id: "B1", eligibility_status: "ALREADY_COMPLETED" },
      { branch_id: "B1", eligibility_status: "PENDING" },
      { branch_id: "B2", eligibility_status: "ALREADY_COMPLETED" }
    ] as FsbVehicleTarget[];
    
    expect(FsbComplianceEngine.evaluateBranchCompliance(branchVehicles, "B1")).toBe(50);
    expect(FsbComplianceEngine.evaluateBranchCompliance(branchVehicles, "B2")).toBe(100);
    expect(FsbComplianceEngine.evaluateBranchCompliance(branchVehicles, "B3")).toBe(100); // No vehicles = 100% compliant
  });

  it("should validate claims correctly", () => {
    expect(FsbClaimEngine.validateClaim(1.5, true)).toBe(true);
    expect(FsbClaimEngine.validateClaim(2.5, true)).toBe(false); // Exceeds max hours
    expect(FsbClaimEngine.validateClaim(1.0, false)).toBe(false); // Missing VIN
  });

  it("should evaluate closure readiness", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const campaign = { expiry_date: futureDate.toISOString() } as FsbCampaign;
    
    expect(FsbClosureEngine.evaluateClosureReadiness(campaign, 85)).toBe(false);
    expect(FsbClosureEngine.evaluateClosureReadiness(campaign, 95)).toBe(true);
    
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    campaign.expiry_date = pastDate.toISOString();
    
    expect(FsbClosureEngine.evaluateClosureReadiness(campaign, 50)).toBe(true); // Auto close on expiry
  });

  it("should execute strategy transitions correctly using FSB Provider", async () => {
    const provider = new FsbProvider();
    const strategy = new FsbWorkflowStrategy(provider);
    strategyRegistry.registerStrategy(strategy);
    
    const resolvedStrategy = strategyRegistry.getStrategy("FSB_CAMPAIGN");
    expect(resolvedStrategy).toBeDefined();

    const mockCase: BusinessCase = {
      business_case_id: "BC-1",
      workflow_type: "FSB_CAMPAIGN",
      status: "DRAFT",
      references: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const context: BusinessContext = {
      identity: { entity_type: "USER", entity_id: "U1" },
      actor: { user_id: "U1", role: "MANAGER", branch_id: "HQ" },
      traceability: { correlation_id: "CORR-1", timestamp: new Date().toISOString() }
    };

    await resolvedStrategy!.onInitialize(context, mockCase);
    
    const campaign = { fsb_number: "FSB-123", campaign_number: "C-1" } as FsbCampaign;
    
    const transitionResult = await resolvedStrategy!.onBeforeTransition(context, mockCase, {
      current_state: "DRAFT",
      target_state: "ACTIVE",
      payload: campaign
    });

    expect(transitionResult.success).toBe(true);
    expect(mockCase.references?.length).toBe(1);
    expect(mockCase.references![0].entity_type).toBe("FSB_OEM_REF");
  });
});
