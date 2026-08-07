import { TechnicianCapacity } from "./technician-capacity-models";

export class TechnicianCapacityEngine {
  static calculateUtilization(technician: TechnicianCapacity, maxJobsPerShift: number): number {
    if (technician.attendance !== "PRESENT") return 0;
    
    const activeJobs = technician.current_jobs.length;
    return (activeJobs / maxJobsPerShift) * 100;
  }

  static canAssignJob(technician: TechnicianCapacity, vehicleFamily: string, maxJobsPerShift: number): boolean {
    if (technician.attendance !== "PRESENT") return false;
    if (technician.current_jobs.length >= maxJobsPerShift) return false;
    if (!technician.vehicle_family_skills.includes(vehicleFamily)) return false;
    
    return true;
  }
}
