import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { AuditEvent } from "./sys-types";

export class AuditEngine {
  private sensitiveKeys = ['password', 'secret', 'token', 'aadhar', 'pan'];

  public async captureAudit(
    event: AuditEvent,
    correlationId: string,
    isSync: boolean = false
  ): Promise<void> {
    const auditId = `AUD-${randomUUID().substring(0, 8)}`;
    
    let oldVal = event.oldValueJson;
    let newVal = event.newValueJson;

    if (event.isSensitive) {
      oldVal = this.maskSensitiveData(oldVal);
      newVal = this.maskSensitiveData(newVal);
    }

    const query = "INSERT INTO tbl_enterprise_audit (audit_id, correlation_id, event_type, module, user_id, reference_id, old_value_json, new_value_json, ip_address, is_sensitive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const params = [auditId, correlationId, event.eventType, event.module, event.userId, event.referenceId, oldVal || null, newVal || null, event.ipAddress || null, event.isSensitive || false];

    if (isSync) {
      await db.execute(query, params);
    } else {
      // Fire-and-forget for high-volume async events
      db.execute(query, params).catch(e => console.error("Async Audit Failed", e));
    }
  }

  private maskSensitiveData(jsonStr?: string): string {
    if (!jsonStr) return "";
    try {
      const obj = JSON.parse(jsonStr);
      for (const key in obj) {
        if (this.sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = "********";
        }
      }
      return JSON.stringify(obj);
    } catch {
      return jsonStr;
    }
  }
}
