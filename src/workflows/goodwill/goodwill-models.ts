import { ProgramDefinition } from "../common/program-definition";

export interface GoodwillRequest extends ProgramDefinition {
  request_number: string;
  vehicle_vin: string;
  vehicle_registration: string;
  customer_id: string;
  dealer_id: string;
  branch_id: string;
  workshop_id: string;
  complaint: string;
  failure_description: string;
  requested_by: string;
  requested_date: string;
  priority: string;
  risk_level: string;
  reason_code: string;
  goodwill_type: string;
  linked_programs: LinkedProgramReference[];
  
  // AI Readiness
  ai_recommendation?: string;
  risk_score?: number;
  confidence_score?: number;
  suggested_split?: any;
  suggested_approval?: string;
  decision_explanation?: string;
}

export interface LinkedProgramReference {
  program_type: string; // Warranty, AMC, Campaign, etc.
  reference_id: string;
}
