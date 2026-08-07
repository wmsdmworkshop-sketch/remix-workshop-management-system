/**
 * DWIP Enterprise WOS - WorkflowCapabilityPolicy
 * Capability Conflicts, Dependency Tree Resolution, Circular Dependency Detection & Overrides
 */

import { WorkflowCapability } from '../WorkflowCapability';
import { WorkflowCapabilityRegistry } from './WorkflowCapabilityRegistry';
import { WorkflowCapabilityException } from './WorkflowCapabilityException';
import { WorkflowCapabilityContext } from './WorkflowCapabilityContext';

export class WorkflowCapabilityPolicy {
  /**
   * Check for circular dependencies in capability dependency graph
   */
  public static validateNoCircularDependencies(): void {
    const visited = new Set<WorkflowCapability>();
    const stack = new Set<WorkflowCapability>();

    function dfs(cap: WorkflowCapability): void {
      if (stack.has(cap)) {
        throw new WorkflowCapabilityException(
          `Circular dependency detected in capability tree involving '${cap}'.`,
          'CIRCULAR_CAPABILITY_DEPENDENCY',
          { capability: cap }
        );
      }
      if (visited.has(cap)) return;

      visited.add(cap);
      stack.add(cap);

      const meta = WorkflowCapabilityRegistry.getMetadata(cap);
      if (meta) {
        for (const dep of meta.dependencies) {
          dfs(dep);
        }
      }

      stack.delete(cap);
    }

    const all = WorkflowCapabilityRegistry.getAllCapabilities();
    for (const item of all) {
      dfs(item.capability);
    }
  }

  /**
   * Resolve full inherited capability tree (including transitive dependencies)
   */
  public static resolveInheritedCapabilities(activeCapabilities: WorkflowCapability[]): WorkflowCapability[] {
    const resolvedSet = new Set<WorkflowCapability>();

    function addWithDeps(cap: WorkflowCapability): void {
      if (resolvedSet.has(cap)) return;
      resolvedSet.add(cap);

      const meta = WorkflowCapabilityRegistry.getMetadata(cap);
      if (meta) {
        for (const dep of meta.dependencies) {
          addWithDeps(dep);
        }
      }
    }

    for (const cap of activeCapabilities) {
      addWithDeps(cap);
    }

    return Array.from(resolvedSet);
  }

  /**
   * Validate conflicts among active capability set
   */
  public static validateConflicts(capabilities: WorkflowCapability[]): void {
    const activeSet = new Set(capabilities);

    for (const cap of capabilities) {
      const meta = WorkflowCapabilityRegistry.getMetadata(cap);
      if (meta) {
        for (const conflictingCap of meta.conflictsWith) {
          if (activeSet.has(conflictingCap)) {
            throw new WorkflowCapabilityException(
              `Capability conflict detected: Capability '${cap}' conflicts with '${conflictingCap}' and cannot be active simultaneously.`,
              'CAPABILITY_CONFLICT_DETECTED',
              { capabilityA: cap, capabilityB: conflictingCap }
            );
          }
        }
      }
    }
  }

  /**
   * Evaluate Override Authorization
   */
  public static evaluateOverride(context: WorkflowCapabilityContext): void {
    const role = (context.actorRole || '').toLowerCase();
    const isAuthorized = ['general_manager', 'gm', 'admin', 'system'].includes(role);

    if (!isAuthorized) {
      throw new WorkflowCapabilityException(
        `Role '${context.actorRole}' is not authorized to override capability policies.`,
        'UNAUTHORIZED_CAPABILITY_OVERRIDE'
      );
    }

    if (!context.overrideReason || context.overrideReason.trim().length === 0) {
      throw new WorkflowCapabilityException(
        `Capability override requires a mandatory justification reason.`,
        'CAPABILITY_OVERRIDE_REASON_REQUIRED'
      );
    }
  }
}
