/**
 * InsurancePolicy DTO — does NOT extend ProgramDefinition to avoid incompatibility.
 * Contains only Insurance-domain-specific fields.
 * When creating a BusinessCase from an InsurancePolicy, use a mapper function.
 */
export interface InsurancePolicy {
  policy_number: string;
  insurer: string;
  policy_type: string;
  coverage_type: string;
  effective_date: string;
  expiry_date: string;
  vehicle_vin: string;
  registration_number: string;
  branch_id: string;
  customer_id: string;
  fleet_id?: string;
  status: string;
  premium_amount: number;
  deductible_amount: number;
  coverage_limit: number;
  
  // AI Readiness
  ai_coverage_recommendation?: string;
  ai_renewal_probability?: number;
  ai_pricing_recommendation?: number;
  confidence_score?: number;
}
