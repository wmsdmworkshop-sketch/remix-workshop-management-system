import { randomUUID } from "crypto";
import { 
  BusinessContext, 
  ExecutionResult, 
  EngineMetadata, 
  KernelErrorCode 
} from "./kernel-contracts";
import { BusinessContextFactory } from "./business-context";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowStateMachine } from "./workflow-state-machine";
import { EvidenceManagementEngine, UploadEvidenceCommand } from "./evidence-engine";
import { ApprovalEngine, RequestApprovalCommand, SubmitApprovalDecisionCommand } from "./approval-engine";
import { EventBus } from "./event-bus";
import { TransactionManager } from "./transaction-manager";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";

export interface BusinessCaseReference {
  entity_type: string;
  entity_id: string;
  relationship: string; // e.g., "primary_source", "supporting_document", "parent_case"
}

export interface BusinessCase {
  business_case_id: string;
  workflow_type: string;
  status: string;
  references: BusinessCaseReference[];
  created_at: string;
  updated_at: string;
}

export interface IBusinessCaseRepository {
  findById(id: string, tx?: any): Promise<BusinessCase | null>;
  save(businessCase: BusinessCase, tx?: any): Promise<void>;
}

/**
 * Orchestrates the full lifecycle of a Business Case independent of specific workflows.
 * Pipeline: Registry -> Policy -> Evidence -> Approval -> State Machine -> Persistence -> Audit -> Event Bus
 */
export class BusinessCaseEngine {
  public metadata: EngineMetadata = {
    engine_name: "BusinessCaseEngine",
    engine_version: "1.0.0",
    capabilities: ["WorkflowOrchestration", "LifecycleManagement"]
  };

  constructor(
    private registry: WorkflowRegistry,
    private evidenceEngine: EvidenceManagementEngine,
    private approvalEngine: ApprovalEngine,
    private eventBus: EventBus,
    private txManager: any, // Use any to allow ITransactionManager / TransactionManager interchangeably without type errors
    private repository: IBusinessCaseRepository,
    private strategyRegistry: WorkflowStrategyRegistry
  ) {}

