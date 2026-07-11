/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timeline Renderer
 * Bounded Context: Core System / Timeline Platform
 * Description: Formats chronological lists of events into structured outputs.
 * =============================================================================
 */

import { TimelineEvent } from "./timeline-store";

export class TimelineRenderer {
  /**
   * Renders a human-readable text presentation of a job card timeline.
   */
  public static renderText(events: TimelineEvent[]): string {
    if (events.length === 0) return "No events found in timeline.";

    const lines = events.map((e) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `[${time}] [Engine: ${e.sourceEngine}] ${e.eventName} (Job #${e.jobCardId}) - Priority: ${e.priority || "LOW"}`;
    });

    return lines.join("\n");
  }
}
