import { ProgramDefinition, ExternalReference } from "../program-definition";

export class ReferenceHelper {
  static addReference(program: ProgramDefinition, type: string, id: string, url?: string): void {
    if (!program.external_references) {
      program.external_references = [];
    }
    program.external_references.push({ type, id, url });
  }

  static getReference(program: ProgramDefinition, type: string): ExternalReference | undefined {
    return program.external_references?.find(r => r.type === type);
  }
}
