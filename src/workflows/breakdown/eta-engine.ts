import { BreakdownEta } from "./eta-models";
import { SlaRules } from "./sla-rules";

export class BreakdownEtaEngine {
  static calculateEta(incidentId: string, distanceKm: number, isHighway: boolean): BreakdownEta {
    // Mock speed: Urban = 30km/h, Highway = 60km/h
    const speed = isHighway ? 60 : 30;
    const travelTimeMins = (distanceKm / speed) * 60;
    
    const maxEta = isHighway ? SlaRules.MAX_ETA_MINS_HIGHWAY : SlaRules.MAX_ETA_MINS_URBAN;
    
    const now = new Date();
    const expected = new Date(now.getTime() + travelTimeMins * 60000);

    return {
      incident_id: incidentId,
      travel_time_mins: travelTimeMins,
      distance_km: distanceKm,
      expected_arrival: expected.toISOString(),
      delay_mins: 0,
      sla_remaining_mins: maxEta - travelTimeMins,
      sla_breached: travelTimeMins > maxEta
    };
  }
}
