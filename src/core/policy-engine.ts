import { db } from "../db/index";
import { eq, and, lte, gte } from "drizzle-orm";
import { 
  policyMaster, 
  policyApplicability, 
  policyLabourRules, 
  policyPartsRules, 
  policyApprovalMatrix,
  policyAuditLogs
} from "../db/schema";
import { randomUUID } from "crypto";

export interface PolicyEvaluationRequest {
  job_id?: number;
  policy_type: string;
  vehicle_model: string;
  vin: string;
  vehicle_age_months: number;
  vehicle_mileage_km: number;
  causal_part_no?: string;
  srt_code?: string;
  claim_value?: number;
}

export interface PolicyEvaluationResult {
  workflow_type: string;
  decision: "Approved" | "Rejected" | "Requires Approval" | "Policy Not Found";
  reason: string;
  policy_id?: string;
  policy_version?: string;
  circular_reference?: string;
  evaluation_criteria?: string;
  approval_required: boolean;
  approval_role?: string;
  audit_id?: string;
  evaluated_at?: Date;
}

export class PolicyRepository {
  async getActivePolicies(policyType: string) {
    const policies = await db.select()
      .from(policyMaster)
      .where(
        and(
          eq(policyMaster.policy_type, policyType),
          eq(policyMaster.is_active, true)
        )
      );
    return policies;
  }

  async getApplicabilityRules(policyId: string) {
    return await db.select().from(policyApplicability).where(eq(policyApplicability.policy_id, policyId));
  }

  async getPartsRules(policyId: string) {
    return await db.select().from(policyPartsRules).where(eq(policyPartsRules.policy_id, policyId));
  }

  async getLabourRules(policyId: string) {
    return await db.select().from(policyLabourRules).where(eq(policyLabourRules.policy_id, policyId));
  }

  async getApprovalMatrix(policyId: string) {
    return await db.select().from(policyApprovalMatrix).where(eq(policyApprovalMatrix.policy_id, policyId));
  }

  async logAudit(logData: any) {
    await db.insert(policyAuditLogs).values({
      audit_id: `AUD-${Date.now()}-${randomUUID().slice(0, 8)}`,
      ...logData
    });
  }
}

export class PolicyEngine {
  constructor(private readonly repository: PolicyRepository) {}

