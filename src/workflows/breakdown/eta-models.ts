export interface BreakdownEta {
  incident_id: string;
  travel_time_mins: number;
  distance_km: number;
  expected_arrival: string;
  delay_mins: number;
  sla_remaining_mins: number;
  sla_breached: boolean;
  
  ai_eta_prediction?: string;
}
