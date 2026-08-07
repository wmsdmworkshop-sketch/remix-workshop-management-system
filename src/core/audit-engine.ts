import { randomUUID } from "crypto";
import { EventBus, DomainEventEnvelope } from "./event-bus";
import { EngineMetadata } from "./kernel-contracts";

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  correlation_id: string;
  topic: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  payload_snapshot: Record<string, any>;
}

export class AuditEngine {
  public metadata: EngineMetadata = {
    engine_name: "AuditEngine",
    engine_version: "1.0.0",
    capabilities: ["EventDriven", "ImmutableLedger", "TimelineReconstruction"]
  };

  constructor(
    private eventBus: EventBus,
    private getDBState: () => any,
    private setDBState: (state: any) => Promise<void>
  ) {
    this.start();
  }

  /**
   * Subscribes to all events published through the EventBus.
   */
  private start() {
    this.eventBus.subscribe("*", async (event: DomainEventEnvelope) => {
      await this.recordAudit(event);
    });
  }

  /**
   * Persists an immutable audit record from an event envelope.
   */
  private async recordAudit(event: DomainEventEnvelope): Promise<void> {
    const record: AuditRecord = Object.freeze({
      audit_id: randomUUID(),
      timestamp: event.timestamp,
      correlation_id: event.context.traceability.correlation_id,
      topic: event.topic,
      entity_type: event.context.identity.entity_type,
      entity_id: event.context.identity.entity_id,
      actor_id: event.context.actor.user_id,
      actor_role: event.context.actor.role,
      payload_snapshot: Object.freeze(JSON.parse(JSON.stringify(event.payload || {}))) // Deep copy and freeze
    });

    const db = this.getDBState();
    db.audit_logs = db.audit_logs || [];
    db.audit_logs.push(record);
    await this.setDBState(db);
  }

  /**
   * Reconstructs the timeline of an entity based on its audit logs.
   * Logs are sorted chronologically.
   */
  public getAuditTrail(entity_id: string, entity_type?: string): AuditRecord[] {
    const db = this.getDBState();
    const logs: AuditRecord[] = db.audit_logs || [];
    
    let filtered = logs.filter(log => log.entity_id === entity_id);
    if (entity_type) {
      filtered = filtered.filter(log => log.entity_type === entity_type);
    }

    return filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
