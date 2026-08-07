import { PolicyEngine, PolicyEvaluationRequest, PolicyEvaluationResult } from "./policy-engine";
import { globalEventBus } from "./event-bus";
import { makeSystemContext } from "./business-context";

export interface CreateJobCardContext {
  job_type: string;
  vehicle_model: string;
  vin: string;
  vehicle_age_months: number;
  vehicle_mileage_km: number;
}

export interface AddPartContext {
  job_id: number;
  job_type: string;
  vin: string;
  part_no: string;
  quantity: number;
  unit_price: number;
}

export interface TransitionContext {
  job_id: number;
  current_status: string;
  target_status: string;
  total_claim_value?: number;
}

export interface WorkflowSplitResult {
  customer_percentage: number;
  oem_percentage: number;
  internal_percentage: number;
}

/**
 * The Strategy Interface that all specialized workflows must implement.
 */
export interface IWorkflowStrategy {
  /** 
   * Validates if a job card can be created under this workflow type.
   * Typically evaluates VIN applicability and Age/Mileage constraints.
   */
  validateCreation(context: CreateJobCardContext, policyEngine: PolicyEngine): Promise<void>;

  /**
   * Validates if a part can be added, and determines the financial split.
   */
  validateAndSplitPart(context: AddPartContext, policyEngine: PolicyEngine): Promise<WorkflowSplitResult>;

  /**
   * Determines if a status transition is allowed, enforcing approval hierarchies if necessary.
   */
  validateTransition(context: TransitionContext, policyEngine: PolicyEngine): Promise<void>;
}

/**
 * Base Retail Strategy.
 * Customer pays 100%. No strict OEM policy evaluation required.
 */
export class RetailStrategy implements IWorkflowStrategy {
  async validateCreation(context: CreateJobCardContext, policyEngine: PolicyEngine): Promise<void> {
    // Retail has no age/mileage or policy applicability limits.
    return;
  }

  async validateAndSplitPart(context: AddPartContext, policyEngine: PolicyEngine): Promise<WorkflowSplitResult> {
    // 100% Customer Paid
    return {
      customer_percentage: 100,
      oem_percentage: 0,
      internal_percentage: 0
    };
  }

  async validateTransition(context: TransitionContext, policyEngine: PolicyEngine): Promise<void> {
    // Retail transitions freely without checking Policy Approval Matrices.
    return;
  }
}

export class WorkflowPolicyError extends Error {
  constructor(public result: PolicyEvaluationResult) {
    super(result.reason);
    this.name = "WorkflowPolicyError";
  }
}

/**
 * Factory to return the correct strategy based on job type.
 */
export class WorkflowFactory {
  static getStrategy(jobType: string): IWorkflowStrategy {
    switch (jobType.toLowerCase()) {
      case 'retail':
        return new RetailStrategy();
      case 'warranty': 
        return new WarrantyStrategy();
      // Future Phases will add:
      // case 'amc': return new AMCStrategy();
      // ...
      default:
        // Default to Retail if unspecified, though strict validation should enforce known types.
        return new RetailStrategy();
    }
  }
}

/**
 * Warranty Strategy.
 * Strictly relies on OEM Policy Engine for eligibility.
 * Rejects operations not covered. 100% OEM Liability on success.
 */
export class WarrantyStrategy implements IWorkflowStrategy {
  async validateCreation(context: CreateJobCardContext, policyEngine: PolicyEngine): Promise<void> {
    const request: PolicyEvaluationRequest = {
      policy_type: "Warranty",
      vehicle_model: context.vehicle_model,
      vin: context.vin,
      vehicle_age_months: context.vehicle_age_months,
      vehicle_mileage_km: context.vehicle_mileage_km
    };

    const evaluation = await policyEngine.evaluate(request);

    if (evaluation.decision === "Policy Not Found" || evaluation.decision === "Rejected") {
      await globalEventBus.publish(
        "WarrantyRejected",
        { evaluation },
        makeSystemContext(`WARRANTY-EVAL-${Date.now()}`)
      );
      throw new WorkflowPolicyError(evaluation);
    }
    
    // Generate event
    await globalEventBus.publish(
      "WarrantyEvaluated",
      { evaluation },
      makeSystemContext(`WARRANTY-EVAL-${Date.now()}`)
    );
  }