  public async evaluate(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    try {
      const activePolicies = await this.repository.getActivePolicies(request.policy_type);
      
      if (activePolicies.length === 0) {
        const result: PolicyEvaluationResult = {
          workflow_type: request.policy_type,
          decision: "Policy Not Found",
          reason: `No active policy found for type: ${request.policy_type}`,
          evaluation_criteria: "No Policy",
          approval_required: false
        };
        await this.logEvaluation(request, result);
        return result;
      }

      // We'll evaluate against the most recently effective policy (for simplicity, take the first matching)
      // In a robust engine, you'd sort by effective_start_date DESC
      let matchedPolicy = null;
      let matchedApplicability = null;

      for (const policy of activePolicies) {
        const rules = await this.repository.getApplicabilityRules(policy.policy_id);
        
        // Find matching vehicle rule
        const applicableRule = rules.find(r => {
          const modelMatch = !r.vehicle_model || r.vehicle_model === request.vehicle_model;
          // Simple VIN range logic (lexicographical comparison)
          const vinStartMatch = !r.vin_start_range || request.vin >= r.vin_start_range;
          const vinEndMatch = !r.vin_end_range || request.vin <= r.vin_end_range;
          return modelMatch && vinStartMatch && vinEndMatch;
        });

        if (applicableRule) {
          matchedPolicy = policy;
          matchedApplicability = applicableRule;
          break;
        }
      }

      if (!matchedPolicy || !matchedApplicability) {
        const result: PolicyEvaluationResult = {
          workflow_type: request.policy_type,
          decision: "Policy Not Found",
          reason: "Vehicle does not fall into any active policy applicability range.",
          evaluation_criteria: "Applicability Rules",
          approval_required: false
        };
        await this.logEvaluation(request, result);
        return result;
      }

      // Check Age & Mileage limits
      if (matchedApplicability.max_age_months !== null && request.vehicle_age_months > matchedApplicability.max_age_months) {
        const result: PolicyEvaluationResult = {
          workflow_type: request.policy_type,
          decision: "Rejected",
          reason: `Vehicle age (${request.vehicle_age_months} months) exceeds policy limit of ${matchedApplicability.max_age_months} months.`,
          policy_id: matchedPolicy.policy_id,
          policy_version: matchedPolicy.version || undefined,
          circular_reference: matchedPolicy.circular_ref_no || undefined,
          evaluation_criteria: "Age/Mileage Rules",
          approval_required: false
        };
        await this.logEvaluation(request, result);
        return result;
      }

      if (matchedApplicability.max_mileage_km !== null && request.vehicle_mileage_km > matchedApplicability.max_mileage_km) {
        const result: PolicyEvaluationResult = {
          workflow_type: request.policy_type,
          decision: "Rejected",
          reason: `Vehicle mileage (${request.vehicle_mileage_km} km) exceeds policy limit of ${matchedApplicability.max_mileage_km} km.`,
          policy_id: matchedPolicy.policy_id,
          policy_version: matchedPolicy.version || undefined,
          circular_reference: matchedPolicy.circular_ref_no || undefined,
          evaluation_criteria: "Age/Mileage Rules",
          approval_required: false
        };
        await this.logEvaluation(request, result);
        return result;
      }

      // Check Parts Rules if causal part is provided
      if (request.causal_part_no) {
        const partRules = await this.repository.getPartsRules(matchedPolicy.policy_id);
        const partMatch = partRules.find(r => request.causal_part_no?.startsWith(r.causal_part_prefix || ""));
        if (partRules.length > 0 && !partMatch) {
          const result: PolicyEvaluationResult = {
            workflow_type: request.policy_type,
            decision: "Rejected",
            reason: `Causal part ${request.causal_part_no} is not covered under this policy.`,
            policy_id: matchedPolicy.policy_id,
            policy_version: matchedPolicy.version || undefined,
            circular_reference: matchedPolicy.circular_ref_no || undefined,
            evaluation_criteria: "Parts Rules",
            approval_required: false
          };
          await this.logEvaluation(request, result);
          return result;
        }
      }

      // Check Approval Matrix if claim value exists
      if (request.claim_value) {
        const matrices = await this.repository.getApprovalMatrix(matchedPolicy.policy_id);
        // Find highest threshold exceeded
        const exceededMatrix = matrices
          .filter(m => request.claim_value! > Number(m.claim_value_threshold))
          .sort((a, b) => Number(b.claim_value_threshold) - Number(a.claim_value_threshold))[0];

        if (exceededMatrix) {
          const result: PolicyEvaluationResult = {
            workflow_type: request.policy_type,
            decision: "Requires Approval",
            reason: `Claim amount (₹${request.claim_value}) exceeds threshold of ₹${exceededMatrix.claim_value_threshold}.`,
            policy_id: matchedPolicy.policy_id,
            policy_version: matchedPolicy.version || undefined,
            circular_reference: matchedPolicy.circular_ref_no || undefined,
            approval_required: true,
            approval_role: exceededMatrix.required_role || "Admin",
            evaluation_criteria: "Approval Matrix"
          };
          await this.logEvaluation(request, result);
          return result;
        }
      }

      // If all checks pass
      const result: PolicyEvaluationResult = {
        workflow_type: request.policy_type,
        decision: "Approved",
        reason: "All policy criteria met.",
        policy_id: matchedPolicy.policy_id,
        policy_version: matchedPolicy.version || undefined,
        circular_reference: matchedPolicy.circular_ref_no || undefined,
        evaluation_criteria: "Final Approval",
        approval_required: false
      };
      await this.logEvaluation(request, result);
      return result;

    } catch (error: any) {
      console.error("Policy evaluation error:", error);
      const result: PolicyEvaluationResult = {
        workflow_type: request.policy_type,
        decision: "Rejected",
        reason: `Evaluation failed due to system error: ${error.message}`,
        approval_required: false,
        evaluation_criteria: "System Error"
      };
      await this.logEvaluation(request, result);
      return result;
    }
  }

  private async logEvaluation(request: PolicyEvaluationRequest, result: PolicyEvaluationResult) {
    try {
      const auditId = `AUD-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const evaluatedAt = new Date();
      
      result.audit_id = auditId;
      result.evaluated_at = evaluatedAt;

      await this.repository.logAudit({
        audit_id: auditId,
        job_id: request.job_id || null,
        policy_type: result.workflow_type,
        evaluation_result: result.decision,
        reason: result.reason,
        source_policy: result.policy_id || null,
        evaluated_criteria: result.evaluation_criteria || null,
        required_approval_role: result.approval_role || null
      });
    } catch (e) {
      console.error("Failed to log policy audit:", e);
    }
  }
}
