import { ProgramDefinition } from "../program-definition";

export class PolicyHelper {
  static evaluateEligibility(program: ProgramDefinition, rules: any[]): boolean {
    // In a real system, this would parse generic rule expressions
    // For now, it simply ensures the program profile exists
    return !!program.policy_profile && rules.length > 0;
  }

  static isVehicleEligible(program: ProgramDefinition, vehicle: any): boolean {
    return !!vehicle?.vin;
  }

  static isComponentCovered(program: ProgramDefinition, component: any): boolean {
    return !!component?.part_number;
  }
}
