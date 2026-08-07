import { Bay } from "./bay-models";

export class BayAllocationEngine {
  static allocateBay(bay: Bay, jobCardId: string): Bay {
    if (bay.status !== "IDLE") {
      throw new Error(`Bay ${bay.bay_id} is not idle`);
    }
    return { ...bay, status: "OCCUPIED", current_job_card_id: jobCardId };
  }

  static releaseBay(bay: Bay): Bay {
    return { ...bay, status: "IDLE", current_job_card_id: undefined, technician_id: undefined };
  }
}
