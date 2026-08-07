import { ProgramDefinition } from "../program-definition";

export class ApprovalHelper {
  static getPendingApprovers(program: ProgramDefinition): string[] {
    // Determine who needs to approve based on current state
    return [];
  }

  static isFullyApproved(program: ProgramDefinition, requiredLevels: string[], currentApprovals: any[]): boolean {
    const levels = currentApprovals.map(a => a.level);
    return requiredLevels.every(l => levels.includes(l));
  }
}
