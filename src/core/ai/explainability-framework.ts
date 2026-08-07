import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { ExplanationContext, AIOutputType } from "./ai-types";

export class ExplainabilityFramework {
  
  public async logDecision(
    outputType: AIOutputType,
    referenceId: string,
    context: ExplanationContext
  ): Promise<string> {
    if (context.confidenceScore < 0 || context.confidenceScore > 100) {
      throw new Error("Confidence score must be between 0 and 100");
    }
    
    if (!context.reasoningTrace || context.reasoningTrace.trim().length === 0) {
      throw new Error("AI outputs must include a reasoning trace for explainability.");
    }

    const decisionLogId = `LOG-${randomUUID().substring(0, 8)}`;
    
    await db.execute(
      "INSERT INTO tbl_ai_decision_log (decision_log_id, ai_output_type, reference_id, input_features_json, model_version, reasoning_trace) VALUES (?, ?, ?, ?, ?, ?)",
      [
        decisionLogId,
        outputType,
        referenceId,
        JSON.stringify(context.inputFeatures),
        `${context.modelId}-v${context.modelVersion}`,
        context.reasoningTrace
      ]
    );

    return decisionLogId;
  }
}
