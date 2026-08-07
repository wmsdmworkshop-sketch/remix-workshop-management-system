import { FinancialProfile } from "../common/financial-profile";

export interface FsbFinancialProfile extends FinancialProfile {
  total_parts_cost: number;
  total_labour_cost: number;
  
  recovery_amount: number;
  recovery_percent: number;
  
  oem_liability: number;
  dealer_liability: number;
  customer_liability: number;
  
  campaign_total_cost: number;
  settlement_status: string; // PENDING, PARTIAL, SETTLED
}
