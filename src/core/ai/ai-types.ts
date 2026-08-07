export type AIOutputType = 'PREDICTION' | 'RECOMMENDATION' | 'ANOMALY' | 'FORECAST' | 'ROOT_CAUSE';

export type AIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ExplanationContext {
  modelId: string;
  modelVersion: string;
  confidenceScore: number;
  reasoningTrace: string;
  inputFeatures: Record<string, any>;
}

export interface AIModelMetadata {
  modelId: string;
  modelName: string;
  version: string;
  purpose: string;
  accuracyMetric: number;
}
