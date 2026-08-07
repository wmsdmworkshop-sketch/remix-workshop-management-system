/**
 * FsbCampaign DTO — standalone (does not extend ProgramDefinition to avoid incompatibility).
 * FSB (Field Service Bulletin) Campaign domain-specific data.
 */
export interface FsbCampaign {
  campaign_number: string;
  fsb_number: string;
  oem_reference: string;
  campaign_type: string;
  campaign_category: string;
  priority: string;
  description: string;
  issue_summary: string;
  corrective_action: string;
  effective_date: string;
  expiry_date: string;
  lob: string[];
  model: string[];
  engine: string[];
  aggregate: string[];
  status: string; // DRAFT, ACTIVE, SUSPENDED, CLOSED, CANCELLED
  
  // AI Readiness
  ai_priority?: string;
  risk_score?: number;
  completion_forecast?: number;
  predicted_delay?: number;
  suggested_escalation?: string;
}
