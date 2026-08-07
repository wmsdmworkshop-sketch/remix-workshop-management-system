import { pool as db } from "../../db/index";
import { WarrantyCoverageRule, WarrantyOperationType } from "./warranty-types";

export interface VehicleDetails {
  vin: string;
  ageMonths: number;
  mileage: number;
}

export class CoverageEngine {
  /**
   * Evaluates if a vehicle is eligible for a specific warranty operation type
   * based on coverage rules configured in the database.
   */
  public static async isVehicleEligible(
    operationType: WarrantyOperationType,
    vehicle: VehicleDetails
  ): Promise<{ eligible: boolean; reason?: string }> {
    
    // Exception bypass
    if (operationType === "PolicyException") {
      return { eligible: true };
    }

    const [rules] = await db.execute(
      "SELECT * FROM tbl_warranty_coverage_rules WHERE operation_type = ? AND is_active = 1",
      [operationType]
    ) as any[];

    if (!rules || rules.length === 0) {
      return { eligible: false, reason: `No active coverage rules found for ${operationType}` };
    }

    let isEligible = false;
    let fallbackReason = "";

    for (const rule of rules as WarrantyCoverageRule[]) {
      let ageValid = true;
      let mileageValid = true;

      if (vehicle.ageMonths < rule.min_age_months) ageValid = false;
      if (rule.max_age_months !== null && rule.max_age_months !== undefined && vehicle.ageMonths > rule.max_age_months) {
        ageValid = false;
      }

      if (vehicle.mileage < rule.min_mileage) mileageValid = false;
      if (rule.max_mileage !== null && rule.max_mileage !== undefined && vehicle.mileage > rule.max_mileage) {
        mileageValid = false;
      }

      if (ageValid && mileageValid) {
        isEligible = true;
        break;
      } else {
        fallbackReason = `Age (${vehicle.ageMonths}) or Mileage (${vehicle.mileage}) exceeds limits.`;
      }
    }

    return {
      eligible: isEligible,
      reason: isEligible ? undefined : fallbackReason
    };
  }

  public static async isPartEligible(
    operationType: WarrantyOperationType,
    itemCode: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    // In a full implementation, this would query a tbl_warranty_part_exclusions or similar.
    // For now, assume eligible unless it's a known consumable like "OIL" or "WIPER_BLADE" 
    // and the operation isn't AMC.
    const consumables = ["OIL", "WIPER_BLADE", "BRAKE_PADS"];
    if (consumables.includes(itemCode) && operationType !== "AMC" && operationType !== "PolicyException") {
      return { eligible: false, reason: "Consumables are not covered under standard warranty." };
    }
    return { eligible: true };
  }
}
