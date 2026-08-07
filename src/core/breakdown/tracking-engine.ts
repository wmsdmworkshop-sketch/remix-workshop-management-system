import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { GeoLocation } from "./breakdown-types";

export class TrackingEngine {
  
  /**
   * Appends telemetry log for QRT/Mobile Van
   */
  public static async logTracking(
    dispatchId: string,
    location: GeoLocation,
    speedKmh?: number,
    distanceRemaining?: number,
    etaMinutes?: number
  ): Promise<void> {
    
    await db.execute(
      "INSERT INTO tbl_breakdown_tracking (tracking_id, dispatch_id, latitude, longitude, speed_kmh, distance_remaining_km, eta_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [`TRK-${randomUUID().substring(0,8)}`, dispatchId, location.latitude, location.longitude, speedKmh || null, distanceRemaining || null, etaMinutes || null]
    );
  }

  /**
   * Audits a major geographical event for the breakdown (e.g., Technician arrived at site)
   */
  public static async createGeoSnapshot(
    caseId: string,
    eventType: string,
    location: GeoLocation
  ): Promise<void> {
    
    await db.execute(
      "INSERT INTO tbl_breakdown_geo_snapshot (snapshot_id, case_id, event_type, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      [`GS-${randomUUID().substring(0,8)}`, caseId, eventType, location.latitude, location.longitude]
    );
  }
}
