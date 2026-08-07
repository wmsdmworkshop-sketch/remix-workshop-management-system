import { randomUUID } from "crypto";
import { 
  BusinessContext, 
  ExecutionResult, 
  KernelErrorCode,
  EngineMetadata
} from "./kernel-contracts";
import { BusinessContextFactory } from "./business-context";
import { EventBus } from "./event-bus";
import { 
  WorkflowRegistry, 
  ApprovalProfile, 
  ApprovalStrategy, 
  ApprovalStep 
} from "./workflow-registry";
import { pool as db } from "../db/index";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Returned";

export interface ApprovalDecision {
  decision_id: string;
  approval_request_id: string;
  actor_id: string;
  actor_role: string;
  status: "Approved" | "Rejected" | "Returned";
  comments?: string;
  timestamp: string;
}

export interface ApprovalRequest {
  approval_request_id: string;
  entity_type: string;
  entity_id: string;
  workflow_type: string;
  status: ApprovalStatus;
  profile: ApprovalProfile;
  decisions: ApprovalDecision[];
  created_at: string;
  delegations?: Array<{
    from_actor_id: string;
    to_actor_id: string;
    to_actor_role: string;
    reason?: string;
    timestamp: string;
  }>;
}

export interface RequestApprovalCommand {
  workflow_type: string;
  metadata?: Record<string, any>;
}

export interface SubmitApprovalDecisionCommand {
  approval_request_id: string;
  status: "Approved" | "Rejected" | "Returned";
  comments?: string;
}

export interface DelegateApprovalCommand {
  approval_request_id: string;
  from_actor_id: string;
  to_actor_id: string;
  to_actor_role: string;
  reason?: string;
}

export class ApprovalEngine {
  public metadata: EngineMetadata = {
    engine_name: "ApprovalEngine",
    engine_version: "2.1.0",
    capabilities: ["ConfigurableApprovals", "EventDriven", "ConditionalRouting", "Delegation", "PersistentService"]
  };

  constructor(
    private eventBus: EventBus,
    private registry: WorkflowRegistry,
    private getDBState?: () => any, 
    private setDBState?: (state: any) => Promise<void> 
  ) {}

  public async requestApproval(
    context: BusinessContext, 
    command: RequestApprovalCommand
  ): Promise<ExecutionResult<ApprovalRequest>> {
    const workflowDef = this.registry.getWorkflow(command.workflow_type);
    const profileId = workflowDef.approval_profile;
    const originalProfile = await this.registry.getApprovalProfile(profileId);
    if (!originalProfile) {
      return BusinessContextFactory.failure(context, "No approval profile configured for workflow", KernelErrorCode.NOT_FOUND);
    }

    // Clone profile to prevent mutating the registered template definition
    const profile: ApprovalProfile = JSON.parse(JSON.stringify(originalProfile));

    // Conditional Routing Evaluator (EAR-001 Section 4 Compliant)
    if (command.metadata) {
      const { 
        amount, 
        branch, 
        workshop_id, 
        vehicle_category, 
        customer_type, 
        job_type, 
        warranty_category, 
        campaign, 
        escalation_level 
      } = command.metadata;

      // Rule: Amount Threshold Escalation
      if (amount && amount > 50000) {
        profile.steps = profile.steps.map(step => {
          if (step.step_id === "SERVICE_ADVISOR_REVIEW" || step.allowed_roles.includes("Service Advisor")) {
            return { ...step, allowed_roles: ["Service Manager", "Workshop Manager"] };
          }
          return step;
        });
      }

      // Rule: Customer Type Override
      if (customer_type === "KeyAccount" || customer_type === "Fleet") {
        profile.steps.push({
          step_id: "KEY_ACCOUNT_RECONCILIATION",
          allowed_roles: ["DKAM", "Workshop Manager"],
          is_mandatory: true,
          sla_minutes: 30
        });
      }

      // Rule: Escalation Level Routing
      if (escalation_level && escalation_level > 1) {
        profile.steps.push({
          step_id: `ESCALATION_LEVEL_${escalation_level}`,
          allowed_roles: ["Dealer Principal", "GM Service"],
          is_mandatory: true,
          sla_minutes: 15
        });
      }
    }

    const requestId = randomUUID();

    // 1. Persistent write: approval_requests
    await db.execute(
      `INSERT INTO approval_requests (approval_request_id, entity_type, entity_id, workflow_type, status, strategy, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        context.identity.entity_type || "JobCard",
        context.identity.entity_id || "100",
        command.workflow_type,
        "Pending",
        profile.strategy,
        new Date()
      ]
    );

    // 2. Persistent write: approval_steps
    for (const step of profile.steps) {
      await db.execute(
        `INSERT INTO approval_steps (step_id, approval_request_id, allowed_roles, is_mandatory, sla_minutes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          step.step_id,
          requestId,
          step.allowed_roles.join(","),
          step.is_mandatory ? 1 : 0,
          step.sla_minutes || null
        ]
      );
    }

