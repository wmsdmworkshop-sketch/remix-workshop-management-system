export interface ProgramMetadata {
  dealer_code?: string;
  dealer_id?: string;
  branch_code?: string;
  workshop_code?: string;
  lob?: string;
  business_unit?: string;
  region?: string;
  country?: string;
  tenant_id?: string;
  correlation_id?: string;
  request_id?: string;
  source_system?: string;
  integration_source?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk?: "LOW" | "MEDIUM" | "HIGH";
  sla_target_date?: string;
  tags: string[];
  created_by: string;
  updated_by: string;
}
