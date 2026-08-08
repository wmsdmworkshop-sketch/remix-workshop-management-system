import { BreakdownLocation } from "./location-models";
import { integrationRegistry } from "../../integrations";

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

  static async updateQrtLocation(technicianId: string, location: BreakdownLocation): Promise<void> {
    try {
      if (integrationRegistry.hasConnector('QRT_EXTERNAL')) {
        const qrtConnector = integrationRegistry.getConnector('QRT_EXTERNAL');
        if (qrtConnector.qrtService) {
          await qrtConnector.qrtService.updateLocation(location.latitude, location.longitude, technicianId);
          console.log(`[BreakdownGpsEngine] Synced location for tech ${technicianId} with external QRT API`);
        }
      }
    } catch (err) {
      console.error(`[BreakdownGpsEngine] Failed to sync location for tech ${technicianId}`, err);
    }
  }
}
