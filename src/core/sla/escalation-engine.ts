import { pool as db } from "../../db/index";
import { IEventBus } from "../event-bus";
import { SLAPolicyRegistry } from "./sla-policy-registry";
import { makeSystemContext } from "../business-context";

export class SLAEscalationEngine {
  constructor(private eventBus: IEventBus) {}

  /**
   * Called periodically (e.g., via cron or scheduled worker) to scan for breached SLA timers.
   */
  public async detectBreachesAndEscalate(): Promise<void> {
    const now = new Date();
    
    // Find all timers that are RUNNING and past their target_breach_time
    const [breachedTimers] = await db.execute(
      "SELECT t.timer_id, t.instance_id, i.policy_id, i.entity_type, i.entity_id FROM tbl_sla_timer t JOIN tbl_sla_instance i ON t.instance_id = i.instance_id WHERE t.status = 'RUNNING' AND t.target_breach_time <= ?",
      [now]
    ) as any[];

    if (!breachedTimers || breachedTimers.length === 0) return;

    for (const timer of breachedTimers) {
      // Mark Timer as BREACHED
      await db.execute("UPDATE tbl_sla_timer SET status = 'STOPPED' WHERE timer_id = ?", [timer.timer_id]);
      await db.execute("UPDATE tbl_sla_instance SET status = 'BREACHED' WHERE instance_id = ?", [timer.instance_id]);

      // Calculate the Escalation Target
      const escalationMatrix = await SLAPolicyRegistry.getEscalationMatrix(timer.policy_id);
      
      // We will publish the first level escalation immediately upon breach
      if (escalationMatrix.length > 0) {
        const firstLevel = escalationMatrix.find((e) => e.trigger_minutes_after_breach === 0) || escalationMatrix[0];
        
        await this.triggerEscalation(timer, firstLevel);
      } else {
        // Fallback: Just publish a generic Breach event if no matrix exists
        const context = makeSystemContext(`SLA-BREACH-${timer.instance_id}`);
        await this.eventBus.publish("SLA_BREACHED", {
          instanceId: timer.instance_id,
          entityType: timer.entity_type,
          entityId: timer.entity_id,
          policyId: timer.policy_id,
        }, context);
      }
    }

    // Next, check for existing BREACHED instances that need subsequent L2/L3 escalations based on trigger_minutes_after_breach
    // (A full implementation would track which escalation level we are currently at in tbl_sla_instance or tbl_sla_history)
  }

  private async triggerEscalation(timer: any, config: any): Promise<void> {
    const context = makeSystemContext(`SLA-ESC-${timer.instance_id}-${config.escalation_level}`);
    
    // Record History
    await db.execute(
      "INSERT INTO tbl_sla_history (history_id, instance_id, action, details) VALUES (?, ?, ?, ?)",
      [`HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`, timer.instance_id, "ESCALATED", `Escalated to Level ${config.escalation_level} (${config.target_role}) - ${config.severity}`]
    );

    // Publish specific escalation event. NotificationEngine consumes this.
    await this.eventBus.publish("SLA_ESCALATED", {
      instanceId: timer.instance_id,
      entityType: timer.entity_type,
      entityId: timer.entity_id,
      policyId: timer.policy_id,
      escalationLevel: config.escalation_level,
      targetRole: config.target_role,
      severity: config.severity,
    }, context);
  }
}
