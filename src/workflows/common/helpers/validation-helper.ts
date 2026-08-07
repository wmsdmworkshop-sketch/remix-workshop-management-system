import { ProgramDefinition } from "../program-definition";

export class ValidationHelper {
  static validateMetadata(program: ProgramDefinition): string[] {
    const errors: string[] = [];
    if (!program.metadata.dealer_code) errors.push("Missing Dealer Code");
    if (!program.metadata.region) errors.push("Missing Region");
    return errors;
  }

  static isReadyForSubmission(program: ProgramDefinition): boolean {
    return program.current_workflow_state === "READY_FOR_SUBMISSION";
  }
}
