export interface GateEntry {
  gate_entry_id: string;
  vehicle_registration: string;
  entry_time: string;
  security_guard_id: string;
  driver_name: string;
  driver_phone: string;
  purpose: string; // SERVICE, ACCIDENT, BREAKDOWN, DELIVERY
  status: string; // ENTERED, RECEPTION, WORKSHOP, EXITED
  ai_delay_prediction?: number;
}
