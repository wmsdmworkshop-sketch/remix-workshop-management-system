/**
 * DWIP Enterprise WOS - WorkflowCapabilityEvaluator
 * Evaluator Engine for Workflow Capability Decisions
 */

import { WorkflowCapability } from '../WorkflowCapability';
import { WorkflowCapabilityContext, CapabilityEvaluationResult } from './WorkflowCapabilityContext';
import { WorkflowCapabilityRegistry } from './WorkflowCapabilityRegistry';
import { WorkflowCapabilityPolicy } from './WorkflowCapabilityPolicy';
import { WorkflowCapabilityException } from './WorkflowCapabilityException';
import { WorkflowResolver } from '../WorkflowResolver';

export class WorkflowCapabilityEvaluator {
  public evaluate(context: WorkflowCapabilityContext): CapabilityEvaluationResult {
    const { vos, capability, isOverride } = context;

    // 1. Unknown Capability Check
    if (!WorkflowCapabilityRegistry.isRegistered(capability)) {
      throw new WorkflowCapabilityException(
        `Unknown workflow capability '${capability}'. Capability must be registered in WorkflowCapabilityRegistry.`,
        'CAPABILITY_NOT_FOUND',
        { capability }
      );
    }

    // 2. Validate Circular Dependencies in Registry
    WorkflowCapabilityPolicy.validateNoCircularDependencies();

    // 3. Resolve Active Workflow Profile for VOS
    const activeProfile = WorkflowResolver.resolveForVos(vos);

    // 4. Resolve Inherited Capabilities Tree
    const inheritedCaps = WorkflowCapabilityPolicy.resolveInheritedCapabilities(activeProfile.capabilities);

    // 5. Handle Override Path
    if (isOverride) {
      WorkflowCapabilityPolicy.evaluateOverride(context);
      return {
        hasCapability: true,
        capability,
        resolvedProfileCode: activeProfile.code,
        dependenciesSatisfied: true,
        inheritedCapabilities: inheritedCaps,
        isOverrideApplied: true,
        reason: `Capability override granted: ${context.overrideReason}`,
        evaluatedAt: new Date().toISOString()
      };
    }

    // 6. Check Conflict Rules on Profile Active Capabilities
    WorkflowCapabilityPolicy.validateConflicts(inheritedCaps);

    // 7. Determine if target capability is satisfied
    const isSatisfied = inheritedCaps.includes(capability);

    return {
      hasCapability: isSatisfied,
      capability,
      resolvedProfileCode: activeProfile.code,
      dependenciesSatisfied: isSatisfied,
      inheritedCapabilities: inheritedCaps,
      isOverrideApplied: false,
      reason: isSatisfied
        ? `Capability '${capability}' active under profile '${activeProfile.code}'`
        : `Capability '${capability}' is not granted by profile '${activeProfile.code}'`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const workflowCapabilityEvaluator = new WorkflowCapabilityEvaluator();
