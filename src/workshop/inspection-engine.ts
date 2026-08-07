import { Inspection } from "./inspection-models";
import { JobCard } from "./jobcard-models";

export class InspectionEngine {
  static createInspection(jobCardId: string, vehicleRegistration: string, advisorId: string): Inspection {
    return {
      inspection_id: `INSP-${Math.floor(Math.random() * 10000)}`,
      job_card_id: jobCardId,
      vehicle_registration: vehicleRegistration,
      advisor_id: advisorId,
      inspection_time: new Date().toISOString(),
      visual_inspection: {
        tyres: "OK", battery: "OK", lights: "OK", fluid_levels: "OK", 
        leaks: "NONE", brakes: "OK", suspension: "OK", electrical: "OK", body: "OK"
      },
      photos: [],
      videos: [],
      customer_approval: false,
      status: "PENDING"
    };
  }

  static completeInspection(inspection: Inspection): Inspection {
    return { ...inspection, status: "COMPLETED" };
  }
}
