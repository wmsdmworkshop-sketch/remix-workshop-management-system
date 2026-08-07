import { BreakdownDiagnosis } from "./diagnosis-models";
import { RecoveryRules } from "./recovery-rules";

export class BreakdownDiagnosisEngine {
  static evaluateDiagnosis(diagnosis: BreakdownDiagnosis): { needsTow: boolean } {
    if (!diagnosis.can_continue_journey && !diagnosis.temporary_repair_done) {
      return { needsTow: true };
    }
    
    if (RecoveryRules.AUTO_ASSIGN_TOW_ON_ACCIDENT && diagnosis.failure_category === "ACCIDENT") {
      return { needsTow: true };
    }
    
    if (RecoveryRules.AUTO_ASSIGN_TOW_ON_ENGINE_FAILURE && diagnosis.aggregate === "ENGINE" && diagnosis.permanent_repair_required) {
      return { needsTow: true };
    }

    return { needsTow: !!diagnosis.tow_required };
  }
}
