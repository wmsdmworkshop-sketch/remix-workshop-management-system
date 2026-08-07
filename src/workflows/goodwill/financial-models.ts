import { FinancialProfile } from "../common/financial-profile";

export interface GoodwillFinancialProfile extends FinancialProfile {
  total_labour_cost: number;
  total_parts_cost: number;
  total_consumables: number;
  total_taxes: number;
  
  dealer_contribution: number;
  oem_contribution: number;
  customer_contribution: number;
  vendor_contribution: number;
  insurance_contribution: number;
  
  net_dealer_cost: number;
  write_off_value: number;
}
