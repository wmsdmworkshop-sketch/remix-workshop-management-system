import { describe, it, expect, beforeEach } from "vitest";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { InsuranceProgramProfile, FleetContractProgramProfile } from "../workflows/insurance/profiles";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { InsuranceWorkflowStrategy, FleetContractWorkflowStrategy } from "../workflows/insurance/insurance-strategy";
import { InsuranceProvider, FleetContractProvider } from "../workflows/insurance/insurance-provider";
import { InsuranceCoverageValidationEngine } from "../workflows/insurance/coverage-validation-engine";
import { InsuranceClaimEngine } from "../workflows/insurance/claim-engine";
import { InsuranceSettlementEngine } from "../workflows/insurance/settlement-engine";
import { InsuranceRenewalEngine } from "../workflows/insurance/renewal-engine";
import { InsurancePremiumEngine } from "../workflows/insurance/premium-engine";
import { FleetContractEngine } from "../workflows/insurance/fleet-contract-engine";
import { FleetPricingEngine } from "../workflows/insurance/fleet-pricing-engine";
import { FleetEligibilityEngine } from "../workflows/insurance/fleet-eligibility-engine";
import { BusinessCase, BusinessContext } from "../core";
import { InsurancePolicy } from "../workflows/insurance/policy-models";
import { FleetContract } from "../workflows/insurance/fleet-contract-models";
import { InsuranceClaim } from "../workflows/insurance/claim-models";
import { CoverageStatus, InsuranceClaimStatus, FleetEligibilityStatus } from "../workflows/insurance/constants";

