import { BaseWorkflowStrategy, EvidenceRecordPayload, ApprovalDecisionPayload, okResult, failResult } from "../base-workflow-strategy";
import { BusinessContext, BusinessCase, ExecutionResult } from "../../core";
import { TransitionCommand } from "../../core/workflow-state-machine";
import { ExternalProgramProvider } from "../common/provider-interface";
import { FsbCampaign } from "./campaign-models";
import { FsbCampaignEngine } from "./campaign-engine";
import { FsbCampaignStatus } from "./constants";

export class FsbWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider<FsbCampaign>) {
    super();
  }

  getWorkflowType(): string {
    return "FSB_CAMPAIGN";
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
      const payload: FsbCampaign = command.payload;
      if (!payload) {
        return failResult("Missing FSB payload", context);
      }
      
      const submitRes = await this.provider.submit(payload);
      if (submitRes.success && submitRes.data) {
        businessCase.references.push({
          entity_type: "FSB_OEM_REF",
          entity_id: submitRes.data.reference,
          relationship: "tracked_campaign"
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
