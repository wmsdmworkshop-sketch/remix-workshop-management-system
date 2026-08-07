import { Technician } from "./technician-models";

export class TechnicianAssignmentEngine {
  static assignJob(technician: Technician, jobCardId: string): Technician {
    if (technician.attendance !== "PRESENT") {
      throw new Error("Technician is not present");
    }
    return { ...technician, current_jobs: [...technician.current_jobs, jobCardId] };
  }

  static releaseJob(technician: Technician, jobCardId: string): Technician {
    return { ...technician, current_jobs: technician.current_jobs.filter(id => id !== jobCardId) };
  }
}
