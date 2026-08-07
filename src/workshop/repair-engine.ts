import { RepairOperation } from "./repair-models";

export class RepairEngine {
  static startRepair(operation: RepairOperation): RepairOperation {
    return { ...operation, status: "IN_PROGRESS", start_time: new Date().toISOString() };
  }

  static pauseRepair(operation: RepairOperation, reason: string): RepairOperation {
    return {
      ...operation,
      status: "PAUSED",
      pause_history: [...operation.pause_history, { pause_time: new Date().toISOString(), reason }]
    };
  }

  static completeRepair(operation: RepairOperation): RepairOperation {
    return { ...operation, status: "COMPLETED", end_time: new Date().toISOString() };
  }
}
