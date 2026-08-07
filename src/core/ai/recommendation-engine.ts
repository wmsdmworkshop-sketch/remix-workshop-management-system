import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { ExplainabilityFramework } from "./explainability-framework";
import { AIPriority } from "./ai-types";

export class RecommendationEngine {
  constructor(
    private eventBus: IEventBus,
    private explainability: ExplainabilityFramework
  ) {}

  public async generateRecommendation(
    module: string,
    referenceId: string,
    recommendationText: string,
    priority: AIPriority,
    businessImpact: string,
    confidenceScore: number,
    reasoning: string,
    inputFeatures: Record<string, any>
  ): Promise<{ success: boolean; recommendationId?: string; error?: string }> {
    try {
      const recommendationId = `REC-${randomUUID().substring(0, 8)}`;

      await this.explainability.logDecision('RECOMMENDATION', recommendationId, {
        modelId: 'MOD-RECOMMEND',
        modelVersion: '1.0',
        confidenceScore,
        reasoningTrace: reasoning,
        inputFeatures
      });

      await db.execute(
        "INSERT INTO tbl_ai_recommendation (recommendation_id, module, reference_id, recommendation, priority, business_impact, confidence_score, reasoning_summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')",
        [recommendationId, module, referenceId, recommendationText, priority, businessImpact, confidenceScore, reasoning]
      );

      const context = makeSystemContext(`AI-${recommendationId}`);
      await this.eventBus.publish("AI_RECOMMENDATION_CREATED", { recommendationId, module, referenceId }, context);

      return { success: true, recommendationId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
