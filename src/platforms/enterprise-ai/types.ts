/**
 * =============================================================================
 * DWIP Enterprise AI Platform — Types & DTOs
 * Module: platforms/enterprise-ai/types.ts
 * =============================================================================
 */

export interface AIPredictionInput {
  readonly useCase: string;
  readonly entityId: string;
  readonly contextData?: Record<string, any>;
}

export interface AIReasonCode {
  readonly code: string;
  readonly description: string;
  readonly impactWeight: number; // 0.0 to 1.0
}

export interface AIPredictionResult {
  readonly useCase: string;
  readonly entityId: string;
  readonly prediction: string | number | boolean;
  readonly confidenceScore: number; // percentage (0 to 100)
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly reasonCodes: ReadonlyArray<AIReasonCode>;
  readonly supportingKPIs: ReadonlyArray<{ readonly kpiKey: string; readonly value: number }>;
  readonly historicalComparison: {
    readonly historicalAverage: number;
    readonly deviationPercent: number;
  };
  readonly recommendedAction: string;
  readonly expectedBusinessImpact: string;
  readonly explainability: AIExplainability;
  readonly computedAt: string;
}

export interface AIExplainability {
  readonly explanation: string;
  readonly primaryKPIs: ReadonlyArray<string>;
  readonly historicalEvidenceSummary: string;
  readonly alternativeOutcomes: ReadonlyArray<{
    readonly outcome: string;
    readonly probability: number;
  }>;
}

export interface AIModelMetadata {
  readonly modelId: string;
  readonly modelName: string;
  readonly version: string;
  readonly accuracyScore: number;
  readonly trainedAt: string;
  readonly isActive: boolean;
}

export interface AIPromptTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly version: string;
  readonly rawText: string;
}
