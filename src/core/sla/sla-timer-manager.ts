import { pool as db } from "../../db/index";
import { SLACalendar } from "./sla-calendar";
import { SLAPolicyRegistry } from "./sla-policy-registry";

export class SLATimerManager {
  /**
   * Starts a new SLA tracking instance and timer.
   */
  public static async startTimer(
    entityType: string,
    entityId: string,
    slaType: string,
    context: {
      workshop_id?: number;
      service_type?: string;
      customer_category?: string;
      vehicle_category?: string;
      operation_type?: string;
    }
  ): Promise<void> {
    const policy = await SLAPolicyRegistry.resolvePolicy(slaType, context);
    if (!policy) return; // No policy defined for this scenario

    const instanceId = `SLA-INST-${entityType}-${entityId}-${slaType}-${Date.now()}`;
    const timerId = `SLA-TMR-${instanceId}`;
    const startTime = new Date();
    
    const targetBreachTime = await SLACalendar.addBusinessMinutes(
      startTime, 
      policy.base_minutes_limit, 
      context.workshop_id || null, 
      policy.is_24x7
    );

    // Create Instance
    await db.execute(
      "INSERT INTO tbl_sla_instance (instance_id, policy_id, entity_type, entity_id, status) VALUES (?, ?, ?, ?, ?)",
      [instanceId, policy.policy_id, entityType, entityId, "RUNNING"]
    );

    // Create Timer
    await db.execute(
      "INSERT INTO tbl_sla_timer (timer_id, instance_id, start_time, target_breach_time, status) VALUES (?, ?, ?, ?, ?)",
      [timerId, instanceId, startTime, targetBreachTime, "RUNNING"]
    );

    // Log History
    await this.logHistory(instanceId, "STARTED", `SLA Timer started for ${slaType}`);
  }

  public static async pauseTimer(instanceId: string, reason: string): Promise<void> {
    const [timers] = await db.execute("SELECT * FROM tbl_sla_timer WHERE instance_id = ? AND status = 'RUNNING'", [instanceId]) as any[];
    if (!timers || timers.length === 0) return;

    await db.execute(
      "UPDATE tbl_sla_timer SET status = 'PAUSED', paused_at = ? WHERE instance_id = ? AND status = 'RUNNING'",
      [new Date(), instanceId]
    );

    await db.execute("UPDATE tbl_sla_instance SET status = 'PAUSED' WHERE instance_id = ?", [instanceId]);
    await this.logHistory(instanceId, "PAUSED", reason);
  }

  public static async resumeTimer(instanceId: string, reason: string): Promise<void> {
    const [timers] = await db.execute("SELECT * FROM tbl_sla_timer WHERE instance_id = ? AND status = 'PAUSED'", [instanceId]) as any[];
    if (!timers || timers.length === 0) return;
    
    const timer = timers[0];
    const now = new Date();
    const pausedAt = new Date(timer.paused_at);
    const pauseDurationMs = now.getTime() - pausedAt.getTime();

    // In a real system, we'd also adjust the target_breach_time here, by adding business minutes equivalent to the paused duration.
    await db.execute(
      "UPDATE tbl_sla_timer SET status = 'RUNNING', accumulated_pause_ms = accumulated_pause_ms + ?, paused_at = NULL WHERE instance_id = ?",
      [pauseDurationMs, instanceId]
    );

    await db.execute("UPDATE tbl_sla_instance SET status = 'RUNNING' WHERE instance_id = ?", [instanceId]);
    await this.logHistory(instanceId, "RESUMED", reason);
  }

  public static async resolveTimer(entityType: string, entityId: string, slaType: string, reason: string): Promise<void> {
    // Find active instance
    const [instances] = await db.execute(
      "SELECT i.instance_id FROM tbl_sla_instance i JOIN tbl_sla_policy p ON i.policy_id = p.policy_id WHERE i.entity_type = ? AND i.entity_id = ? AND p.sla_type = ? AND i.status IN ('RUNNING', 'PAUSED')",
      [entityType, entityId, slaType]
    ) as any[];

    if (!instances || instances.length === 0) return;
    const instanceId = instances[0].instance_id;

    await db.execute("UPDATE tbl_sla_timer SET status = 'STOPPED' WHERE instance_id = ?", [instanceId]);
    await db.execute("UPDATE tbl_sla_instance SET status = 'RESOLVED', resolved_at = ? WHERE instance_id = ?", [new Date(), instanceId]);
    
    await this.logHistory(instanceId, "RESOLVED", reason);
  }

  private static async logHistory(instanceId: string, action: string, details: string): Promise<void> {
    await db.execute(
      "INSERT INTO tbl_sla_history (history_id, instance_id, action, details) VALUES (?, ?, ?, ?)",
      [`HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`, instanceId, action, details]
    );
  }
}
