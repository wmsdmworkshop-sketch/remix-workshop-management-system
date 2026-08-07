/**
 * DWIP Enterprise - VOS Audit Engine (Module 6)
 * Sprint 1 Architecture
 * 
 * Immutable audit logger for state transitions, custody transfers, and deviation overrides.
 */

import { VosStateTransition } from './types';

export class VosAuditEngine {
  private static instance: VosAuditEngine;
  private transitions: VosStateTransition[] = [];

  private constructor() {
    this.seedBaselineAuditLogs();
  }

  public static getInstance(): VosAuditEngine {
    if (!VosAuditEngine.instance) {
      VosAuditEngine.instance = new VosAuditEngine();
    }
    return VosAuditEngine.instance;
  }

  private seedBaselineAuditLogs(): void {
    const now = new Date().toISOString();
    this.transitions.push({
      id: 'transition_vos_101',
      vosId: 'vos_1001',
      fromState: 'GATE_IN',
      toState: 'INTAKE_WIP',
      actorId: 'usr_sec_1',
      actorRole: 'security_agent',
      reason: 'Gate entry pass generated',
      transitionTime: now
    });
  }

  public async logTransition(
    transition: Omit<VosStateTransition, 'id' | 'transitionTime'>
  ): Promise<VosStateTransition> {
    const record: VosStateTransition = {
      ...transition,
      id: `transition_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      transitionTime: new Date().toISOString()
    };
    this.transitions.unshift(record);
    return record;
  }

  public getTransitionsForVos(vosId: string): VosStateTransition[] {
    return this.transitions.filter(t => t.vosId === vosId);
  }

  public getAllTransitions(): VosStateTransition[] {
    return [...this.transitions];
  }
}

export const vosAuditEngine = VosAuditEngine.getInstance();
