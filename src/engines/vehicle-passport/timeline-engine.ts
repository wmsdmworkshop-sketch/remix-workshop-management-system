import { pool as db } from "../../db/index.ts";
import crypto from "crypto";
import type { VehicleEvent, EventType, VerificationLevel } from "./types.ts";

export class TimelineEngine {
  /**
   * Appends a lifetime history event.
   */
  async appendEvent(params: {
    passportId: string;
    eventType: EventType;
    eventSource: "MANUAL" | "SYSTEM" | "MOBILE" | "API" | "AI";
    eventDate: string;
    odometerKm: number;
    description: string;
    verificationLevel: VerificationLevel;
    verifiedBy: string;
    dealerId?: string;
    branchId?: string;
    aiAnalysis?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<VehicleEvent> {
    const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const formattedDate = new Date(params.eventDate).toISOString().slice(0, 19).replace('T', ' ');

    const event: VehicleEvent = {
      eventId,
      passportId: params.passportId,
      eventType: params.eventType,
      eventSource: params.eventSource,
      eventDate: formattedDate,
      odometerKm: params.odometerKm,
      description: params.description,
      verificationLevel: params.verificationLevel,
      verifiedBy: params.verifiedBy,
      dealerId: params.dealerId,
      branchId: params.branchId,
      aiAnalysis: params.aiAnalysis,
      metadata: params.metadata,
      createdAt: now,
    };

    await db.execute(
      `INSERT INTO vehicle_events (
        event_id, passport_id, event_type, event_source, event_date, odometer_km,
        description, verification_level, verified_by, dealer_id, branch_id, ai_analysis, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.eventId, event.passportId, event.eventType, event.eventSource,
        formattedDate, event.odometerKm, event.description, event.verificationLevel,
        event.verifiedBy, event.dealerId || null, event.branchId || null,
        event.aiAnalysis ? JSON.stringify(event.aiAnalysis) : null,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]
    );

    return event;
  }

  /**
   * Gets all historical events of a vehicle passport.
   */
  async getEvents(passportId: string): Promise<VehicleEvent[]> {
    const [rows] = await db.query(
      "SELECT * FROM vehicle_events WHERE passport_id = ? ORDER BY event_date DESC, created_at DESC",
      [passportId]
    ) as any[];

    if (!rows) return [];
    return rows.map((row: any) => this.mapRowToEvent(row));
  }

  private mapRowToEvent(row: any): VehicleEvent {
    let aiAnalysis: Record<string, any> = {};
    let metadata: Record<string, any> = {};
    try {
      if (row.ai_analysis) aiAnalysis = typeof row.ai_analysis === "string" ? JSON.parse(row.ai_analysis) : row.ai_analysis;
      if (row.metadata) metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
    } catch {}

    return {
      eventId: row.event_id,
      passportId: row.passport_id,
      eventType: row.event_type as EventType,
      eventSource: row.event_source as any,
      eventDate: row.event_date,
      odometerKm: row.odometer_km,
      description: row.description,
      verificationLevel: row.verification_level as VerificationLevel,
      verifiedBy: row.verified_by,
      dealerId: row.dealer_id || undefined,
      branchId: row.branch_id || undefined,
      aiAnalysis,
      metadata,
      createdAt: row.created_at,
    };
  }
}
