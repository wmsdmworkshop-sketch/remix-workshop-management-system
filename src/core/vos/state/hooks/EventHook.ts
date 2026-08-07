/**
 * DWIP Enterprise WOS - EventHook (State Engine Event Integration Hook)
 * Integrates State Engine with Timeline Engine
 */

import { TransitionResult } from '../types';
import { vosTimelineEngine } from '../../timeline/VosTimelineEngine';

export class EventHook {
  public async onTransitionCompleted(result: TransitionResult): Promise<void> {
    try {
      await vosTimelineEngine.recordStateTransitionEvent(result);
    } catch (err) {
      // Non-blocking log for timeline integration failure
    }
  }
}

export const eventHook = new EventHook();
