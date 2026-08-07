import { Leave } from "./leave-models";

export class LeaveBalancingEngine {
  static approveLeave(leave: Leave, activeLeavesCount: number, maxAllowedLeaves: number): Leave {
    if (activeLeavesCount >= maxAllowedLeaves) {
      throw new Error("Leave threshold exceeded for this period.");
    }
    return { ...leave, status: "APPROVED" };
  }
}
