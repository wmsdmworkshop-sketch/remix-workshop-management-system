import { FleetContract } from "./fleet-contract-models";
import { FleetEligibilityStatus } from "./constants";

export class FleetEligibilityEngine {
  static evaluate(contract: FleetContract, vin: string, currentKm?: number): string {
    const now = new Date();
    const expiry = new Date(contract.expiry_date);

    if (contract.status === "INACTIVE") return FleetEligibilityStatus.INACTIVE;
    if (contract.status === "SUSPENDED") return FleetEligibilityStatus.SUSPENDED;

    if (now > expiry) {
      return FleetEligibilityStatus.EXPIRED;
    }

    if (!contract.vehicle_list.includes(vin)) {
      return FleetEligibilityStatus.MANUAL_REVIEW;
    }

    if (contract.km_limits && currentKm !== undefined && currentKm > contract.km_limits) {
      return FleetEligibilityStatus.EXCEEDED_LIMITS;
    }

    return FleetEligibilityStatus.ELIGIBLE;
  }
}
