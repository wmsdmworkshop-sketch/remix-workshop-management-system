import { BreakdownDispatch } from "./dispatch-models";
import { DispatchRules } from "./dispatch-rules";

export class BreakdownDispatchEngine {
  static createDispatch(incidentId: string, qrtId: string, towVendorId?: string): BreakdownDispatch {
    return {
      incident_id: incidentId,
      qrt_id: qrtId,
      tow_vendor_id: towVendorId,
      dispatch_time: new Date().toISOString(),
      status: "DISPATCHED"
    };
  }
}
