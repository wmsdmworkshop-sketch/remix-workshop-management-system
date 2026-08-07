import { describe, it, expect, beforeEach } from "vitest";
import { AmcEntitlementEngine } from "../workflows/amc/entitlement-engine";
import { AmcContract } from "../workflows/amc/contract-models";
import { AmcCoverageRules } from "../workflows/amc/coverage-models";
import { AmcContractStatus, AmcPlanTypes } from "../workflows/amc/constants";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { AmcProgramProfile } from "../workflows/amc/profiles";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { AMCWorkflowStrategy } from "../workflows/amc/amc-strategy";
import { AmcProvider } from "../workflows/amc/amc-provider";
import { BusinessCaseEngine, BusinessCase, BusinessContext } from "../core";
import { EventBus } from "../core/event-bus";
import { PolicyEngine } from "../core/policy-engine";
import { WorkflowRegistry } from "../core/workflow-registry";

describe("AMC Workflow Integration & Entitlement", () => {
  let programRegistry: ProgramRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    programRegistry = new ProgramRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should successfully register AMC in the generic Program Registry", () => {
    programRegistry.register(AmcProgramProfile);
    const resolved = programRegistry.resolve("AMC", "1.0.0");
    expect(resolved).toBeDefined();
    expect(resolved.capabilities.supports_financial).toBe(true);
    expect(resolved.capabilities.supports_oem).toBe(false);
  });

  it("should validate active contract entitlement rules correctly", () => {
    const contract = {
      contract_number: "AMC-1001",
      customer_id: "CUST-A",
      vehicle_vin: "VIN123",
      vehicle_registration: "REG123",
      contract_type: AmcPlanTypes.GOLD,
      start_date: new Date(Date.now() - 10000000000).toISOString(),
      end_date: new Date(Date.now() + 10000000000).toISOString(),
      validity_months: 12,
      kilometer_limit: 50000,
      coverage_type: "FULL",
      contract_value: 1500,
      remaining_value: 1500,
      remaining_services: 2,
      auto_renewal: false,
      contract_status: AmcContractStatus.ACTIVE,
      business_case_id: "bc-1",
      program_name: "AMC",
      current_workflow_state: "ACTIVE",
      metadata: { tags: ["AMC"], created_by: "system", updated_by: "system" },
      timeline: {
        created_at: new Date().toISOString(),
        current_step: "ACTIVE",
        events: [],
        milestones: [],
        sla_clock_active: false,
        elapsed_time_minutes: 0,
        waiting_time_minutes: 0
      }
    } as AmcContract;

    const rules: AmcCoverageRules = {
      rule_id: "RULE-1",
      plan_type: AmcPlanTypes.GOLD,
      covered_labour_codes: ["L1", "L2"],
      covered_part_categories: ["OIL", "FILTER"],
      covered_consumables: true,
      covered_lubricants: true,
      covered_fluids: true,
      covered_filters: true,
      excluded_items: ["BATTERY"],
      excludes_wear_and_tear: true,
      excludes_accident_damage: true,
      excludes_misuse: true,
      excludes_abuse: true
    };

    expect(AmcEntitlementEngine.isContractActive(contract)).toBe(true);
    expect(AmcEntitlementEngine.validateVehicle(contract, "VIN123")).toBe(true);
    expect(AmcEntitlementEngine.validateVehicle(contract, "WRONGVIN")).toBe(false);
    expect(AmcEntitlementEngine.validateMileage(contract, 45000)).toBe(true);
    expect(AmcEntitlementEngine.validateMileage(contract, 55000)).toBe(false);
    
    // Coverage
    expect(AmcEntitlementEngine.isLabourCovered(rules, "L1")).toBe(true);
    expect(AmcEntitlementEngine.isPartCovered(rules, "BATTERY")).toBe(false); // Excluded
  });

  it("should execute strategy transitions correctly using AMC Provider", async () => {
    const provider = new AmcProvider();
    const strategy = new AMCWorkflowStrategy(provider);
    strategyRegistry.registerStrategy(strategy);
    
    const resolvedStrategy = strategyRegistry.getStrategy("AMC");
    expect(resolvedStrategy).toBeDefined();

    const mockCase: BusinessCase = {
      business_case_id: "BC-1",
      workflow_type: "AMC",
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

    const initResult = await resolvedStrategy!.onInitialize(context, mockCase);
    expect(initResult.success).toBe(true);
    expect(mockCase.references).toBeDefined();

    const transitionResult = await resolvedStrategy!.onBeforeTransition(context, mockCase, {
      current_state: "DRAFT",
      target_state: "ACTIVE",
      payload: {
        contract_number: "AMC-TEST"
      }
    });

    expect(transitionResult.success).toBe(true);
    expect(mockCase.references?.length).toBe(1);
    expect(mockCase.references![0].entity_type).toBe("AMC_EXTERNAL_REF");
  });
});
