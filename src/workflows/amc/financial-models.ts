import { FinancialProfile } from "../common/financial-profile";

export interface AmcFinancialProfile extends FinancialProfile {
  customer_pay: number;
  dealer_cost: number;
  oem_recovery: number;
  internal_cost: number;
  remaining_contract_value: number;
}
