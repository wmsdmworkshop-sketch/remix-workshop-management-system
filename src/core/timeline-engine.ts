/**
 * =============================================================================
 * WOS Core Architecture: TimelineEngine Interface
 * Bounded Context: Core System / Visual Timelines & History
 * Description: Computes complete unified chronological history records for Job Cards
 *              incorporating transitions, checklists, and decisions.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: "TRANSITION" | "QC_CHECK" | "DECISION" | "NOTIFICATION";
  actorName: string;
  actorRole: string;
  summary: string;
  payload: Record<string, any>;
}

export interface ITimelineEngine {
  readonly eventBus: IEventBus;

  /**
   * Generates a sorted list of timeline events for a specific job card.
   */
  getJobTimeline(jobId: number, correlationId: string): Promise<TimelineEvent[]>;
}
