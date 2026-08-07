/**
 * DWIP Enterprise - VOS Timeline Engine (Module 4)
 * Sprint 1 Architecture
 * 
 * Manages dual timeline sourcing (Operational Real-Time & Financial Audit timelines).
 */

import { VosTimelineNode, TimelineType } from './types';

export class VosTimelineEngine {
  private static instance: VosTimelineEngine;
  private nodes: VosTimelineNode[] = [];

  private constructor() {
    this.seedBaselineTimeline();
  }

  public static getInstance(): VosTimelineEngine {
    if (!VosTimelineEngine.instance) {
      VosTimelineEngine.instance = new VosTimelineEngine();
    }
    return VosTimelineEngine.instance;
  }

  private seedBaselineTimeline(): void {
    const now = new Date().toISOString();
    this.nodes.push({
      id: 'node_101',
      vosId: 'vos_1001',
      timelineType: 'OPERATIONAL',
      eventType: 'GATE_IN_COMPLETED',
      title: 'Vehicle Gate In Registered',
      metadata: { gatePassId: 'GP-1001' },
      timestamp: now
    });
    this.nodes.push({
      id: 'node_102',
      vosId: 'vos_1001',
      timelineType: 'FINANCIAL_AUDIT',
      eventType: 'SESSION_AUDIT_RECORDED',
      title: 'Operational Session Security Pass',
      metadata: { actorId: 'usr_sec_1' },
      timestamp: now
    });
  }

  public async addNode(
    params: Omit<VosTimelineNode, 'id' | 'timestamp'>
  ): Promise<VosTimelineNode> {
    const node: VosTimelineNode = {
      ...params,
      id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.nodes.unshift(node);
    return node;
  }

  public getTimelineForVos(vosId: string, type?: TimelineType): VosTimelineNode[] {
    return this.nodes.filter(
      n => n.vosId === vosId && (!type || n.timelineType === type)
    );
  }

  public getAllNodes(): VosTimelineNode[] {
    return [...this.nodes];
  }
}

export const vosTimelineEngine = VosTimelineEngine.getInstance();