  async validateAndSplitPart(context: AddPartContext, policyEngine: PolicyEngine): Promise<WorkflowSplitResult> {
    const request: PolicyEvaluationRequest = {
      job_id: context.job_id,
      policy_type: "Warranty",
      vehicle_model: "Unknown", // Would ideally be passed in context
      vin: context.vin,
      vehicle_age_months: 0, // Ignored for parts check usually, but should be passed ideally
      vehicle_mileage_km: 0,
      causal_part_no: context.part_no,
      claim_value: context.unit_price * context.quantity
    };

    const evaluation = await policyEngine.evaluate(request);

    if (evaluation.decision === "Policy Not Found" || evaluation.decision === "Rejected") {
      throw new WorkflowPolicyError(evaluation);
    }

    // 100% OEM Paid for Warranty
    return {
      customer_percentage: 0,
      oem_percentage: 100,
      internal_percentage: 0
    };
  }

  async validateTransition(context: TransitionContext, policyEngine: PolicyEngine): Promise<void> {
    const validTransitions: Record<string, string[]> = {
      "Draft": ["Policy Evaluation"],
      "Policy Evaluation": ["Eligible", "Rejected"],
      "Eligible": ["Requires Approval", "Approved"],
      "Requires Approval": ["Approved", "Rejected"],
      "Approved": ["Parts Reserved"],
      "Parts Reserved": ["Work In Progress"],
      "Work In Progress": ["QC Completed"],
      "QC Completed": ["Ready for Claim"],
      "Ready for Claim": ["Claim Submitted"],
      "Claim Submitted": ["Claim Accepted", "Claim Rejected"],
      "Claim Accepted": ["Settlement Received"],
      "Claim Rejected": ["Closed"],
      "Settlement Received": ["Closed"]
    };

    const allowedNext = validTransitions[context.current_status];
    if (!allowedNext || !allowedNext.includes(context.target_status)) {
      throw new Error(`Invalid state transition from ${context.current_status} to ${context.target_status}`);
    }

    if (context.target_status === "Policy Evaluation" && context.total_claim_value) {
      const request: PolicyEvaluationRequest = {
        job_id: context.job_id,
        policy_type: "Warranty",
        vehicle_model: "Unknown",
        vin: "Unknown",
        vehicle_age_months: 0,
        vehicle_mileage_km: 0,
        claim_value: context.total_claim_value
      };
      const evaluation = await policyEngine.evaluate(request);

      if (evaluation.decision === "Requires Approval") {
        await globalEventBus.publish(
          "WarrantyApprovalRequested",
          { evaluation },
          makeSystemContext(`WARRANTY-APPROVAL-${context.job_id}`)
        );
        throw new WorkflowPolicyError(evaluation);
      } else if (evaluation.decision === "Approved") {
        await globalEventBus.publish(
          "WarrantyApproved",
          { evaluation },
          makeSystemContext(`WARRANTY-APPROVAL-${context.job_id}`)
        );
      }
    }

    // Publish strict domain events based on target status
    const sysCxt = makeSystemContext(`WARRANTY-TRANS-${context.job_id}`);
    if (context.target_status === "Claim Submitted") {
      await globalEventBus.publish("WarrantyClaimSubmitted", { context }, sysCxt);
    } else if (context.target_status === "Claim Accepted") {
      await globalEventBus.publish("WarrantyClaimAccepted", { context }, sysCxt);
    } else if (context.target_status === "Claim Rejected") {
      await globalEventBus.publish("WarrantyClaimRejected", { context }, sysCxt);
    } else if (context.target_status === "Closed") {
      await globalEventBus.publish("WarrantyClosed", { context }, sysCxt);
    }
  }
}
