import { FinancialProfile } from "../common/financial-profile";

export interface InsuranceFinancialProfile extends FinancialProfile {
  claim_id?: string;
  total_repair_cost: number;
  
  insurer_settlement: number;
  dealer_settlement: number;
  customer_contribution: number;
  oem_contribution: number;
  vendor_contribution: number;
  
  tax_amount: number;
  recovery_amount: number;
  write_off_amount: number;
}
