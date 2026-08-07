import { InsuranceCoverageValidation } from "./coverage-models";
import { InsuranceFinancialProfile } from "./financial-models";

export class InsuranceSettlementEngine {
  static calculateSettlement(totalCost: number, coverage: InsuranceCoverageValidation): InsuranceFinancialProfile {
    const customerContribution = (totalCost * coverage.customer_liability) / 100;
    const insurerSettlement = totalCost - customerContribution;
    const taxAmount = totalCost * 0.1; // Mock 10% tax

    return {
      // FinancialProfile base fields
      labour_cost: totalCost * 0.6,
      parts_cost: totalCost * 0.3,
      consumables: totalCost * 0.1,
      tax: taxAmount,
      discount: 0,
      claim_value: totalCost,
      approved_value: insurerSettlement,
      rejected_value: 0,
      recovered_value: insurerSettlement,
      recovery_percentage: coverage.customer_liability ? (100 - coverage.customer_liability) : 100,
      settlement_value: insurerSettlement,
      debit: 0,
      credit: insurerSettlement,
      write_off: 0,
      internal_labour: totalCost * 0.6,
      external_labour: 0,
      internal_parts: totalCost * 0.3,
      external_parts: 0,
      currency: "INR",
      financial_status: "PENDING_SETTLEMENT",
      // InsuranceFinancialProfile-specific fields
      total_repair_cost: totalCost,
      insurer_settlement: insurerSettlement,
      dealer_settlement: 0,
      customer_contribution: customerContribution,
      oem_contribution: 0,
      vendor_contribution: 0,
      tax_amount: taxAmount,
      recovery_amount: insurerSettlement,
      write_off_amount: 0,
    };
  }
}
