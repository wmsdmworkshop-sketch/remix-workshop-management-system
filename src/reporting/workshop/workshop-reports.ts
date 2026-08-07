export interface GateEntryReport {
  gate_entry_id: string;
  vehicle_registration: string;
  entry_time: string;
  purpose: string;
}

export interface InspectionReport {
  inspection_id: string;
  job_card_id: string;
  inspection_time: string;
  status: string;
}

export interface JobCardRegisterReport {
  job_card_number: string;
  vehicle_registration: string;
  customer_name: string;
  category: string;
  current_status: string;
}

export interface EstimateReport {
  estimate_id: string;
  job_card_id: string;
  total_amount: number;
  approval_status: string;
}

export interface ApprovalReport {
  approval_id: string;
  job_card_id: string;
  status: string;
}

export interface BayUtilizationReport {
  bay_id: string;
  utilization_percent: number;
}

export interface TechnicianProductivityReport {
  technician_id: string;
  productivity_percent: number;
}

export interface LabourAnalysisReport {
  job_card_id: string;
  labour_estimate: number;
  labour_actual: number;
}

export interface PartsConsumptionReport {
  job_card_id: string;
  part_number: string;
  quantity: number;
}

export interface QcReport {
  qc_id: string;
  job_card_id: string;
  status: string;
}

export interface RoadTestReport {
  road_test_id: string;
  job_card_id: string;
  status: string;
}

export interface VehicleDeliveryReport {
  delivery_id: string;
  job_card_id: string;
  delivery_time: string;
}

export interface CustomerFeedbackReport {
  feedback_id: string;
  job_card_id: string;
  nps: number;
}

export interface RevenueReport {
  job_card_id: string;
  net_revenue: number;
}
