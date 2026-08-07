import { BreakdownIncident } from "./incident-models";
import { BreakdownIncidentStatus } from "./constants";

export class BreakdownClosureEngine {
  static canClose(incident: BreakdownIncident): boolean {
    // Basic logic
    return incident.status === BreakdownIncidentStatus.AT_WORKSHOP || incident.status === BreakdownIncidentStatus.REPAIRING || incident.status === "DELIVERED";
  }

  static closeIncident(incident: BreakdownIncident): BreakdownIncident {
    return { ...incident, status: BreakdownIncidentStatus.CLOSED };
  }
}
