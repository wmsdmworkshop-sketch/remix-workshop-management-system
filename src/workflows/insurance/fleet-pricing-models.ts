export interface FleetPricingModel {
  contract_id: string;
  labour_rate_discount: number;
  parts_discount: number;
  flat_labour_rate?: number;
}
