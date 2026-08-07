import { BaseWorkflowStrategy, EvidenceRecordPayload, ApprovalDecisionPayload, okResult, failResult } from "../base-workflow-strategy";
import { BusinessContext, BusinessCase, ExecutionResult } from "../../core";
import { TransitionCommand } from "../../core/workflow-state-machine";
import { ExternalProgramProvider } from "../common/provider-interface";
import { GoodwillRequest } from "./goodwill-models";
import { GoodwillEligibilityEngine } from "./eligibility-engine";
import { GoodwillEligibilityStatus } from "./constants";

export class GoodwillWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider<GoodwillRequest>) {
    super();
  }

  getWorkflowType(): string {
    return "Goodwill";
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
    if (command.target_state === "PENDING_APPROVAL") {
      const request: GoodwillRequest = command.payload;
      if (!request) {
        return failResult("Missing Goodwill request payload", context);
      }
      
      const eligibility = GoodwillEligibilityEngine.evaluateEligibility(request, {}, {});
      if (eligibility === GoodwillEligibilityStatus.REJECTED) {
        return failResult("Goodwill request rejected by Eligibility Engine.", context);
      }

      const submitRes = await this.provider.submit(request);
      if (submitRes.success && submitRes.data) {
        businessCase.references.push({
          entity_type: "GOODWILL_OEM_REF",
          entity_id: submitRes.data.reference,
          relationship: "tracked_request"
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
