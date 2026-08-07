import { ScheduleEvent } from "./scheduler-models";

export class SchedulerEngine {
  static createEvent(resourceType: string, resourceId: string, jobId: string, startTime: string, endTime: string): ScheduleEvent {
    return {
      event_id: `EVT-${Math.floor(Math.random() * 10000)}`,
      resource_type: resourceType,
      resource_id: resourceId,
      job_card_id: jobId,
      start_time: startTime,
      end_time: endTime,
      status: "SCHEDULED"
    };
  }

  static detectOverlap(event1: ScheduleEvent, event2: ScheduleEvent): boolean {
    if (event1.resource_id !== event2.resource_id) return false;
    
    const start1 = new Date(event1.start_time).getTime();
    const end1 = new Date(event1.end_time).getTime();
    const start2 = new Date(event2.start_time).getTime();
    const end2 = new Date(event2.end_time).getTime();
    
    return start1 < end2 && start2 < end1;
  }
}
