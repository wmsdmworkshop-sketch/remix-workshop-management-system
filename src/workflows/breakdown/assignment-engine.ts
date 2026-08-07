import { BreakdownQrt } from "./qrt-models";
import { QrtStatus } from "./constants";

export class BreakdownAssignmentEngine {
  static assignQrt(qrt: BreakdownQrt): BreakdownQrt {
    if (qrt.current_status !== QrtStatus.AVAILABLE) {
      throw new Error(`QRT is not available. Status: ${qrt.current_status}`);
    }
    return { ...qrt, current_status: QrtStatus.DISPATCHED, dispatch_time: new Date().toISOString() };
  }

  static markReached(qrt: BreakdownQrt): BreakdownQrt {
    return { ...qrt, current_status: QrtStatus.ON_SITE, reached_time: new Date().toISOString() };
  }
}
