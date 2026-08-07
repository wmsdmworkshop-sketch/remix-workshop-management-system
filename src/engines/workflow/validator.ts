// =============================================================================
// WOS Workflow Transition Validator (Phase 4)
// Bounded Context: Workflow Operations / Validation Pipeline
// =============================================================================

import { WORKFLOW_CONFIG } from "./config";
import { LogPayload } from "./logger";
import { PermissionEngine } from "../../core/permission-engine";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  isOverrideRequired?: boolean;
}

export class WorkflowValidator {
  /**
   * Evaluates if a transition is valid under standard rules.
   */
  public static async validate(
    currentState: string,
    targetState: string,
    userRole: string,
    logContext: LogPayload
  ): Promise<ValidationResult> {
    // 1. Fetch source state config
    const sourceConfig = WORKFLOW_CONFIG[currentState];
    if (!sourceConfig) {
      return {
        isValid: false,
        reason: `Current state "${currentState}" is not defined in workflow configuration.`,
      };
    }

    // 2. Fetch target state config
    const targetConfig = WORKFLOW_CONFIG[targetState];
    if (!targetConfig) {
      return {
        isValid: false,
        reason: `Target state "${targetState}" is not defined in workflow configuration.`,
      };
    }

    // 3. Check allowed transitions
    const isTransitionAllowed = sourceConfig.allowedTransitions.includes(targetState);
    if (!isTransitionAllowed) {
      return {
        isValid: false,
        reason: `State transition from "${currentState}" to "${targetState}" is not permitted.`,
        isOverrideRequired: true, // Bypassing this requires supervisor override
      };
    }

    // 4. Validate user permissions via PermissionEngine
    const isAuthorized = await PermissionEngine.can(userRole, targetConfig.requiredPermission);
    if (!isAuthorized) {
      return {
        isValid: false,
        reason: `User role "${userRole}" is not authorized to transition into "${targetState}" (requires ${targetConfig.requiredPermission}).`,
        isOverrideRequired: true, // Role bypass requires supervisor override
      };
    }

    return { isValid: true };
  }
}
