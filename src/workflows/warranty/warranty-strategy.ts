import { BaseWorkflowStrategy, EvidenceRecordPayload, ApprovalDecisionPayload, okResult, failResult } from "../base-workflow-strategy";
import { BusinessContext, BusinessCase, ExecutionResult } from "../../core";
import { TransitionCommand } from "../../core/workflow-state-machine";
import { ExternalProgramProvider } from "../common/provider-interface";
import { ClaimStatus } from "./config/constants";

export class WarrantyWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider) {
    super();
  }

  getWorkflowType(): string {
    return "Warranty";
  }

  async onInitialize(context: BusinessContext, businessCase: BusinessCase): Promise<ExecutionResult<void>> {
    // Inject Warranty-specific structure into the generic business case
    // In a real app, this would initialize the WarrantyCase domain model in the database
    if (!businessCase.references) {
      businessCase.references = [];
    }
    return okResult(context);
  }

  async onBeforeTransition(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    command: TransitionCommand
  ): Promise<ExecutionResult<void>> {
    if (command.target_state === ClaimStatus.SUBMITTED) {
      // Simulate mapping generic payload to WarrantyClaimHeader
      const claimHeader = command.payload || {
        claim_number: businessCase.business_case_id,
        claim_type: "STANDARD",
        warranty_type: "STANDARD",
        vehicle_vin: "UNKNOWN",
        odometer: 0,
        engine_hours: 0,
        repair_date: new Date().toISOString()
      };
      
      const submitResult = await this.provider.submit(claimHeader);
      if (!submitResult.success) {
        return failResult("OEM Submission failed: " + submitResult.error, context);
      }
      
      // Store OEM reference for later use
      if (!businessCase.references) {
        businessCase.references = [];
      }
      businessCase.references.push({
        entity_type: "OEM_CLAIM",
        entity_id: submitResult.data!.reference,
        relationship: "submitted_claim"
      });
    }

    return okResult(context);
  }

  async onAfterTransition(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    transitionResult: { from: string; to: string }
  ): Promise<ExecutionResult<void>> {
    // The Kernel already dispatches generic "BUSINESS_CASE_TRANSITIONED" events.
    return okResult(context);
  }

  async onEvidenceUploaded(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    evidence: EvidenceRecordPayload
  ): Promise<ExecutionResult<void>> {
    // If the case is already submitted, auto-forward new evidence to OEM
    if (businessCase.status === ClaimStatus.CLARIFICATION_REQUESTED || businessCase.status === "OEM Review") {
      const oemRef = businessCase.references.find(r => r.entity_type === "OEM_CLAIM");
      if (oemRef) {
        // The MockWarrantyProvider still implements uploadEvidence
        await (this.provider as any).uploadEvidence(oemRef.entity_id, evidence.evidence_id, evidence.metadata?.url || "N/A");
      }
    }
    return okResult(context);
  }

  async onApprovalGranted(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    approval: ApprovalDecisionPayload
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  async onClose(context: BusinessContext, businessCase: BusinessCase): Promise<ExecutionResult<void>> {
    // E.g., final settlement tally
    return okResult(context);
  }
}
