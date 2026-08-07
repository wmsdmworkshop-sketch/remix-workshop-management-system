import { BreakdownIncident } from "./incident-models";
import { BreakdownQrt } from "./qrt-models";
import { SlaRules } from "./sla-rules";

export class BreakdownSlaEngine {
  static evaluateResponseTime(incident: BreakdownIncident, qrt: BreakdownQrt): { breached: boolean; responseTimeMins: number } {
    if (!qrt.reached_time) return { breached: false, responseTimeMins: 0 };
    
    const start = new Date(incident.breakdown_time).getTime();
    const reached = new Date(qrt.reached_time).getTime();
    const diffMins = (reached - start) / 60000;
    
    // Simplification: In a real scenario we compare dispatch time vs reached time, or creation vs reached.
    return {
      breached: diffMins > SlaRules.MAX_RESPONSE_TIME_MINS,
      responseTimeMins: diffMins
    };
  }
}