describe("Insurance & Fleet Contract Workflow Integration & Engines", () => {
  let programRegistry: ProgramRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    programRegistry = new ProgramRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should successfully register Insurance & Fleet in the Program Registry", () => {
    programRegistry.register(InsuranceProgramProfile);
    programRegistry.register(FleetContractProgramProfile);
    
    const resolvedIns = programRegistry.resolve("INSURANCE", "1.0.0");
    expect(resolvedIns).toBeDefined();
    expect(resolvedIns.capabilities.supports_financial).toBe(true);
    
    const resolvedFleet = programRegistry.resolve("FLEET_CONTRACT", "1.0.0");
    expect(resolvedFleet).toBeDefined();
    expect(resolvedFleet.capabilities.supports_financial).toBe(true);
  });

  it("should calculate premiums correctly", () => {
    const premium = InsurancePremiumEngine.calculateNewPremium(10000, true, false, false);
    // Base = 2.5%, Comprehensive = 1.2x = 3%
    expect(premium.base_premium).toBe(300);
    expect(premium.net_premium).toBe(300);
    
    const renewalPremium = InsurancePremiumEngine.calculateRenewalPremium(300, 10);
    expect(renewalPremium.no_claim_bonus_amount).toBe(30);
    expect(renewalPremium.net_premium).toBe(270);
  });

  it("should evaluate coverage correctly", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const policy = { 
      policy_type: "COMPREHENSIVE",
      expiry_date: futureDate.toISOString() 
    } as InsurancePolicy;
    
    expect(InsuranceCoverageValidationEngine.validate(policy, "ACCIDENT")).toBe(CoverageStatus.PARTIALLY_COVERED); // due to 5% deductible in matrix
    
    const thirdPartyPolicy = { 
      policy_type: "THIRD_PARTY",
      expiry_date: futureDate.toISOString() 
    } as InsurancePolicy;
    
    expect(InsuranceCoverageValidationEngine.validate(thirdPartyPolicy, "ACCIDENT")).toBe(CoverageStatus.NOT_COVERED);
    
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    policy.expiry_date = pastDate.toISOString();
    expect(InsuranceCoverageValidationEngine.validate(policy, "ACCIDENT")).toBe(CoverageStatus.EXPIRED);
  });

  it("should validate claims correctly", () => {
    const claim = { total_claim_amount: 300 } as InsuranceClaim;
    expect(InsuranceClaimEngine.validate(claim, "ACCIDENT")).toBe(InsuranceClaimStatus.APPROVED); // Auto approve < 500
    
    const largeClaim = { total_claim_amount: 1000 } as InsuranceClaim;
    expect(InsuranceClaimEngine.validate(largeClaim, "ACCIDENT")).toBe(InsuranceClaimStatus.VALIDATED); // Requires manual
  });

  it("should calculate settlement correctly", () => {
    const coverage = { customer_liability: 20 } as any;
    const settlement = InsuranceSettlementEngine.calculateSettlement(1000, coverage);
    
    expect(settlement.total_repair_cost).toBe(1000);
    expect(settlement.customer_contribution).toBe(200);
    expect(settlement.insurer_settlement).toBe(800);
    expect(settlement.tax_amount).toBe(100);
  });

  it("should process renewals correctly", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const policy = { 
      policy_number: "POL-1",
      premium_amount: 300,
      expiry_date: futureDate.toISOString() 
    } as InsurancePolicy;
    
    const renewal = InsuranceRenewalEngine.evaluateRenewal(policy, 0); // 0 previous claims
    
    expect(renewal.status).toBe("PENDING");
    expect(renewal.no_claim_bonus_percent).toBe(10);
    expect(renewal.renewal_premium).toBe(270);
  });

  it("should process fleet contract lifecycle", () => {
    let contract = { status: "DRAFT" } as FleetContract;
    contract = FleetContractEngine.activate(contract);
    expect(contract.status).toBe("ACTIVE");
    contract = FleetContractEngine.suspend(contract);
    expect(contract.status).toBe("SUSPENDED");
  });

  it("should evaluate fleet pricing logic", () => {
    const smallFleet = FleetPricingEngine.calculatePricingModel("C1", 20);
    expect(smallFleet.parts_discount).toBe(5);
    expect(smallFleet.labour_rate_discount).toBe(5);
    
    const largeFleet = FleetPricingEngine.calculatePricingModel("C2", 150);
    expect(largeFleet.parts_discount).toBe(15);
  });

  it("should evaluate fleet eligibility correctly", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const contract = { 
      status: "ACTIVE",
      expiry_date: futureDate.toISOString(),
      vehicle_list: ["VIN1", "VIN2"],
      km_limits: 100000
    } as FleetContract;
    
    expect(FleetEligibilityEngine.evaluate(contract, "VIN1", 50000)).toBe(FleetEligibilityStatus.ELIGIBLE);
    expect(FleetEligibilityEngine.evaluate(contract, "VIN3", 50000)).toBe(FleetEligibilityStatus.MANUAL_REVIEW);
    expect(FleetEligibilityEngine.evaluate(contract, "VIN2", 120000)).toBe(FleetEligibilityStatus.EXCEEDED_LIMITS);
    
    contract.status = "SUSPENDED";
    expect(FleetEligibilityEngine.evaluate(contract, "VIN1", 50000)).toBe(FleetEligibilityStatus.SUSPENDED);
  });

  it("should execute Insurance strategy transitions correctly using Provider", async () => {
    const provider = new InsuranceProvider();
    const strategy = new InsuranceWorkflowStrategy(provider);
    strategyRegistry.registerStrategy(strategy);
    
    const resolvedStrategy = strategyRegistry.getStrategy("INSURANCE");
    expect(resolvedStrategy).toBeDefined();

    const mockCase: BusinessCase = {
      business_case_id: "BC-1",
      workflow_type: "INSURANCE",
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
    
    const policy = { policy_number: "POL-1" } as InsurancePolicy;
    
    const transitionResult = await resolvedStrategy!.onBeforeTransition(context, mockCase, {
      current_state: "DRAFT",
      target_state: "ACTIVE",
      payload: policy
    });

    expect(transitionResult.success).toBe(true);
    expect(mockCase.references?.length).toBe(1);
    expect(mockCase.references![0].entity_type).toBe("INSURANCE_REF");
  });
});
