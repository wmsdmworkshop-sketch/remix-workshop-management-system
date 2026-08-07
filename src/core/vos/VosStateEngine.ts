/**
 * DWIP Enterprise - VOS State Engine (Module 2)
 * Sprint 1 Architecture - Frozen Rules Engine
 * 
 * Enforces strict VOS state transitions and business rule guards:
 * - VOS starts at Gate In and ends at Gate Out.
 * - CRM / Job Card creation requires Operational Readiness.
 * - Job Card does not block workshop operations.
 * - Gate Out requires OEM Job Card OR Approved Deviation.
 */

import { VosState, VosSession } from './types';
import { vosAuditEngine } from './VosAuditEngine';
import { vosEventEngine } from './VosEventEngine';
import { vosTimelineEngine } from './VosTimelineEngine';
import { vosConfigurationEngine } from './VosConfigurationEngine';

export class VosStateEngine {
  private static instance: VosStateEngine;

  private constructor() {}

  public static getInstance(): VosStateEngine {
    if (!VosStateEngine.instance) {
      VosStateEngine.instance = new VosStateEngine();
    }
    return VosStateEngine.instance;
  }

  /**
   * Allowed state transitions map
   */
  private allowedTransitions: Record<VosState, VosState[]> = {
    'GATE_IN': ['INTAKE_WIP'],
    'INTAKE_WIP': ['OPERATIONAL_READY'],
    'OPERATIONAL_READY': ['WORKSHOP_WIP'],
    'WORKSHOP_WIP': ['QC_PENDING'],
    'QC_PENDING': ['DELIVERY_READY', 'WORKSHOP_WIP'], // WORKSHOP_WIP if QC fails
    'DELIVERY_READY': ['GATE_OUT'],
    'GATE_OUT': [] // Terminal state
  };

  /**
   * Validate if a transition from currentState to targetState is allowed
   */
  public canTransition(session: VosSession, targetState: VosState): { allowed: boolean; reason?: string } {
    const current = session.status;
    const allowedTargets = this.allowedTransitions[current] || [];

    if (!allowedTargets.includes(targetState)) {
      return {
        allowed: false,
        reason: `Illegal state transition from ${current} to ${targetState}`
      };
    }

    // Specific Guard Rule: GATE_OUT requires OEM Job Card OR Approved Deviation
    if (targetState === 'GATE_OUT') {
      const enforceRule = vosConfigurationEngine.getBooleanConfig(
        'vos.require_job_card_or_deviation_for_gate_out',
        true
      );

      if (enforceRule && !session.hasOemJobCard && !session.hasApprovedDeviation) {
        return {
          allowed: false,
          reason: 'VOS Closure and Gate Out require either an OEM Job Card OR an Approved Deviation.'
        };
      }
    }

    // Specific Guard Rule: WORKSHOP_WIP requires Operational Readiness
    if (targetState === 'WORKSHOP_WIP' && !session.operationalReadiness && current === 'INTAKE_WIP') {
      return {
        allowed: false,
        reason: 'Operational Readiness is required before progressing into Workshop WIP.'
      };
    }

    return { allowed: true };
  }

  /**
   * Execute state transition with full auditing and event generation
   */
  public async transitionState(
    session: VosSession,
    targetState: VosState,
    actorId: string,
    actorRole: string,
    reason?: string
  ): Promise<VosSession> {
    const check = this.canTransition(session, targetState);
    if (!check.allowed) {
      throw new Error(`[VosStateEngine] Transition rejected: ${check.reason}`);
    }

    const previousState = session.status;
    session.status = targetState;
    session.updatedAt = new Date().toISOString();

    if (targetState === 'OPERATIONAL_READY') {
      session.operationalReadiness = true;
    }

    if (targetState === 'GATE_OUT') {
      session.gateOutTime = new Date().toISOString();
    }

    // Log Audit
    await vosAuditEngine.logTransition({
      vosId: session.id,
      fromState: previousState,
      toState: targetState,
      actorId,
      actorRole,
      reason
    });

    // Emit Event
    await vosEventEngine.emitEvent({
      vosId: session.id,
      eventType: 'VOS_STATE_TRANSITIONED',
      payload: {
        fromState: previousState,
        toState: targetState,
        reason
      },
      actorId,
      actorRole,
      correlationId: `corr_trans_${Date.now()}`
    });

    // Add Timeline Nodes
    await vosTimelineEngine.addNode({
      vosId: session.id,
      timelineType: 'OPERATIONAL',
      eventType: 'STATE_CHANGED',
      title: `VOS Status changed to ${targetState}`,
      metadata: { fromState: previousState, toState: targetState, actorId, actorRole }
    });

    await vosTimelineEngine.addNode({
      vosId: session.id,
      timelineType: 'FINANCIAL_AUDIT',
      eventType: 'AUDIT_STATE_RECORDED',
      title: `Audit log for ${previousState} -> ${targetState}`,
      metadata: { actorId, actorRole, reason }
    });

    return session;
  }
}

export const vosStateEngine = VosStateEngine.getInstance();