    const approvalRequest: ApprovalRequest = {
      approval_request_id: requestId,
      entity_type: context.identity.entity_type || "JobCard",
      entity_id: context.identity.entity_id || "100",
      workflow_type: command.workflow_type,
      status: "Pending",
      profile,
      decisions: [],
      created_at: context.traceability.timestamp,
      delegations: []
    };

    // Legacy file DB support for mock assertions in unit tests
    if (this.getDBState && this.setDBState) {
      const dbState = this.getDBState();
      dbState.approvals = dbState.approvals || [];
      dbState.approvals.push(approvalRequest);
      await this.setDBState(dbState);
    }

    this.eventBus.publish("ApprovalRequested", {
      correlation_id: context.traceability.correlation_id,
      timestamp: context.traceability.timestamp,
      payload: {
        approval_request_id: approvalRequest.approval_request_id,
        entity_type: approvalRequest.entity_type,
        entity_id: approvalRequest.entity_id,
        workflow_type: approvalRequest.workflow_type,
        strategy: profile.strategy
      }
    }, context);

    return BusinessContextFactory.success(context, approvalRequest);
  }

  public async submitDecision(
    context: BusinessContext,
    command: SubmitApprovalDecisionCommand
  ): Promise<ExecutionResult<ApprovalRequest>> {
    // 1. Fetch approval request from DB
    const [requests] = await db.execute(
      "SELECT * FROM approval_requests WHERE approval_request_id = ?",
      [command.approval_request_id]
    ) as any[];
    
    if (!requests || requests.length === 0) {
      return BusinessContextFactory.failure(context, "Approval request not found", KernelErrorCode.NOT_FOUND);
    }
    const requestRow = requests[0];

    if (requestRow.status !== "Pending") {
      return BusinessContextFactory.failure(context, `Approval request is already ${requestRow.status}`, KernelErrorCode.CONFLICT);
    }

    // 2. Fetch steps
    const [stepRows] = await db.execute(
      "SELECT * FROM approval_steps WHERE approval_request_id = ?",
      [command.approval_request_id]
    ) as any[];

    const steps: ApprovalStep[] = stepRows.map((s: any) => ({
      step_id: s.step_id,
      allowed_roles: s.allowed_roles.split(","),
      is_mandatory: s.is_mandatory === 1,
      sla_minutes: s.sla_minutes
    }));

    // 3. Fetch decisions
    const [decisionRows] = await db.execute(
      "SELECT * FROM approval_decisions WHERE approval_request_id = ?",
      [command.approval_request_id]
    ) as any[];

    const decisions: ApprovalDecision[] = decisionRows.map((d: any) => ({
      decision_id: d.decision_id,
      approval_request_id: d.approval_request_id,
      actor_id: d.actor_id,
      actor_role: d.actor_role,
      status: d.status,
      comments: d.comments,
      timestamp: d.timestamp
    }));

    // Role validation
    const actorRole = context.actor.role;
    const isAllowed = steps.some(step => step.allowed_roles.includes(actorRole));
    if (!isAllowed) {
      return BusinessContextFactory.failure(context, "Actor role not authorized for this approval", KernelErrorCode.UNAUTHORIZED);
    }

    // Double decision check
    const alreadyDecided = decisions.some(d => d.actor_id === context.actor.user_id);
    if (alreadyDecided) {
      return BusinessContextFactory.failure(context, "Actor has already submitted a decision", KernelErrorCode.CONFLICT);
    }

    // 4. Save decision to DB
    const decisionId = randomUUID();
    await db.execute(
      `INSERT INTO approval_decisions (decision_id, approval_request_id, actor_id, actor_role, status, comments, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        decisionId,
        command.approval_request_id,
        context.actor.user_id,
        context.actor.role,
        command.status,
        command.comments || null,
        new Date()
      ]
    );

    const newDecision: ApprovalDecision = {
      decision_id: decisionId,
      approval_request_id: command.approval_request_id,
      actor_id: context.actor.user_id,
      actor_role: context.actor.role,
      status: command.status,
      comments: command.comments,
      timestamp: context.traceability.timestamp
    };
    decisions.push(newDecision);

    this.eventBus.publish("ApprovalDecisionSubmitted", {
      correlation_id: context.traceability.correlation_id,
      timestamp: context.traceability.timestamp,
      payload: { decision: newDecision }
    }, context);

    // Retrieve registry profile details for quorum_count configuration
    let quorumCount = undefined;
    try {
      const workflowDef = this.registry.getWorkflow(requestRow.workflow_type);
      const registryProfile = await this.registry.getApprovalProfile(workflowDef.approval_profile);
      quorumCount = registryProfile?.quorum_count;
    } catch(e) {}

    const profile: ApprovalProfile = {
      profile_id: requestRow.workflow_type + "_profile",
      strategy: requestRow.strategy as ApprovalStrategy,
      steps,
      auto_escalate: false,
      quorum_count: quorumCount
    };

    const approvalRequest: ApprovalRequest = {
      approval_request_id: requestRow.approval_request_id,
      entity_type: requestRow.entity_type,
      entity_id: requestRow.entity_id,
      workflow_type: requestRow.workflow_type,
      status: requestRow.status,
      profile,
      decisions,
      created_at: requestRow.created_at
    };

    // Evaluate global status
    const newStatus = this.evaluateStatus(approvalRequest);
    if (newStatus !== requestRow.status) {
      approvalRequest.status = newStatus;
      await db.execute(
        "UPDATE approval_requests SET status = ? WHERE approval_request_id = ?",
        [newStatus, command.approval_request_id]
      );

      if (newStatus === "Approved") {
        this.eventBus.publish("ApprovalApproved", {
          correlation_id: context.traceability.correlation_id,
          timestamp: context.traceability.timestamp,
          payload: { approval_request_id: command.approval_request_id }
        }, context);
      } else if (newStatus === "Rejected") {
        this.eventBus.publish("ApprovalRejected", {
          correlation_id: context.traceability.correlation_id,
          timestamp: context.traceability.timestamp,
          payload: { approval_request_id: command.approval_request_id }
        }, context);
      }
    }

    // Legacy file DB support for mock assertions in unit tests
    if (this.getDBState && this.setDBState) {
      const dbState = this.getDBState();
      dbState.approvals = dbState.approvals || [];
      const req = dbState.approvals.find((r: any) => r.approval_request_id === command.approval_request_id);
      if (req) {
        req.decisions.push(newDecision);
        req.status = newStatus;
        await this.setDBState(dbState);
      }
    }

    return BusinessContextFactory.success(context, approvalRequest);
  }

  public async delegateApproval(
    context: BusinessContext,
    command: DelegateApprovalCommand
  ): Promise<ExecutionResult<ApprovalRequest>> {
    // 1. Fetch request from DB
    const [requests] = await db.execute(
      "SELECT * FROM approval_requests WHERE approval_request_id = ?",
      [command.approval_request_id]
    ) as any[];
    
    if (!requests || requests.length === 0) {
      return BusinessContextFactory.failure(context, "Approval request not found", KernelErrorCode.NOT_FOUND);
    }
    const requestRow = requests[0];

    if (requestRow.status !== "Pending") {
      return BusinessContextFactory.failure(context, `Approval request is already ${requestRow.status}`, KernelErrorCode.CONFLICT);
    }

    // 2. Save delegation to DB
    const delegationId = randomUUID();
    await db.execute(
      `INSERT INTO approval_delegations (delegation_id, approval_request_id, from_actor_id, to_actor_id, to_actor_role, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        delegationId,
        command.approval_request_id,
        command.from_actor_id,
        command.to_actor_id,
        command.to_actor_role,
        command.reason || null,
        new Date()
      ]
    );

    // 3. Dynamically insert delegated step
    const stepId = `DELEGATED_${randomUUID().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO approval_steps (step_id, approval_request_id, allowed_roles, is_mandatory, sla_minutes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        stepId,
        command.approval_request_id,
        command.to_actor_role,
        1,
        30
      ]
    );

    this.eventBus.publish("ApprovalDelegated", {
      correlation_id: context.traceability.correlation_id,
      timestamp: context.traceability.timestamp,
      payload: { 
        approval_request_id: command.approval_request_id,
        from_actor_id: command.from_actor_id,
        to_actor_id: command.to_actor_id,
        to_actor_role: command.to_actor_role
      }
    }, context);

    // Reconstruct updated ApprovalRequest
    const [stepRows] = await db.execute(
      "SELECT * FROM approval_steps WHERE approval_request_id = ?",
      [command.approval_request_id]
    ) as any[];

    const steps: ApprovalStep[] = stepRows.map((s: any) => ({
      step_id: s.step_id,
      allowed_roles: s.allowed_roles.split(","),
      is_mandatory: s.is_mandatory === 1,
      sla_minutes: s.sla_minutes
    }));

    const profile: ApprovalProfile = {
      profile_id: requestRow.workflow_type + "_profile",
      strategy: requestRow.strategy as ApprovalStrategy,
      steps,
      auto_escalate: false
    };

    const approvalRequest: ApprovalRequest = {
      approval_request_id: requestRow.approval_request_id,
      entity_type: requestRow.entity_type,
      entity_id: requestRow.entity_id,
      workflow_type: requestRow.workflow_type,
      status: requestRow.status,
      profile,
      decisions: [],
      created_at: requestRow.created_at
    };

    // Legacy file DB support for mock assertions in unit tests
    if (this.getDBState && this.setDBState) {
      const dbState = this.getDBState();
      dbState.approvals = dbState.approvals || [];
      const req = dbState.approvals.find((r: any) => r.approval_request_id === command.approval_request_id);
      if (req) {
        req.delegations = req.delegations || [];
        req.delegations.push({
          from_actor_id: command.from_actor_id,
          to_actor_id: command.to_actor_id,
          to_actor_role: command.to_actor_role,
          reason: command.reason,
          timestamp: context.traceability.timestamp
        });
        req.profile.steps.push({
          step_id: stepId,
          allowed_roles: [command.to_actor_role],
          is_mandatory: true,
          sla_minutes: 30
        });
        await this.setDBState(dbState);
      }
    }

    return BusinessContextFactory.success(context, approvalRequest);
  }

  private evaluateStatus(request: ApprovalRequest): ApprovalStatus {
    const { strategy, steps } = request.profile;
    const decisions = request.decisions;

    const rejections = decisions.filter(d => d.status === "Rejected");
    if (rejections.length > 0) return "Rejected";

    const returns = decisions.filter(d => d.status === "Returned");
    if (returns.length > 0) return "Returned";

    const approvals = decisions.filter(d => d.status === "Approved");

    switch (strategy) {
      case "Sequential":
      case "Parallel":
      case "AllRequired":
        const allMandatoryMet = steps.filter(s => s.is_mandatory).every(step => 
          approvals.some(a => step.allowed_roles.includes(a.actor_role))
        );
        return allMandatoryMet ? "Approved" : "Pending";
        
      case "AnyOne":
        return approvals.length > 0 ? "Approved" : "Pending";

      case "Quorum":
        const needed = request.profile.quorum_count || 1;
        return approvals.length >= needed ? "Approved" : "Pending";

      case "Conditional":
        const conditionalMet = steps.filter(s => s.is_mandatory).every(step => 
          approvals.some(a => step.allowed_roles.includes(a.actor_role))
        );
        return conditionalMet ? "Approved" : "Pending";

      default:
        return "Pending";
    }
  }
}
