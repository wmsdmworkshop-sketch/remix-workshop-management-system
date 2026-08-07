export interface Reception {
  reception_id: string;
  gate_entry_id: string;
  vehicle_registration: string;
  customer_name: string;
  receptionist_id: string;
  reception_time: string;
  token_number: string;
  waiting_area: boolean;
  status: string; // WAITING, ADVISOR_ASSIGNED
}
