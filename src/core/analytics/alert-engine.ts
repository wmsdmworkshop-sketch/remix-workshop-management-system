import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class AlertEngine {
  constructor(private eventBus: IEventBus) {}

  public async evaluateSnapshotAgainstRules(snapshotId: string): Promise<void> {
    const [snapshots] = await db.execute("SELECT kpi_id, kpi_value FROM tbl_kpi_snapshot WHERE snapshot_id = ?", [snapshotId]) as any[];
    if (snapshots.length === 0) return;

    const { kpi_id: kpiId, kpi_value: kpiValue } = snapshots[0];
    const value = parseFloat(kpiValue);

    const [rules] = await db.execute("SELECT rule_id, threshold, operator, priority FROM tbl_alert_rule WHERE kpi_id = ? AND status = 'ACTIVE'", [kpiId]) as any[];

    for (const rule of rules) {
      const threshold = parseFloat(rule.threshold);
      let isTriggered = false;

      switch (rule.operator) {
        case '>': isTriggered = value > threshold; break;
        case '<': isTriggered = value < threshold; break;
        case '>=': isTriggered = value >= threshold; break;
        case '<=': isTriggered = value <= threshold; break;
        case '==': isTriggered = value === threshold; break;
      }

      if (isTriggered) {
        const alertId = `ALRT-${randomUUID().substring(0, 8)}`;
        
        await db.execute(
          "INSERT INTO tbl_alert_history (alert_id, rule_id, actual_value, threshold) VALUES (?, ?, ?, ?)",
          [alertId, rule.rule_id, value, threshold]
        );

        if (rule.priority === 'CRITICAL' || rule.priority === 'HIGH') {
          const exceptionId = `EXC-${randomUUID().substring(0, 8)}`;
          await db.execute(
            "INSERT INTO tbl_exception_register (exception_id, module, reference_id, description, severity, status) VALUES (?, 'ANALYTICS', ?, ?, ?, 'OPEN')",
            [exceptionId, alertId, `KPI ${kpiId} breached threshold of ${threshold} with value ${value}`, rule.priority]
          );
          
          const ctx = makeSystemContext(`EXC-${exceptionId}`);
          await this.eventBus.publish("EXCEPTION_LOGGED", { exceptionId, alertId }, ctx);
        }

        const context = makeSystemContext(`ALRT-${alertId}`);
        await this.eventBus.publish("ALERT_RAISED", { alertId, ruleId: rule.rule_id, kpiId, value }, context);
      }
    }
  }
}
