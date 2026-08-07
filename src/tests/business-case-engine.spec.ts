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
    // Simulate flush outbox
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
      outbox: [] as any[],
      execute: async (query: string, params: any[]) => {
        if (query.includes('tbl_event_outbox')) {
          tx.outbox.push(JSON.parse(params[2]));
        }
      }
    };
    const result = await work(tx);
    // Simulate flush outbox here so processOutbox can dispatch
    await this.eventBus.processOutbox(tx);
    return result;
  }
}

describe("Business Case Engine", () => {
  let engine: BusinessCaseEngine;
  let registry: WorkflowRegistry;
  let evidenceEngine: EvidenceManagementEngine;
  let approvalEngine: ApprovalEngine;
  let eventBus: EventBus;
  let txManager: TransactionManager;
  let repository: IBusinessCaseRepository;
  let mockDB: any;

  beforeEach(() => {
    mockDB = { approvals: [], evidences: [] };
    registry = new WorkflowRegistry();
    eventBus = new EventBus();
    txManager = new MockTransactionManager(eventBus) as any;
    repository = new MockBusinessCaseRepository();
    
    // Set up a mock workflow
    registry.registerWorkflow({
      workflow_type: "GenericWorkflow",
      approval_profile: "DefaultProfile",
      evidence_profile: {
        "InReview": [{ evidence_type: "REQ_1", is_mandatory: true, min_quantity: 1 }]
      },
      strategy_name: "GenericStrategy",
      policy_profile: "DefaultPolicy",
      notification_profile: "DefaultNotification",
      retention_profile: "DefaultRetention",
      sla_profile: "DefaultSLA",
      state_machine: {
        workflow_type: "GenericWorkflow",
        states: ["Draft", "InReview"],
        initial_state: "Draft",
        transitions: {
          "Draft": ["InReview"],
          "InReview": []
        }
      }
    });



    const mockStorage = {
      upload: async () => ({ storage_provider: "mock", storage_path: "s3://mock/path" }),
      getSignedUrl: async () => "https://mock.url",
      delete: async () => {}
    };

    evidenceEngine = new EvidenceManagementEngine(
      mockStorage as any,
      eventBus,
      registry,
      () => mockDB,
      async (s) => { mockDB = s; }
    );
    approvalEngine = new ApprovalEngine(
      eventBus,
      registry,
      () => mockDB,
      async (s) => { mockDB = s; }
    );

    engine = new BusinessCaseEngine(
      registry,
      evidenceEngine,
      approvalEngine,
      eventBus,
      txManager,
      repository,
      new WorkflowStrategyRegistry()
    );
  });

  it("should initialize a Business Case and stage an event", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    let eventFired = false;
    eventBus.subscribe("BUSINESS_CASE_INITIALIZED", () => {
      eventFired = true;
    });

    const result = await engine.initializeCase(context, "GenericWorkflow", [
      { entity_type: "JobCard", entity_id: "100", relationship: "primary" }
    ]);

    expect(result.success).toBe(true);
    expect(result.data?.business_case_id).toContain("BC-");
    expect(result.data?.status).toBe("Draft");
    expect(result.data?.references[0].entity_id).toBe("100");
    
    // Wait for async outbox dispatcher
    await new Promise((r) => setTimeout(r, 10));
    expect(eventFired).toBe(true);
  });

  it("should block transition if missing mandatory evidence", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    const initResult = await engine.initializeCase(context, "GenericWorkflow");
    const bcId = initResult.data!.business_case_id;

    // "InReview" requires REQ_1 evidence according to registry setup
    const transitionResult = await engine.transitionState(context, bcId, "InReview");
    expect(transitionResult.success).toBe(false);
    expect(transitionResult.error).toContain("Missing mandatory evidence");
  });

  it("should transition state successfully after evidence is uploaded", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "USER_1", role: "Manager" }
    );

    const initResult = await engine.initializeCase(context, "GenericWorkflow");
    const bcId = initResult.data!.business_case_id;

    // Use Engine Context for business case
    const bcContext = BusinessContextFactory.create(
      { entity_type: "BusinessCase", entity_id: bcId },
      { user_id: "USER_1", role: "Manager" }
    );

    // Upload evidence
    await engine.submitEvidence(bcContext, bcId, {
      evidence_type: "REQ_1",
      fileBuffer: Buffer.from("pdf-content"),
      metadata: {
        evidence_id: "EV-123",
        url: "s3://evidence/123.pdf"
      }
    });

    // Try transition again
    const transitionResult = await engine.transitionState(bcContext, bcId, "InReview");
    expect(transitionResult.success).toBe(true);
    expect(transitionResult.data?.status).toBe("InReview");
  });
});
