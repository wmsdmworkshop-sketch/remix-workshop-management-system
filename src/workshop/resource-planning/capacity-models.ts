export interface CapacityPlan {
  plan_id: string;
  workshop_id: string;
  date: string; // YYYY-MM-DD
  
  daily_capacity_hours: number;
  booked_capacity_hours: number;
  available_capacity_hours: number;
  
  weekly_capacity_hours?: number;
  monthly_capacity_hours?: number;
  
  future_capacity_projections?: Record<string, number>;
  
  ai_capacity_prediction?: number;
}
