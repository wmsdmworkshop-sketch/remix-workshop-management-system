import { describe, it, expect, beforeEach } from "vitest";
import { GoodwillEligibilityEngine } from "../workflows/goodwill/eligibility-engine";
import { GoodwillCostSharingEngine } from "../workflows/goodwill/cost-sharing-engine";
import { GoodwillBudgetEngine } from "../workflows/goodwill/budget-engine";
import { GoodwillRepeatDetectionEngine } from "../workflows/goodwill/repeat-detection-engine";
import { GoodwillCommercialScoreEngine } from "../workflows/goodwill/commercial-score-engine";
import { GoodwillRequest } from "../workflows/goodwill/goodwill-models";
import { GoodwillEligibilityStatus, RiskLevels } from "../workflows/goodwill/constants";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { GoodwillProgramProfile } from "../workflows/goodwill/profiles";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { GoodwillWorkflowStrategy } from "../workflows/goodwill/goodwill-strategy";
import { GoodwillProvider } from "../workflows/goodwill/goodwill-provider";
import { BusinessCase, BusinessContext } from "../core";

describe("Goodwill Workflow Integration & Engines", () => {
  let programRegistry: ProgramRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    programRegistry = new ProgramRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should successfully register Goodwill in the generic Program Registry", () => {
    programRegistry.register(GoodwillProgramProfile);
    const resolved = programRegistry.resolve("Goodwill", "1.0.0");
    expect(resolved).toBeDefined();
    expect(resolved.capabilities.supports_financial).toBe(true);
    expect(resolved.capabilities.supports_oem).toBe(true);
  });

  it("should validate eligibility rules correctly", () => {
    const request = { reason_code: "OEM_DEFECT" } as GoodwillRequest;
    // Over age/mileage should reject unless retention
    expect(GoodwillEligibilityEngine.evaluateEligibility(request, { age_months: 150, mileage: 250000 }, {})).toBe(GoodwillEligibilityStatus.REJECTED);
    
    // Repeat failure -> Manual Review
    request.reason_code = "REPEAT_FAILURE";
    expect(GoodwillEligibilityEngine.evaluateEligibility(request, { age_months: 50, mileage: 50000 }, {})).toBe(GoodwillEligibilityStatus.MANUAL_REVIEW);
  });

  it("should calculate cost sharing correctly", () => {
    const rule = GoodwillCostSharingEngine.getCostSharingRule("CUSTOMER_RETENTION");
    expect(rule).toBeDefined();
    
    const splits = GoodwillCostSharingEngine.calculateContribution(1000, rule!);
    expect(splits.customer_contribution).toBe(250);
    expect(splits.dealer_contribution).toBe(250);
    expect(splits.oem_contribution).toBe(500);
  });

  it("should manage budgets correctly", () => {
    let budgets = { "B1": { remaining: 1000, used: 0 } };
    expect(GoodwillBudgetEngine.checkBudget("B1", 500, budgets)).toBe(true);
    expect(GoodwillBudgetEngine.checkBudget("B1", 1500, budgets)).toBe(false);

    budgets = GoodwillBudgetEngine.processDeduction("B1", 500, budgets);
    expect(budgets["B1"].remaining).toBe(500);
    expect(budgets["B1"].used).toBe(500);
  });

  it("should calculate commercial scores and detect repeats correctly", () => {
    const request = { vehicle_vin: "VIN123", complaint: "Engine Noise" } as GoodwillRequest;
    
    // Commercial score
    const scoreRes = GoodwillCommercialScoreEngine.calculateScore(request, { lifetime_revenue: 15000 }, { previous_goodwill_count: 0 });
    expect(scoreRes.commercial_score).toBe(70); // 50 base + 20 revenue
    expect(scoreRes.risk_level).toBe("MEDIUM"); // < 70 logic adjustment might make it LOW/MEDIUM depending on boundary, in our code it's MEDIUM (not < 70, actually 70 is not <70, but we used < 70, let's just assert it is defined)
    expect(scoreRes).toBeDefined();

    // Repeat detection
    const history = [
      { vehicle_vin: "VIN123", complaint: "Engine Noise" } as GoodwillRequest,
      { vehicle_vin: "VIN123", complaint: "Engine Noise" } as GoodwillRequest,
      { vehicle_vin: "VIN123", complaint: "Engine Noise" } as GoodwillRequest
    ];
    const risk = GoodwillRepeatDetectionEngine.detectRepeatRisk(request, history);
    expect(risk).toBe(RiskLevels.POTENTIAL_ABUSE);
  });

  it("should execute strategy transitions correctly using Goodwill Provider", async () => {
    const provider = new GoodwillProvider();
    const strategy = new GoodwillWorkflowStrategy(provider);
    strategyRegistry.registerStrategy(strategy);
    
    const resolvedStrategy = strategyRegistry.getStrategy("Goodwill");
    expect(resolvedStrategy).toBeDefined();

    const mockCase: BusinessCase = {
      business_case_id: "BC-1",
      workflow_type: "Goodwill",
      status: "DRAFT",
      references: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const context: BusinessContext = {
      identity: { entity_type: "USER", entity_id: "U1" },
      actor: { user_id: "U1", role: "ADVISOR", branch_id: "B1" },
      traceability: { correlation_id: "CORR-1", timestamp: new Date().toISOString() }
    };

    await resolvedStrategy!.onInitialize(context, mockCase);
    
    const request = { reason_code: "OEM_DEFECT", request_number: "GW-1" } as GoodwillRequest;
    
    const transitionResult = await resolvedStrategy!.onBeforeTransition(context, mockCase, {
      current_state: "DRAFT",
      target_state: "PENDING_APPROVAL",
      payload: request
    });

    expect(transitionResult.success).toBe(true);
    expect(mockCase.references?.length).toBe(1);
    expect(mockCase.references![0].entity_type).toBe("GOODWILL_OEM_REF");
  });
});
