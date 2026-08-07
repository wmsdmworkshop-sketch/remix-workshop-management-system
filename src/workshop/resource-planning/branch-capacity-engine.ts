import { Branch } from "./branch-models";

export class BranchCapacityEngine {
  static getWorkingHours(branch: Branch): number {
    const start = parseInt(branch.working_hours.start.split(":")[0], 10);
    const end = parseInt(branch.working_hours.end.split(":")[0], 10);
    return end - start;
  }

  static isOperational(branch: Branch, date: string): boolean {
    if (branch.operational_status !== "OPEN") return false;
    
    // Simplification for weekly off check
    const dayOfWeek = new Date(date).getDay(); 
    if (branch.weekly_off === "SUNDAY" && dayOfWeek === 0) return false;
    
    return true;
  }
}
