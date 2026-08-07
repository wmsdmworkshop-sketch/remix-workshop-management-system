export interface FleetServiceEvent {
  contract_id: string;
  vin: string;
  job_card_id: string;
  service_date: string;
  current_km: number;
  covered_amount: number;
  customer_payable: number;
}
