import { BreakdownLocation } from "./location-models";

export class BreakdownGpsEngine {
  static calculateDistance(loc1: BreakdownLocation, loc2: BreakdownLocation): number {
    // Mock Haversine distance
    const dx = loc1.latitude - loc2.latitude;
    const dy = loc1.longitude - loc2.longitude;
    return Math.sqrt(dx * dx + dy * dy) * 111; // Rough approximation in km
  }

  static findNearestQrt(incidentLoc: BreakdownLocation, availableQrts: any[]): string | undefined {
    // Mock logic
    if (availableQrts.length > 0) return availableQrts[0].qrt_id;
    return undefined;
  }
}
