import { FsbCompletionRecord } from "./completion-models";
import { FsbVehicleCompletionStatus } from "./completion-status";

export class FsbCompletionEngine {
  static processCompletion(record: FsbCompletionRecord): string {
    if (record.parts_used.length > 0 || record.labour_hours > 0) {
      return "COMPLETED"; // Valid job done
    }
    
    if (record.completion_status === "INSPECTED_OK") {
      return "INSPECTED_OK"; // No parts needed, just checked
    }
    
    return "PENDING";
  }
}
