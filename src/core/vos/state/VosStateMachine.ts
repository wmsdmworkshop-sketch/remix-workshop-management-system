/**
 * DWIP Enterprise WOS - VosStateMachine
 * Task 1.3 State Model & Allowed Directed Transition Graph
 */

import { VosStateName, VosStateCode } from './types';

export class VosStateMachine {
  public static readonly STATES: Record<VosStateName, { code: VosStateCode; description: string }> = {
    GATE_IN: { code: 'STATE_GATE_IN', description: 'Vehicle entered workshop perimeter at Gate In' },
    INSPECTION: { code: 'STATE_INSPECTION', description: 'Initial vehicle 360 inspection & fault diagnosis' },
    ESTIMATION: { code: 'STATE_ESTIMATION', description: 'Cost, labor, and parts estimation preparation' },
    APPROVAL_PENDING: { code: 'STATE_APPROVAL_PENDING', description: 'Awaiting customer/insurance estimate approval' },
    WORK_IN_PROGRESS: { code: 'STATE_WORK_IN_PROGRESS', description: 'Active repair and maintenance work in bay' },
    QUALITY_CHECK: { code: 'STATE_QUALITY_CHECK', description: 'Post-repair quality control & road test' },
    READY_FOR_DELIVERY: { code: 'STATE_READY_FOR_DELIVERY', description: 'Washed, cleaned & ready for customer handover' },
    GATE_OUT: { code: 'STATE_GATE_OUT', description: 'Vehicle departed workshop perimeter through Gate Out' },
    CLOSED: { code: 'STATE_CLOSED', description: 'Operational session fully closed & archived' }
  };

  private static readonly TRANSITION_GRAPH: Record<VosStateName, VosStateName[]> = {
    GATE_IN: ['INSPECTION', 'ESTIMATION'],
    INSPECTION: ['ESTIMATION'],
    ESTIMATION: ['APPROVAL_PENDING', 'WORK_IN_PROGRESS'],
    APPROVAL_PENDING: ['WORK_IN_PROGRESS'],
    WORK_IN_PROGRESS: ['QUALITY_CHECK'],
    QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'], // Re-work allowed back to WIP
    READY_FOR_DELIVERY: ['GATE_OUT'],
    GATE_OUT: ['CLOSED'],
    CLOSED: [] // Terminal state
  };

  public static isTransitionAllowed(fromState: VosStateName, toState: VosStateName): boolean {
    const allowed = VosStateMachine.TRANSITION_GRAPH[fromState];
    return Array.isArray(allowed) && allowed.includes(toState);
  }

  public static getStateCode(stateName: VosStateName): VosStateCode {
    const def = VosStateMachine.STATES[stateName];
    if (!def) {
      throw new Error(`[VosStateMachine] Unknown state name: ${stateName}`);
    }
    return def.code;
  }
}
