import { BaseWorkflowStrategy, EvidenceRecordPayload, ApprovalDecisionPayload, okResult, failResult } from "../base-workflow-strategy";
import { BusinessContext, BusinessCase, ExecutionResult } from "../../core";
import { TransitionCommand } from "../../core/workflow-state-machine";
import { ExternalProgramProvider } from "../common/provider-interface";
import { AmcEntitlementEngine } from "./entitlement-engine";
import { AmcContract } from "./contract-models";

export class AMCWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider<AmcContract>) {
    super();
  }

  getWorkflowType(): string {
    return "AMC";
  }

  async onInitialize(context: BusinessContext, businessCase: BusinessCase): Promise<ExecutionResult<void>> {
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
    if (command.target_state === "ACTIVE") {
      const contract: AmcContract = command.payload;
      if (!contract) {
        return failResult("Missing contract payload for AMC activation", context);
      }
      
      const validation = await this.provider.validate(contract);
      if (!validation.success) {
        return failResult("Provider validation failed: " + validation.error, context);
      }

      // External Tracking
      const submitRes = await this.provider.submit(contract);
      if (submitRes.success && submitRes.data) {
        businessCase.references.push({
          entity_type: "AMC_EXTERNAL_REF",
          entity_id: submitRes.data.reference,
          relationship: "tracked_contract"
        });
      }
    }
    
    return okResult(context);
  }

  async onAfterTransition(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    transitionResult: { from: string; to: string }
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  async onEvidenceUploaded(
    context: BusinessContext, 
    businessCase: BusinessCase, 
    evidence: EvidenceRecordPayload
  ): Promise<ExecutionResult<void>> {
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
    return okResult(context);
  }
}
