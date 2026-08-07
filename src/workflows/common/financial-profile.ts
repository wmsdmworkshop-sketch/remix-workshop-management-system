export interface FinancialProfile {
  labour_cost: number;
  parts_cost: number;
  consumables: number;
  tax: number;
  discount: number;
  claim_value: number;
  approved_value: number;
  rejected_value: number;
  recovered_value: number;
  recovery_percentage: number;
  settlement_value: number;
  debit: number;
  credit: number;
  write_off: number;
  internal_labour: number;
  external_labour: number;
  internal_parts: number;
  external_parts: number;
  currency: string;
  financial_status: string;
}
