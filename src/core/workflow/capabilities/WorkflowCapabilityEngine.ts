/**
 * DWIP Enterprise WOS - WorkflowCapabilityEngine
 * Centralized Workflow Capability Engine (Primary Capability Decision Point)
 */

import { IVos } from '../../vos/types';
import { WorkflowCapability } from '../WorkflowCapability';
import { WorkflowCapabilityContext, CapabilityEvaluationResult } from './WorkflowCapabilityContext';
import { WorkflowCapabilityEvaluator, workflowCapabilityEvaluator } from './WorkflowCapabilityEvaluator';
import { WorkflowCapabilityPolicy } from './WorkflowCapabilityPolicy';
import { WorkflowResolver } from '../WorkflowResolver';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class WorkflowCapabilityEngine {
  private cacheMap: Map<string, CapabilityEvaluationResult> = new Map();

  constructor(private evaluator: WorkflowCapabilityEvaluator = workflowCapabilityEvaluator) {}

  private buildCacheKey(vosId: string, capability: WorkflowCapability, isOverride?: boolean): string {
    return `${vosId}:${capability}:${Boolean(isOverride)}`;
  }

  /**
   * Primary Capability Decision Method
   * Modules MUST request capability decisions ONLY through this method.
   */
  public hasCapability(
    vos: IVos,
    capability: WorkflowCapability,
    options?: {
      actorId?: string;
      actorRole?: string;
      isOverride?: boolean;
      overrideReason?: string;
      ruleData?: Record<string, any>;
      correlationId?: string;
      bypassCache?: boolean;
    }
  ): boolean {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(vos.id, capability, options?.isOverride);

    if (!options?.bypassCache && this.cacheMap.has(cacheKey)) {
      const cached = this.cacheMap.get(cacheKey)!;
      return cached.hasCapability;
    }

    const context: WorkflowCapabilityContext = {
      vos,
      capability,
      actorId: options?.actorId,
      actorRole: options?.actorRole,
      isOverride: options?.isOverride,
      overrideReason: options?.overrideReason,
      ruleData: options?.ruleData,
      correlationId: options?.correlationId
    };

    const result = this.evaluator.evaluate(context);
    this.cacheMap.set(cacheKey, result);

    StructuredLogger.info(`Evaluated capability '${capability}' for VOS ${vos.id}: ${result.hasCapability}`, {
      correlationId: options?.correlationId,
      vosId: vos.id,
      component: 'WorkflowCapabilityEngine',
      operation: 'hasCapability',
      durationMs: Date.now() - startTime,
      result: result.hasCapability ? 'SUCCESS' : 'WARNING',
      capability,
      resolvedProfile: result.resolvedProfileCode,
      isOverride: result.isOverrideApplied
    });

    return result.hasCapability;
  }

  /**
   * Detailed Capability Evaluation
   */
  public evaluateCapability(context: WorkflowCapabilityContext): CapabilityEvaluationResult {
    return this.evaluator.evaluate(context);
  }

  /**
   * Resolve all active capabilities for a VOS session
   */
  public getCapabilities(vos: IVos): WorkflowCapability[] {
    const profile = WorkflowResolver.resolveForVos(vos);
    return WorkflowCapabilityPolicy.resolveInheritedCapabilities(profile.capabilities);
  }

  /**
   * Invalidate cache for VOS session
   */
  public invalidateVosCache(vosId: string): void {
    for (const key of this.cacheMap.keys()) {
      if (key.startsWith(`${vosId}:`)) {
        this.cacheMap.delete(key);
      }
    }
  }

  /**
   * Clear all capability caches
   */
  public clearCache(): void {
    this.cacheMap.clear();
  }
}

export const workflowCapabilityEngine = new WorkflowCapabilityEngine();
