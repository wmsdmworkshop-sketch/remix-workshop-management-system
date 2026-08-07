import { PolicyEngine, PolicyRepository, PolicyEvaluationResult } from "../core/policy-engine";
import { WarrantyStrategy, WorkflowFactory, WorkflowPolicyError } from "../core/workflow-strategies";

// Mock Repository
class MockPolicyRepository extends PolicyRepository {
  async getActivePolicies(policyType: string) {
    if (policyType === "Warranty") {
      return [{
        policy_id: "POL-1",
        policy_type: "Warranty",
        circular_ref_no: "WARR-2026-014",
        version: "1.0"
      }] as any;
    }
    return [];
  }

  async getApplicabilityRules(policyId: string) {
    return [{
      rule_id: "RULE-1",
      policy_id: "POL-1",
      max_age_months: 36,
      max_mileage_km: 100000
    }] as any;
  }

  async getPartsRules(policyId: string) {
    return [{
      rule_id: "PRULE-1",
      policy_id: "POL-1",
      causal_part_prefix: "WARR-"
    }] as any;
  }

  async getApprovalMatrix(policyId: string) {
    return [{
      matrix_id: "MAT-1",
      policy_id: "POL-1",
      claim_value_threshold: 15000,
      required_role: "Regional Service Manager"
    }] as any;
  }

  async logAudit(logData: any) {
    // Mock audit log
  }
}

async function runTests() {
  console.log("Running Warranty Strategy Tests...");
  const engine = new PolicyEngine(new MockPolicyRepository());
  const strategy = new WarrantyStrategy();

  // Test 1: Factory returns correct strategy
  const instance = WorkflowFactory.getStrategy("warranty");
  if (!(instance instanceof WarrantyStrategy)) throw new Error("Factory failed");
  console.log("✓ Factory returns WarrantyStrategy");

  // Test 2: Approved Creation
  try {
    await strategy.validateCreation({
      job_type: "warranty",
      vehicle_model: "Nexon",
      vin: "TATA123",
      vehicle_age_months: 24, // under 36
      vehicle_mileage_km: 50000
    }, engine);
    console.log("✓ Approved Creation successful");
  } catch (e: any) {
    console.error("Failed Approved Creation", e);
  }

  // Test 3: Rejected Creation (Age exceeds)
  try {
    await strategy.validateCreation({
      job_type: "warranty",
      vehicle_model: "Nexon",
      vin: "TATA123",
      vehicle_age_months: 38, // exceeds 36
      vehicle_mileage_km: 50000
    }, engine);
    throw new Error("Should have rejected");
  } catch (e: any) {
    if (e instanceof WorkflowPolicyError && e.result.decision === "Rejected") {
      console.log("✓ Rejected Creation (Age exceeds) successful");
    } else {
      console.error("Failed Rejected Creation", e);
    }
  }

  // Test 4: Requires Approval Transition
  try {
    await strategy.validateTransition({
      job_id: 1,
      current_status: "QC",
      target_status: "BILLING",
      total_claim_value: 20000 // exceeds 15000
    }, engine);
    throw new Error("Should have required approval");
  } catch (e: any) {
    if (e instanceof WorkflowPolicyError && e.result.decision === "Requires Approval") {
      console.log("✓ Requires Approval Transition successful");
    } else {
      console.error("Failed Requires Approval Transition", e);
    }
  }
}

runTests().catch(console.error);
