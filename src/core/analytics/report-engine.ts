import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class ReportEngine {
  constructor(private eventBus: IEventBus) {}

  public async executeReport(
    reportDefId: string,
    parameters: any,
    userId: string,
    outputFormat: string = 'PDF'
  ): Promise<{ success: boolean; reportHistoryId?: string; error?: string }> {
    try {
      const [defs] = await db.execute("SELECT query_json, module FROM tbl_report_definition WHERE report_def_id = ?", [reportDefId]) as any[];
      if (defs.length === 0) throw new Error("Report definition not found");

      const reportHistoryId = `REP-${randomUUID().substring(0, 8)}`;

      // Simulate report generation execution
      
      await db.execute(
        "INSERT INTO tbl_report_history (report_history_id, report_def_id, generated_by, parameters_json, output_format, execution_status) VALUES (?, ?, ?, ?, ?, 'COMPLETED')",
        [reportHistoryId, reportDefId, userId, JSON.stringify(parameters), outputFormat]
      );

      const context = makeSystemContext(`REP-GEN-${reportHistoryId}`);
      await this.eventBus.publish("REPORT_GENERATED", { reportHistoryId, reportDefId }, context);

      return { success: true, reportHistoryId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
