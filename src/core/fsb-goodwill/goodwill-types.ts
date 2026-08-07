export type GoodwillCategory = "DEALER" | "OEM" | "POLICY";
export type GoodwillItemType = "PARTS" | "LABOUR" | "CONSUMABLES" | "SUBLET";
export type GoodwillWorkflowState = 
  | "DRAFT" 
  | "TECH_REVIEW" 
  | "SM_REVIEW" 
  | "GM_APPROVAL" 
  | "OEM_APPROVAL" 
  | "SETTLEMENT" 
  | "CLOSED" 
  | "REJECTED";

export type GoodwillDecision = "APPROVED" | "PARTIAL_APPROVAL" | "REJECTED" | "MANAGEMENT_REVIEW_REQUIRED";

export interface GoodwillRecommendationMetadata {
  decision: GoodwillDecision;
  confidence_score: number;
  factors: string[];
  recommended_oem_share?: number;
  recommended_dealer_share?: number;
  recommended_customer_share?: number;
}

export interface GoodwillRequest {
  request_id: string;
  vin: string;
  customer_id?: string;
  job_id?: number;
  reason?: string;
  category: GoodwillCategory;
  requested_amount: number;
  dealer_share_pct: number;
  dealer_share_limit?: number;
  oem_share_pct: number;
  oem_share_limit?: number;
  customer_share_pct: number;
  workflow_state: GoodwillWorkflowState;
}

export interface GoodwillLine {
  line_id: string;
  request_id: string;
  item_type: GoodwillItemType;
  requested_amount: number;
  approved_amount?: number;
  rejected_amount?: number;
  reason?: string;
}

export interface CostSharingResult {
  dealer_cost: number;
  oem_cost: number;
  customer_cost: number;
  total_approved: number;
}
