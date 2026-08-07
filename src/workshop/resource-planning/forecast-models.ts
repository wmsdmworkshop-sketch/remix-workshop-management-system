export interface Forecast {
  forecast_id: string;
  workshop_id: string;
  target_date: string; // YYYY-MM-DD
  
  expected_incoming_vehicles: number;
  expected_labour_hours: number;
  expected_parts_consumption: number;
  expected_bay_occupancy: number;
  expected_revenue: number;
  expected_technician_load: number;
  
  ai_revenue_forecast?: number;
}
