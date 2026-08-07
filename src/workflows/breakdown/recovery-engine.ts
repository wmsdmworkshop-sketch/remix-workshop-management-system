import { BreakdownRecovery } from "./recovery-models";
import { BreakdownFinancialProfile } from "./financial-models";

export class BreakdownRecoveryEngine {
  static assignTow(recovery: BreakdownRecovery, vendorId: string): BreakdownRecovery {
    return {
      ...recovery,
      tow_assigned: true,
      tow_vendor_id: vendorId,
      recovery_started_time: new Date().toISOString()
    };
  }

  static completeRecovery(recovery: BreakdownRecovery, cost: number): BreakdownRecovery {
    return {
      ...recovery,
      recovery_completed_time: new Date().toISOString(),
      recovery_cost: cost
    };
  }
}
