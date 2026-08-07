export interface FsbCampaignRegisterReport {
  campaign_number: string;
  fsb_number: string;
  campaign_type: string;
  priority: string;
  status: string;
  effective_date: string;
  expiry_date: string;
}

export interface FsbVehicleEligibilityReport {
  campaign_id: string;
  total_eligible: number;
  total_completed: number;
  total_pending: number;
  total_rejected: number;
}

export interface FsbCompletionReport {
  campaign_id: string;
  completed_vins: string[];
  total_labour_hours: number;
  total_parts_cost: number;
}

export interface FsbComplianceReport {
  entity_id: string; // Dealer ID or Branch ID or OEM
  entity_type: string;
  coverage_percent: number;
  outstanding_vehicles: number;
}

export interface FsbClaimRegisterReport {
  campaign_id: string;
  total_claims_submitted: number;
  total_claims_approved: number;
  total_claims_rejected: number;
  recovery_amount: number;
}
