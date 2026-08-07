import { BayCapacity } from "./bay-capacity-models";

export class BayCapacityEngine {
  static calculateAvailability(bayCapacity: BayCapacity): number {
    return bayCapacity.total_bays - (bayCapacity.occupied + bayCapacity.reserved + bayCapacity.maintenance);
  }

  static updateOccupancy(bayCapacity: BayCapacity, delta: number): BayCapacity {
    return {
      ...bayCapacity,
      occupied: bayCapacity.occupied + delta,
      available: bayCapacity.total_bays - (bayCapacity.occupied + delta + bayCapacity.reserved + bayCapacity.maintenance)
    };
  }
}
