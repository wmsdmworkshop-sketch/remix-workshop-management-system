import { FsbVehicleTarget } from "./vehicle-models";

export class FsbComplianceEngine {
  static calculateCoverage(totalVehicles: number, completedVehicles: number): number {
    if (totalVehicles === 0) return 0;
    return (completedVehicles / totalVehicles) * 100;
  }

  static evaluateBranchCompliance(vehicles: FsbVehicleTarget[], branchId: string): number {
    const branchVehicles = vehicles.filter(v => v.branch_id === branchId);
    if (branchVehicles.length === 0) return 100;
    
    const completed = branchVehicles.filter(v => v.eligibility_status === "ALREADY_COMPLETED").length;
    return (completed / branchVehicles.length) * 100;
  }
}
