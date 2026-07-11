/**
 * =============================================================================
 * WOS Core Architecture: EscalationEngine Interface
 * Bounded Context: Core System / SLA Breach Management
 * Description: Manages multi-level notification escalations for job cards
 *              approaching or exceeding target SLA limits.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface EscalationRule {
  state: string;
  minutesThreshold: number;
  escalateToRole: string;
  templateCode: string;
  level: number;
}

export interface IEscalationEngine {
  readonly eventBus: IEventBus;

  /**
   * Evaluates active job card stages and executes level-based escalations
   * if occupancy parameters violate the SLA threshold limits.
   */
  evaluateEscalation(jobId: number, correlationId: string): Promise<void>;

  /**
   * Registers a new hierarchical escalation rule.
   */
  registerRule(rule: EscalationRule, correlationId: string): Promise<void>;
}
