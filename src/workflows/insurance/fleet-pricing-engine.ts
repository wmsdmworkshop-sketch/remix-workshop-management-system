import { FleetPricingModel } from "./fleet-pricing-models";
import { FleetPricingRules } from "./pricing-rules";

export class FleetPricingEngine {
  static calculatePricingModel(contractId: string, vehicleCount: number): FleetPricingModel {
    let partsDiscount = 0;
    
    // Find highest applicable volume discount
    for (const tier of [...FleetPricingRules.VOLUME_DISCOUNT_TIERS].reverse()) {
      if (vehicleCount >= tier.min_vehicles) {
        partsDiscount = tier.discount_percent;
        break;
      }
    }
    
    let labourDiscount = partsDiscount; // Base on same tier for simplicity
    if (labourDiscount > FleetPricingRules.MAX_LABOUR_RATE_DISCOUNT) {
      labourDiscount = FleetPricingRules.MAX_LABOUR_RATE_DISCOUNT;
    }
    if (partsDiscount > FleetPricingRules.MAX_PARTS_DISCOUNT) {
      partsDiscount = FleetPricingRules.MAX_PARTS_DISCOUNT;
    }

    return {
      contract_id: contractId,
      labour_rate_discount: labourDiscount,
      parts_discount: partsDiscount
    };
  }
}
