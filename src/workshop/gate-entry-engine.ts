import { GateEntry } from "./gate-entry-models";
import { Reception } from "./reception-models";

export class GateEntryEngine {
  static createEntry(registration: string, guardId: string, driverName: string, driverPhone: string, purpose: string): GateEntry {
    return {
      gate_entry_id: `GE-${Math.floor(Math.random() * 10000)}`,
      vehicle_registration: registration,
      entry_time: new Date().toISOString(),
      security_guard_id: guardId,
      driver_name: driverName,
      driver_phone: driverPhone,
      purpose,
      status: "ENTERED"
    };
  }

  static createReception(gateEntry: GateEntry, customerName: string, receptionistId: string): Reception {
    return {
      reception_id: `REC-${Math.floor(Math.random() * 10000)}`,
      gate_entry_id: gateEntry.gate_entry_id,
      vehicle_registration: gateEntry.vehicle_registration,
      customer_name: customerName,
      receptionist_id: receptionistId,
      reception_time: new Date().toISOString(),
      token_number: `T-${Math.floor(Math.random() * 100)}`,
      waiting_area: true,
      status: "WAITING"
    };
  }
}
