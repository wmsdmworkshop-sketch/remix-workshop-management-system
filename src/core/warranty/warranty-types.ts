export type WarrantyOperationType = "Warranty" | "AMC" | "FSB" | "Goodwill" | "Campaign" | "Recall" | "PolicyException";

export type ClaimLineType = "PARTS" | "LABOUR" | "SUBLET";

export type WarrantyClaimState = 
  | "CLAIM_CREATED"
  | "TECHNICAL_VERIFICATION"
  | "PARTS_VALIDATION"
  | "LABOUR_VALIDATION"
  | "MANAGER_APPROVAL_PENDING"
  | "OEM_SUBMISSION_READY"
  | "OEM_SUBMITTED"
  | "OEM_APPROVED"
  | "OEM_REJECTED"
  | "SETTLEMENT_PENDING"
  | "CLOSED";

export interface ClaimHeader {
  claim_id: string;
  job_id: number;
  vin: string;
  operation_type: WarrantyOperationType;
  workflow_state: WarrantyClaimState;
  total_claimed_amount: number;
  total_approved_amount?: number;
  oem_claim_reference?: string;
}

export interface ClaimLine {
  line_id: string;
  claim_id: string;
  line_type: ClaimLineType;
  item_code: string;
  quantity: number;
  unit_price: number;
  claimed_amount: number;
  approved_amount?: number;
  rejection_reason?: string;
}

export interface WarrantyCoverageRule {
  rule_id: string;
  operation_type: WarrantyOperationType;
  min_age_months: number;
  max_age_months?: number;
  min_mileage: number;
  max_mileage?: number;
  is_active: number;
}
