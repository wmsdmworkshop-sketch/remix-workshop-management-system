import { describe, it, expect, beforeEach } from "vitest";
import { ApprovalEngine, RequestApprovalCommand, SubmitApprovalDecisionCommand } from "../core/approval-engine";
import { BusinessContextFactory, BusinessContext } from "../core/business-context";
import { EventBus } from "../core/event-bus";
import { WorkflowRegistry } from "../core/workflow-registry";

import { vi } from "vitest";

const { mockDB } = vi.hoisted(() => ({
  mockDB: {
    requests: [] as any[],
    steps: [] as any[],
    decisions: [] as any[]
  }
}));

vi.mock("../db/index", () => ({
  pool: {
    execute: vi.fn().mockImplementation((query: string, params: any[]) => {
      if (query.startsWith("INSERT INTO approval_requests")) {
        mockDB.requests.push({ approval_request_id: params[0], entity_type: params[1], entity_id: params[2], workflow_type: params[3], status: params[4], strategy: params[5], created_at: params[6] });
      } else if (query.startsWith("INSERT INTO approval_steps")) {
        mockDB.steps.push({ step_id: params[0], approval_request_id: params[1], allowed_roles: params[2], is_mandatory: params[3], sla_minutes: params[4] });
      } else if (query.startsWith("INSERT INTO approval_decisions")) {
        mockDB.decisions.push({ decision_id: params[0], approval_request_id: params[1], actor_id: params[2], actor_role: params[3], status: params[4], comments: params[5], timestamp: params[6] });
      } else if (query.startsWith("UPDATE approval_requests SET status")) {
        const req = mockDB.requests.find(r => r.approval_request_id === params[1]);
        if (req) req.status = params[0];
      } else if (query.startsWith("SELECT * FROM approval_requests")) {
        return Promise.resolve([mockDB.requests.filter(r => r.approval_request_id === params[0])]);
      } else if (query.startsWith("SELECT * FROM approval_steps")) {
        return Promise.resolve([mockDB.steps.filter(r => r.approval_request_id === params[0])]);
      } else if (query.startsWith("SELECT * FROM approval_decisions")) {
        return Promise.resolve([mockDB.decisions.filter(r => r.approval_request_id === params[0])]);
      }
      return Promise.resolve([{}]);
    }),
    query: vi.fn().mockResolvedValue([[]])
  }
}));

describe("Approval Engine", () => {
  let engine: ApprovalEngine;
  let eventBus: EventBus;
  let registry: WorkflowRegistry;
  let mockDB: any;

  beforeEach(() => {
    mockDB = { approvals: [] };
    eventBus = new EventBus();
    registry = new WorkflowRegistry();
    
    // Register test profile
    registry.registerApprovalProfile({
      profile_id: "TestApprovalProfile",
      strategy: "Sequential",
      auto_escalate: false,
      steps: [
        { step_id: "STEP_1", allowed_roles: ["Manager"], is_mandatory: true }
      ]
    });
    
    // Override a workflow to use this profile
    const workflow = registry.getWorkflow("Retail");
    workflow.approval_profile = "TestApprovalProfile";
    registry.registerWorkflow(workflow);

    engine = new ApprovalEngine(
      eventBus,
      registry,
      () => mockDB,
      async (state) => { mockDB = state; }
    );
  });

  it("should request an approval successfully", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    const result = await engine.requestApproval(context, {
      workflow_type: "Retail"
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Pending");
    expect(result.data?.approval_request_id).toBeDefined();
    expect(mockDB.approvals.length).toBe(1);
  });

  it("should submit decision successfully and update status", async () => {
    const context1 = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    const requestResult = await engine.requestApproval(context1, {
      workflow_type: "Retail"
    });
    const requestId = requestResult.data!.approval_request_id;

    const managerContext = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "MGR001", role: "Manager" }
    );

    const decisionResult = await engine.submitDecision(managerContext, {
      approval_request_id: requestId,
      status: "Approved",
      comments: "LGTM"
    });

    expect(decisionResult.success).toBe(true);
    expect(decisionResult.data?.status).toBe("Approved");
    expect(decisionResult.data?.decisions[0].actor_id).toBe("MGR001");
  });

  it("should block decision from unauthorized role", async () => {
    const context1 = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    const requestResult = await engine.requestApproval(context1, {
      workflow_type: "Retail"
    });
    const requestId = requestResult.data!.approval_request_id;

    const unauthorizedContext = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "TECH001", role: "Technician" }
    );

    const decisionResult = await engine.submitDecision(unauthorizedContext, {
      approval_request_id: requestId,
      status: "Approved"
    });

    expect(decisionResult.success).toBe(false);
    expect(decisionResult.error).toContain("not authorized");
  });

  it("should prevent double decision from same actor (maker-checker violation)", async () => {
    registry.registerApprovalProfile({
      profile_id: "QuorumProfile",
      strategy: "Quorum",
      quorum_count: 2,
      auto_escalate: false,
      steps: [
        { step_id: "ANY_MANAGER", allowed_roles: ["Manager"], is_mandatory: true }
      ]
    });
    const workflow = registry.getWorkflow("Retail");
    workflow.approval_profile = "QuorumProfile";
    registry.registerWorkflow(workflow);

    const context1 = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    const requestResult = await engine.requestApproval(context1, {
      workflow_type: "Retail"
    });
    const requestId = requestResult.data!.approval_request_id;

    const managerContext = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "MGR001", role: "Manager" }
    );

    await engine.submitDecision(managerContext, {
      approval_request_id: requestId,
      status: "Approved"
    });

    const secondTry = await engine.submitDecision(managerContext, {
      approval_request_id: requestId,
      status: "Approved"
    });

    expect(secondTry.success).toBe(false);
    expect(secondTry.error).toContain("already submitted a decision");
  });

  it("should handle Quorum strategy", async () => {
    registry.registerApprovalProfile({
      profile_id: "QuorumProfile",
      strategy: "Quorum",
      quorum_count: 2,
      auto_escalate: false,
      steps: [
        { step_id: "ANY_MANAGER", allowed_roles: ["Manager", "Director"], is_mandatory: true }
      ]
    });
    const workflow = registry.getWorkflow("Retail");
    workflow.approval_profile = "QuorumProfile";
    registry.registerWorkflow(workflow);

    const requestContext = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    const requestResult = await engine.requestApproval(requestContext, { workflow_type: "Retail" });
    const requestId = requestResult.data!.approval_request_id;

    const manager1 = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "MGR001", role: "Manager" }
    );
    const mgr1Res = await engine.submitDecision(manager1, { approval_request_id: requestId, status: "Approved" });
    expect(mgr1Res.data?.status).toBe("Pending"); // Quorum not met

    const manager2 = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "MGR002", role: "Director" }
    );
    const mgr2Res = await engine.submitDecision(manager2, { approval_request_id: requestId, status: "Approved" });
    expect(mgr2Res.data?.status).toBe("Approved"); // Quorum met
  });
});
