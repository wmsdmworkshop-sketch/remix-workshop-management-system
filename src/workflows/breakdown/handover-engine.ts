import { BreakdownHandover } from "./handover-models";

export class BreakdownHandoverEngine {
  static acknowledgeArrival(handover: BreakdownHandover): BreakdownHandover {
    return {
      ...handover,
      gate_entry_time: new Date().toISOString(),
      workshop_status: "IN_WORKSHOP"
    };
  }

  static assignJobCard(handover: BreakdownHandover, jobCardId: string, advisorId: string): BreakdownHandover {
    return {
      ...handover,
      job_card_id: jobCardId,
      service_advisor_id: advisorId,
      workshop_status: "REPAIRING"
    };
  }
}
