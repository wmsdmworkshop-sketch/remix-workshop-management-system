export interface CapacityReport {
  workshop_id: string;
  date: string;
  daily_capacity_hours: number;
  booked_capacity_hours: number;
}

export interface WorkshopUtilizationReport {
  workshop_id: string;
  date: string;
  utilization_percent: number;
}

export interface BayUtilizationReport {
  bay_id: string;
  utilization_percent: number;
}

export interface TechnicianUtilizationReport {
  technician_id: string;
  utilization_percent: number;
}

export interface AdvisorProductivityReport {
  advisor_id: string;
  revenue_generated: number;
}

export interface EquipmentUtilizationReport {
  equipment_id: string;
  utilization_percent: number;
}

export interface ForecastReport {
  workshop_id: string;
  date: string;
  expected_incoming_vehicles: number;
}

export interface ShiftReport {
  shift_id: string;
  technicians_assigned: number;
}

export interface LeaveReport {
  technician_id: string;
  leave_days: number;
}

export interface BottleneckReport {
  workshop_id: string;
  date: string;
  bay_shortage: boolean;
  technician_shortage: boolean;
}

export interface OptimizationReport {
  workshop_id: string;
  bay_allocation_score: number;
  technician_allocation_score: number;
}

export interface BranchLoadReport {
  branch_id: string;
  load_percent: number;
}
