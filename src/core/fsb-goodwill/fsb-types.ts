export type FsbCampaignType = "Safety" | "Emission" | "Quality" | "Software" | "Mechanical" | "Electrical";
export type FsbCampaignPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FsbEligibilityStatus = "ELIGIBLE" | "COMPLETED" | "EXPIRED" | "NOT_APPLICABLE";
export type FsbExecutionStatus = "STARTED" | "ATTEMPTED" | "COMPLETED" | "OEM_VERIFIED";

export interface FsbCampaign {
  campaign_id: string;
  oem_campaign_number?: string;
  campaign_name: string;
  campaign_type: FsbCampaignType;
  start_date: Date;
  end_date?: Date;
  priority: FsbCampaignPriority;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
}

export interface FsbVehicleEligibility {
  eligibility_id: string;
  campaign_id: string;
  vin: string;
  engine_number?: string;
  chassis_number?: string;
  eligibility_status: FsbEligibilityStatus;
  reason?: string;
  validated_date: Date;
}

export interface FsbExecution {
  execution_id: string;
  campaign_id: string;
  job_id: number;
  vin: string;
  technician_id?: string;
  workshop_id?: string;
  execution_status: FsbExecutionStatus;
  attempt_number: number;
  parts_used?: number;
  labour_used?: number;
  notes?: string;
}
