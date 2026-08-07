import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { ExplainabilityFramework } from "./explainability-framework";

export class PredictionEngine {
  constructor(
    private eventBus: IEventBus,
    private explainability: ExplainabilityFramework
  ) {}

  public async generatePrediction(
    module: string,
    referenceId: string,
    predictionType: string,
    predictedOutcome: string,
    confidenceScore: number,
    reasoning: string,
    inputFeatures: Record<string, any>
  ): Promise<{ success: boolean; predictionId?: string; error?: string }> {
    try {
      const predictionId = `PRD-${randomUUID().substring(0, 8)}`;

      // Use explainability framework
      await this.explainability.logDecision('PREDICTION', predictionId, {
        modelId: 'MOD-PREDICT',
        modelVersion: '1.0',
        confidenceScore,
        reasoningTrace: reasoning,
        inputFeatures
      });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 day expiry

      await db.execute(
        "INSERT INTO tbl_ai_prediction (prediction_id, prediction_type, reference_module, reference_id, prediction, confidence_score, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')",
        [predictionId, predictionType, module, referenceId, predictedOutcome, confidenceScore, expiryDate]
      );

      const context = makeSystemContext(`AI-${predictionId}`);
      await this.eventBus.publish("AI_PREDICTION_CREATED", { predictionId, module, referenceId }, context);

      return { success: true, predictionId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
