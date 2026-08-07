import { FinancialProfile } from "../common/financial-profile";

export interface BreakdownFinancialProfile extends FinancialProfile {
  roadside_charges: number;
  tow_charges: number;
  labour_cost: number;
  parts_cost: number;
  
  insurance_recovery_amount: number;
  oem_recovery_amount: number;
  dealer_cost: number;
  customer_cost: number;
}
