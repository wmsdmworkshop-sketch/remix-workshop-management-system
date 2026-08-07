import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";

export class ObservabilityEngine {

  public async logExecution(jobName: string, startTime: Date, endTime: Date, status: 'SUCCESS'|'FAILED', errorDetails?: string): Promise<void> {
    const durationMs = endTime.getTime() - startTime.getTime();
    const executionId = `EXEC-${randomUUID().substring(0, 8)}`;
    
    await db.execute(
      "INSERT INTO tbl_job_execution (execution_id, job_name, start_time, end_time, status, error_details, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [executionId, jobName, startTime, endTime, status, errorDetails || null, durationMs]
    );
  }

  public async captureApplicationLog(level: 'INFO'|'WARN'|'ERROR', module: string, message: string, correlationId: string, stackTrace?: string): Promise<void> {
    const logId = `LOG-${randomUUID().substring(0, 8)}`;
    
    // Fire-and-forget for telemetry
    db.execute(
      "INSERT INTO tbl_application_log (log_id, level, module, correlation_id, message, stack_trace) VALUES (?, ?, ?, ?, ?, ?)",
      [logId, level, module, correlationId, message, stackTrace || null]
    ).catch(e => console.error("Telemetry failed:", e));
  }
}
