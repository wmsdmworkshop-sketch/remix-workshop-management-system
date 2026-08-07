import { ProgramTimeline, TimelineEvent } from "../program-timeline";

export class TimelineHelper {
  static addEvent(timeline: ProgramTimeline, event: TimelineEvent): ProgramTimeline {
    return {
      ...timeline,
      events: [...timeline.events, event]
    };
  }

  static transitionStep(timeline: ProgramTimeline, newStep: string, timestamp: string): ProgramTimeline {
    return {
      ...timeline,
      previous_step: timeline.current_step,
      current_step: newStep
    };
  }

  static calculateElapsedMinutes(timeline: ProgramTimeline, currentTime: string): number {
    if (!timeline.created_at) return 0;
    const start = new Date(timeline.created_at).getTime();
    const end = new Date(currentTime).getTime();
    return Math.floor((end - start) / 60000);
  }
}
