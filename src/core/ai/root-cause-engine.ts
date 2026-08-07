import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { ExplainabilityFramework } from "./explainability-framework";

export class RootCauseEngine {
  constructor(
    private eventBus: IEventBus,
    private explainability: ExplainabilityFramework
  ) {}

  public async analyzeException(
    exceptionId: string,
    rootCauseText: string,
    contributingFactors: string,
    confidenceScore: number,
    inputFeatures: Record<string, any>
  ): Promise<{ success: boolean; analysisId?: string; error?: string }> {
    try {
      const [exceptions] = await db.execute("SELECT module, reference_id FROM tbl_exception_register WHERE exception_id = ?", [exceptionId]) as any[];
      if (exceptions.length === 0) throw new Error("Exception not found");

      const exception = exceptions[0];
      const analysisId = `RCA-${randomUUID().substring(0, 8)}`;

      await this.explainability.logDecision('ROOT_CAUSE', analysisId, {
        modelId: 'MOD-RCA',
        modelVersion: '1.0',
        confidenceScore,
        reasoningTrace: `Root cause identified for exception ${exceptionId}`,
        inputFeatures
      });

      await db.execute(
        "INSERT INTO tbl_ai_root_cause (analysis_id, module, reference_id, root_cause, contributing_factors, confidence) VALUES (?, ?, ?, ?, ?, ?)",
        [analysisId, exception.module, exceptionId, rootCauseText, contributingFactors, confidenceScore]
      );

      const context = makeSystemContext(`AI-${analysisId}`);
      await this.eventBus.publish("AI_ROOT_CAUSE_COMPLETED", { analysisId, exceptionId }, context);

      return { success: true, analysisId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
