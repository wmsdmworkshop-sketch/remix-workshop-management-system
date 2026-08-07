import { describe, it, expect, beforeEach } from "vitest";
import { BusinessCaseEngine, IBusinessCaseRepository, BusinessCase } from "../core/business-case-engine";
import { WorkflowRegistry } from "../core/workflow-registry";
import { WorkflowStateMachine } from "../core/workflow-state-machine";
import { EvidenceManagementEngine } from "../core/evidence-engine";
import { ApprovalEngine } from "../core/approval-engine";
import { EventBus } from "../core/event-bus";
import { TransactionManager } from "../core/transaction-manager";
import { BusinessContextFactory } from "../core/business-context";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { BaseWorkflowStrategy } from "../workflows/base-workflow-strategy";

class MockBusinessCaseRepository implements IBusinessCaseRepository {
  private store: Map<string, BusinessCase> = new Map();

  async findById(id: string, tx?: any): Promise<BusinessCase | null> {
    return this.store.get(id) || null;
  }

  async save(businessCase: BusinessCase, tx?: any): Promise<void> {
    this.store.set(businessCase.business_case_id, { ...businessCase });
  }
}

class MockTransactionManager extends TransactionManager {
  constructor(eventBus: EventBus) {
    super(eventBus);
  }
  async executeTransaction<T>(work: (txConnection: any) => Promise<T>): Promise<T> {
    const tx = { outbox: [] };
    const result = await work(tx);
    await this.eventBus.processOutbox(tx);
    return result;
  }
  async runInTransaction<T>(
    work: (tx: any) => Promise<T>,
    correlationId: string,
    validationRunId?: string,
    parentContext?: any
  ): Promise<T> {
    const tx = { 
      connection: {}, correlationId, savepointDepth: 0, compensations: [], onCommitCallbacks: [],
      execute: async (query: string, params: any[]) => {}
    };
    const result = await work(tx);
    return result;
  }
}

class TestWorkflowStrategy extends BaseWorkflowStrategy {
  public hooksCalled = {
    onInitialize: false,
    onBeforeTransition: false,
    onAfterTransition: false,
    onEvidenceUploaded: false,
    onApprovalGranted: false,
    onClose: false
  };

  getWorkflowType(): string {
    return "TestWorkflow";
  }

  async onInitialize(context: any, bc: any) {
    this.hooksCalled.onInitialize = true;
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }

  async onBeforeTransition(context: any, bc: any, cmd: any) {
    this.hooksCalled.onBeforeTransition = true;
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }

  async onAfterTransition(context: any, bc: any, res: any) {
    this.hooksCalled.onAfterTransition = true;
    if (res.to === "Closed") {
      // Simulate close via terminal state check in business case engine
    }
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }

  async onClose(context: any, bc: any) {
    this.hooksCalled.onClose = true;
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }
  
  async onEvidenceUploaded(context: any, bc: any, ev: any) {
    this.hooksCalled.onEvidenceUploaded = true;
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }

  async onApprovalGranted(context: any, bc: any, approval: any) {
    this.hooksCalled.onApprovalGranted = true;
    return { success: true, timestamp: new Date().toISOString(), correlation_id: context.traceability.correlation_id };
  }
}

describe("Base Workflow Strategy Hooks", () => {
  let engine: BusinessCaseEngine;
  let registry: WorkflowRegistry;
  let strategyRegistry: WorkflowStrategyRegistry;
  let eventBus: EventBus;
  let txManager: TransactionManager;
  let testStrategy: TestWorkflowStrategy;

  beforeEach(() => {
    registry = new WorkflowRegistry();
    strategyRegistry = new WorkflowStrategyRegistry();
    eventBus = new EventBus();
    txManager = new MockTransactionManager(eventBus) as any;
    const repository = new MockBusinessCaseRepository();
    
    registry.registerWorkflow({
      workflow_type: "TestWorkflow",
      approval_profile: "DefaultProfile",
      evidence_profile: {
        "InReview": []
      },
      strategy_name: "TestStrategy",
      policy_profile: "DefaultPolicy",
      notification_profile: "DefaultNotification",
      retention_profile: "DefaultRetention",
      sla_profile: "DefaultSLA",
      state_machine: {
        workflow_type: "TestWorkflow",
        states: ["Draft", "InReview", "Closed"],
        initial_state: "Draft",
        transitions: {
          "Draft": ["InReview"],
          "InReview": ["Closed"],
          "Closed": []
        }
      }
    });

    const mockStorage = {
      upload: async () => ({ storage_provider: "mock", storage_path: "s3://mock/path" }),
      getSignedUrl: async () => "https://mock.url",
      delete: async () => {}
    };

    let mockDB = { approvals: [], evidences: [] };
    const evidenceEngine = new EvidenceManagementEngine(
      mockStorage as any,
      eventBus,
      registry,
      () => mockDB,
      async (s) => { mockDB = s; }
    );
    const approvalEngine = new ApprovalEngine(
      eventBus,
      registry,
      () => mockDB,
      async (s) => { mockDB = s; }
    );

    testStrategy = new TestWorkflowStrategy();
    strategyRegistry.registerStrategy(testStrategy);

    engine = new BusinessCaseEngine(
      registry,
      evidenceEngine,
      approvalEngine,
      eventBus,
      txManager,
      repository,
      strategyRegistry
    );
  });

  it("should trigger onInitialize hook", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    await engine.initializeCase(context, "TestWorkflow");
    expect(testStrategy.hooksCalled.onInitialize).toBe(true);
  });

  it("should trigger transition hooks (before, after, close)", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    const initResult = await engine.initializeCase(context, "TestWorkflow");
    const bcId = initResult.data!.business_case_id;

    // Transition to InReview
    await engine.transitionState(context, bcId, "InReview");
    expect(testStrategy.hooksCalled.onBeforeTransition).toBe(true);
    expect(testStrategy.hooksCalled.onAfterTransition).toBe(true);
    expect(testStrategy.hooksCalled.onClose).toBe(false); // Not terminal yet

    // Transition to Closed (terminal)
    await engine.transitionState(context, bcId, "Closed");
    expect(testStrategy.hooksCalled.onClose).toBe(true);
  });
  
  it("should trigger onEvidenceUploaded hook", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    const initResult = await engine.initializeCase(context, "TestWorkflow");
    const bcId = initResult.data!.business_case_id;

    await engine.submitEvidence(context, bcId, {
      evidence_type: "PHOTO",
      evidence_id: "EV-001",
      url: "s3://mock/img.jpg"
    } as any);

    expect(testStrategy.hooksCalled.onEvidenceUploaded).toBe(true);
  });
});
