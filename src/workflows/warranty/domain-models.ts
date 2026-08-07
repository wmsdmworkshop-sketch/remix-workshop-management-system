import { ProgramDefinition } from "../common/program-definition";

export interface WarrantyCase extends ProgramDefinition {
  claim_header: WarrantyClaimHeader;
  complaint: WarrantyComplaint;
  failure_analysis: WarrantyFailureAnalysis;
  inspection: WarrantyInspection;
  labour: WarrantyLabour[];
  parts: WarrantyPart[];
  attachments: WarrantyAttachment[];
  evidence_references: WarrantyEvidenceReference[];
  policy_snapshot: WarrantyPolicySnapshot;
  
  // Warranty-specific entities that may or may not map perfectly to financial profile
  rejections: WarrantyRejection[];
  exceptions: WarrantyException[];
  communications: WarrantyCommunication[];
  provider_responses: WarrantyProviderResponse[];
}

export interface WarrantyClaimHeader {
  claim_number: string;
  claim_type: string;
  warranty_type: string;
  vehicle_vin: string;
  odometer: number;
  engine_hours: number;
  repair_date: string;
}

export interface WarrantyComplaint {
  complaint_code: string;
  description: string;
  customer_statement: string;
}

export interface WarrantyFailureAnalysis {
  failure_code: string;
  technician_findings: string;
  dtc_codes: string[];
}

export interface WarrantyInspection {
  inspection_date: string;
  inspector_id: string;
  notes: string;
}

export interface WarrantyLabour {
  labour_code: string;
  category: string;
  hours: number;
  rate: number;
  total: number;
}

export interface WarrantyPart {
  part_number: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface WarrantyAttachment {
  attachment_id: string;
  file_url: string;
  description: string;
}

export interface WarrantyEvidenceReference {
  evidence_id: string;
  evidence_type: string;
}

export interface WarrantyPolicySnapshot {
  policy_version: string;
  applied_rules: any[];
}

export interface WarrantyRejection {
  rejection_id: string;
  reason_code: string;
  description: string;
  date: string;
}

export interface WarrantyException {
  exception_id: string;
  description: string;
  date: string;
}

export interface WarrantyCommunication {
  communication_id: string;
  message: string;
  sender: string;
  timestamp: string;
}

export interface WarrantyProviderResponse {
  response_id: string;
  oem_status: string;
  message: string;
  timestamp: string;
}
