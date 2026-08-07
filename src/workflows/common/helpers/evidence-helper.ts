import { ProgramDefinition } from "../program-definition";

export class EvidenceHelper {
  static hasRequiredEvidence(program: ProgramDefinition, requiredTypes: string[], existingEvidence: any[]): boolean {
    const existingTypes = existingEvidence.map(e => e.evidence_type);
    return requiredTypes.every(t => existingTypes.includes(t));
  }

  static getMissingEvidence(program: ProgramDefinition, requiredTypes: string[], existingEvidence: any[]): string[] {
    const existingTypes = existingEvidence.map(e => e.evidence_type);
    return requiredTypes.filter(t => !existingTypes.includes(t));
  }
}
