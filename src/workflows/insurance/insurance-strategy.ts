import { BaseWorkflowStrategy, EvidenceRecordPayload, ApprovalDecisionPayload, okResult, failResult } from "../base-workflow-strategy";
import { BusinessContext, BusinessCase, ExecutionResult } from "../../core";
import { TransitionCommand } from "../../core/workflow-state-machine";
import { ExternalProgramProvider } from "../common/provider-interface";
import { InsurancePolicy } from "./policy-models";
import { FleetContract } from "./fleet-contract-models";

export class InsuranceWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider<InsurancePolicy>) {
    super();
  }

  getWorkflowType(): string {
    return "INSURANCE";
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
      const payload: InsurancePolicy = command.payload;
      if (!payload) {
        return failResult("Missing Insurance payload", context);
      }
      
      const submitRes = await this.provider.submit(payload);
      if (submitRes.success && submitRes.data) {
        businessCase.references.push({
          entity_type: "INSURANCE_REF",
          entity_id: submitRes.data.reference,
          relationship: "tracked_policy"
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

export class FleetContractWorkflowStrategy extends BaseWorkflowStrategy {
  constructor(private provider: ExternalProgramProvider<FleetContract>) {
    super();
  }

  getWorkflowType(): string {
    return "FLEET_CONTRACT";
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
      const payload: FleetContract = command.payload;
      if (!payload) {
        return failResult("Missing Fleet Contract payload", context);
      }
      
      const submitRes = await this.provider.submit(payload);
      if (submitRes.success && submitRes.data) {
        businessCase.references.push({
          entity_type: "FLEET_CONTRACT_REF",
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
