export interface FleetDashboardData {
  total_fleet_contracts: number;
  active_fleet_contracts: number;
  expired_fleet_contracts: number;
  
  total_fleet_vehicles: number;
  active_fleet_vehicles: number;
  
  fleet_revenue: number;
  fleet_utilization_percent: number;
  renewal_percent: number;
  
  top_customers_by_revenue: Record<string, number>;
}
