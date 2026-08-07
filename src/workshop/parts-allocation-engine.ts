import { PartRequisition } from "./parts-models";

export class PartsAllocationEngine {
  static issuePart(requisition: PartRequisition): PartRequisition {
    return { ...requisition, status: "ISSUED", issue_time: new Date().toISOString() };
  }

  static returnPart(requisition: PartRequisition): PartRequisition {
    return { ...requisition, status: "RETURNED", return_time: new Date().toISOString() };
  }
}
