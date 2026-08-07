import { BusinessContext, ExecutionResult, BusinessCase } from "../core";
import { TransitionCommand } from "../core/workflow-state-machine";

export interface EvidenceRecordPayload {
  evidence_id: string;
  evidence_type: string;
  metadata?: any;
}

export interface ApprovalDecisionPayload {
  approval_id: string;
  decision: "APPROVED" | "REJECTED";
  step_id: string;
}

/**
 * Produces a properly-typed successful ExecutionResult<void>.
 * All workflow strategy lifecycle hooks must return this to satisfy the
 * kernel contract (timestamp + correlation_id are required).
 */
export function okResult(context?: BusinessContext): ExecutionResult<void> {
  return Object.freeze({
    success: true,
    timestamp: new Date().toISOString(),
    correlation_id: context?.traceability?.correlation_id ?? "SYSTEM",
  });
}

/**
 * Produces a properly-typed failure ExecutionResult<void>.
 */
export function failResult(error: string, context?: BusinessContext): ExecutionResult<void> {
  return Object.freeze({
    success: false,
    error,
    timestamp: new Date().toISOString(),
    correlation_id: context?.traceability?.correlation_id ?? "SYSTEM",
  });
}

/**
 * Base Workflow Strategy
 * Defines the standard lifecycle execution hooks for all specialized workflows.
 * The BusinessCaseEngine delegates domain-specific logic to these hooks.
 */
export abstract class BaseWorkflowStrategy {
  /**
   * Identifies the workflow type (e.g., "Warranty", "AMC", "PDI").
   */
  abstract getWorkflowType(): string;

  /**
   * Hook invoked immediately after a Business Case is initialized.
   */
  async onInitialize(
    context: BusinessContext,
    businessCase: BusinessCase
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  /**
   * Hook invoked before a state transition evaluates.
   * Can be used to inject custom validation or policy checks.
   */
  async onBeforeTransition(
    context: BusinessContext,
    businessCase: BusinessCase,
    command: TransitionCommand
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  /**
   * Hook invoked after a state transition is successfully persisted.
   * Can be used to spawn side-effects or update domain models.
   */
  async onAfterTransition(
    context: BusinessContext,
    businessCase: BusinessCase,
    transitionResult: { from: string; to: string }
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  /**
   * Hook invoked when evidence is successfully uploaded.
   */
  async onEvidenceUploaded(
    context: BusinessContext,
    businessCase: BusinessCase,
    evidence: EvidenceRecordPayload
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  /**
   * Hook invoked when an approval decision is registered.
   */
  async onApprovalGranted(
    context: BusinessContext,
    businessCase: BusinessCase,
    approval: ApprovalDecisionPayload
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }

  /**
   * Hook invoked when the Business Case reaches a terminal state.
   */
  async onClose(
    context: BusinessContext,
    businessCase: BusinessCase
  ): Promise<ExecutionResult<void>> {
    return okResult(context);
  }
}
