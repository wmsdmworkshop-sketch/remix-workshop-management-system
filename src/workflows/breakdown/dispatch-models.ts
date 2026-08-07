export interface BreakdownDispatch {
  incident_id: string;
  qrt_id?: string;
  tow_vendor_id?: string;
  dispatch_time?: string;
  expected_arrival_time?: string;
  status: string; // PENDING, DISPATCHED, ARRIVED
}
