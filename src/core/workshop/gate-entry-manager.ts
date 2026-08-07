import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { WorkshopTimelineEngine } from "./workshop-timeline-engine";

export class GateEntryManager {
  constructor(private eventBus: IEventBus) {}

  public async createGateEntry(
    vin: string,
    source: string,
    odometer: number,
    appointmentId?: string
  ): Promise<{ success: boolean; gateEntryId?: string }> {
    const gateEntryId = `GE-${randomUUID().substring(0, 8).toUpperCase()}`;

    await db.execute(
      "INSERT INTO tbl_gate_entry (gate_entry_id, vin, source, appointment_id, odometer, status) VALUES (?, ?, ?, ?, ?, ?)",
      [gateEntryId, vin, source, appointmentId || null, odometer, "ARRIVED"]
    );

    const context = makeSystemContext(`GE-CREATE-${gateEntryId}`);
    await this.eventBus.publish("GATE_ENTRY_CREATED", { gateEntryId, vin, source }, context);
    await WorkshopTimelineEngine.appendTimeline(gateEntryId, "GATE_ENTRY_CREATED", `Vehicle arrived at gate`);

    return { success: true, gateEntryId };
  }
}

export class AppointmentManager {
  constructor(private eventBus: IEventBus) {}

  public async createAppointment(
    vin: string,
    customerId: string,
    serviceType: string,
    preferredDate: Date
  ): Promise<{ success: boolean; appointmentId?: string }> {
    const appointmentId = `APP-${randomUUID().substring(0, 8).toUpperCase()}`;

    await db.execute(
      "INSERT INTO tbl_workshop_appointment (appointment_id, vin, customer_id, service_type, preferred_date, status) VALUES (?, ?, ?, ?, ?, ?)",
      [appointmentId, vin, customerId, serviceType, preferredDate, "SCHEDULED"]
    );

    const context = makeSystemContext(`APP-CREATE-${appointmentId}`);
    await this.eventBus.publish("APPOINTMENT_CREATED", { appointmentId, vin }, context);

    return { success: true, appointmentId };
  }
}