  /**
   * Initializes a new Business Case.
   */
  public async initializeCase(
    context: BusinessContext,
    workflow_type: string,
    references: BusinessCaseReference[] = []
  ): Promise<ExecutionResult<BusinessCase>> {
    // 1. Workflow Registry: Validate workflow exists and get initial state
    const workflowDef = this.registry.getWorkflow(workflow_type);
    if (!workflowDef) {
      return BusinessContextFactory.failure(context, `Workflow ${workflow_type} not found`, KernelErrorCode.NOT_FOUND);
    }
    const initialState = workflowDef.state_machine.initial_state;

    const businessCase: BusinessCase = {
      business_case_id: `BC-${randomUUID().substring(0,8).toUpperCase()}`,
      workflow_type,
      status: initialState,
      references,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update Context identity for the new Business Case
    const caseContext = BusinessContextFactory.create(
      { entity_type: "BusinessCase", entity_id: businessCase.business_case_id },
      context.actor,
      {
        correlation_id: context.traceability.correlation_id,
        source_system: context.traceability.source_system
      }
    );

    // Run transaction pipeline
    await this.txManager.runInTransaction(async (tx: any) => {
      // 2. Persistence: Save the business case
      await this.repository.save(businessCase, tx);

      // 3. Event Bus: Stage creation event
      await this.eventBus.stageEvent(
        "BUSINESS_CASE_INITIALIZED",
        { workflow_type, status: initialState },
        caseContext,
        tx
      );
    }, context.traceability.correlation_id);

    const strategy = this.strategyRegistry.getStrategy(workflow_type);
    if (strategy) {
      const hookResult = await strategy.onInitialize(caseContext, businessCase);
      if (!hookResult.success) {
        return BusinessContextFactory.failure(context, hookResult.error || "Strategy initialization failed");
      }
    }

    return BusinessContextFactory.success(caseContext, businessCase);
  }

  /**
   * Orchestrates a state transition.
   */
  public async transitionState(
    context: BusinessContext,
    business_case_id: string,
    target_status: string,
    payload?: any
  ): Promise<ExecutionResult<BusinessCase>> {
    const businessCase = await this.repository.findById(business_case_id);
    if (!businessCase) {
      return BusinessContextFactory.failure(context, "Business case not found", KernelErrorCode.NOT_FOUND);
    }

    const workflowDef = this.registry.getWorkflow(businessCase.workflow_type);

    // 1. Evidence Check
    const completeness = this.evidenceEngine.calculateCompleteness(context, {
      workflow_type: businessCase.workflow_type,
      target_state: target_status
    });
    if (completeness.completion_percentage < 100) {
      return BusinessContextFactory.failure(context, "Missing mandatory evidence", KernelErrorCode.VALIDATION_FAILED);
    }

    const strategy = this.strategyRegistry.getStrategy(businessCase.workflow_type);
    if (strategy) {
      const hookResult = await strategy.onBeforeTransition(context, businessCase, {
        current_state: businessCase.status,
        target_state: target_status,
        payload
      });
      if (!hookResult.success) {
        return BusinessContextFactory.failure(context, hookResult.error || "Strategy beforeTransition failed");
      }
    }

    // 2. State Machine: Evaluate transition
    const stateMachine = new WorkflowStateMachine(workflowDef.state_machine);
    const transitionResult = await stateMachine.transition(context, {
      current_state: businessCase.status,
      target_state: target_status,
      payload
    });

    if (!transitionResult.success) {
      return BusinessContextFactory.failure(context, transitionResult.error!, KernelErrorCode.TRANSITION_BLOCKED);
    }

    // 3. Update state
    businessCase.status = target_status;
    businessCase.updated_at = new Date().toISOString();

    // 4. Persistence & Event Bus
    await this.txManager.runInTransaction(async (tx: any) => {
      await this.repository.save(businessCase, tx);
      await this.eventBus.stageEvent(
        "BUSINESS_CASE_TRANSITIONED",
        { from: transitionResult.data!.from, to: target_status, payload },
        context,
        tx
      );
    }, context.traceability.correlation_id);

    if (strategy) {
      await strategy.onAfterTransition(context, businessCase, { from: transitionResult.data!.from, to: target_status });
      // Check for terminal state closure hook if needed
      const isTerminal = workflowDef.state_machine.transitions[target_status] === undefined || workflowDef.state_machine.transitions[target_status].length === 0;
      if (isTerminal) {
        await strategy.onClose(context, businessCase);
      }
    }

    return BusinessContextFactory.success(context, businessCase);
  }

  /**
   * Submits evidence and routes through EventBus outbox.
   */
  public async submitEvidence(
    context: BusinessContext,
    business_case_id: string,
    command: Omit<UploadEvidenceCommand, "workflow_type">
  ): Promise<ExecutionResult<any>> {
    const businessCase = await this.repository.findById(business_case_id);
    if (!businessCase) {
      return BusinessContextFactory.failure(context, "Business case not found", KernelErrorCode.NOT_FOUND);
    }

    const evidenceResult = await this.evidenceEngine.uploadEvidence(context, {
      ...command,
      workflow_type: businessCase.workflow_type
    } as any);

    if (!evidenceResult.success) {
      return evidenceResult;
    }

    await this.txManager.runInTransaction(async (tx: any) => {
      await this.eventBus.stageEvent(
        "BUSINESS_CASE_EVIDENCE_UPLOADED",
        { evidence_type: command.evidence_type, metadata: command.metadata },
        context,
        tx
      );
    }, context.traceability.correlation_id);

    const strategy = this.strategyRegistry.getStrategy(businessCase.workflow_type);
    if (strategy) {
      await strategy.onEvidenceUploaded(context, businessCase, {
        evidence_id: evidenceResult.data!.evidence_id,
        evidence_type: command.evidence_type,
        metadata: command.metadata
      });
    }

    return evidenceResult;
  }

  /**
   * Requests an approval cycle for the Business Case.
   */
  public async requestApproval(
    context: BusinessContext,
    business_case_id: string
  ): Promise<ExecutionResult<any>> {
    const businessCase = await this.repository.findById(business_case_id);
    if (!businessCase) {
      return BusinessContextFactory.failure(context, "Business case not found", KernelErrorCode.NOT_FOUND);
    }

    // We pass to ApprovalEngine. Assuming ApprovalEngine uses its own persistence for approvals.
    const approvalResult = await this.approvalEngine.requestApproval(context, {
      workflow_type: businessCase.workflow_type
    });

    if (approvalResult.success) {
      await this.txManager.runInTransaction(async (tx: any) => {
        await this.eventBus.stageEvent(
          "BUSINESS_CASE_APPROVAL_REQUESTED",
          { approval_request_id: approvalResult.data!.approval_request_id },
          context,
          tx
        );
      }, context.traceability.correlation_id);
    }
    return approvalResult;
  }

  /**
   * Submits an approval decision and delegates to the workflow strategy hook.
   */
  public async submitApprovalDecision(
    context: BusinessContext,
    business_case_id: string,
    command: SubmitApprovalDecisionCommand
  ): Promise<ExecutionResult<any>> {
    const businessCase = await this.repository.findById(business_case_id);
    if (!businessCase) {
      return BusinessContextFactory.failure(context, "Business case not found", KernelErrorCode.NOT_FOUND);
    }

    const decisionResult = await this.approvalEngine.submitDecision(context, command);
    if (!decisionResult.success) {
      return decisionResult;
    }

    await this.txManager.runInTransaction(async (tx: any) => {
      await this.eventBus.stageEvent(
        "BUSINESS_CASE_APPROVAL_DECISION",
        { approval_request_id: command.approval_request_id, decision: command.status },
        context,
        tx
      );
    }, context.traceability.correlation_id);

    const strategy = this.strategyRegistry.getStrategy(businessCase.workflow_type);
    if (strategy) {
      await strategy.onApprovalGranted(context, businessCase, {
        approval_id: command.approval_request_id,
        decision: command.status === "Approved" ? "APPROVED" : "REJECTED",
        step_id: "unknown" // Or fetch from the approval record if available
      });
    }

    return decisionResult;
  }
}
