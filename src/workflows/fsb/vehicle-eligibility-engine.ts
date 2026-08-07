import { FsbCampaign } from "./campaign-models";
import { FsbVehicleTarget } from "./vehicle-models";
import { FsbVehicleStatus } from "./constants";

export class FsbVehicleEligibilityEngine {
  static evaluate(campaign: FsbCampaign, vehicle: FsbVehicleTarget): string {
    const now = new Date();
    const expiry = new Date(campaign.expiry_date);
    
    if (now > expiry) {
      return FsbVehicleStatus.EXPIRED;
    }

    if (vehicle.eligibility_status === FsbVehicleStatus.ALREADY_COMPLETED) {
      return FsbVehicleStatus.ALREADY_COMPLETED;
    }

    if (!campaign.model.includes(vehicle.model)) {
      return FsbVehicleStatus.REJECTED;
    }

    return FsbVehicleStatus.ELIGIBLE;
  }
}
