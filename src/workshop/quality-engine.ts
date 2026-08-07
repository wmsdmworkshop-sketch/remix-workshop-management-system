import { QualityControl } from "./quality-models";

export class QualityEngine {
  static passQc(qc: QualityControl): QualityControl {
    return { ...qc, status: "PASSED", qc_time: new Date().toISOString() };
  }

  static failQc(qc: QualityControl, defects: string[], reworkDetails: string): QualityControl {
    return {
      ...qc,
      status: "REWORK_REQUIRED",
      defects_found: defects,
      rework_details: reworkDetails,
      qc_time: new Date().toISOString()
    };
  }
}
