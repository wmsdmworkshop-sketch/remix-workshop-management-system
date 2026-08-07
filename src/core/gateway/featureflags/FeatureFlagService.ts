/**
 * DWIP Enterprise Integration Gateway - FeatureFlagService
 * Hierarchical Feature Flag Evaluation Engine (System -> Provider -> Workshop -> User)
 */

import { FeatureFlagName, FeatureFlagContext, FeatureFlagConfig } from './types';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class FeatureFlagService {
  private flagStore: Map<FeatureFlagName, FeatureFlagConfig> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const defaults: FeatureFlagConfig[] = [
      { flag: 'EnableMediaUpload', systemValue: true },
      { flag: 'EnableTrailerAxle', systemValue: true },
      { flag: 'EnableKYC', systemValue: true },
      { flag: 'EnableOfflineSync', systemValue: true },
      { flag: 'EnableWarrantySync', systemValue: true },
      { flag: 'EnableAMC', systemValue: true },
      { flag: 'EnableSmartRemarks', systemValue: true }
    ];

    for (const d of defaults) {
      this.flagStore.set(d.flag, d);
    }
  }

  public setFlagConfig(config: FeatureFlagConfig): void {
    this.flagStore.set(config.flag, config);
  }

  /**
   * Evaluate Feature Flag with 4-tier Hierarchy: System -> Provider -> Workshop -> User
   */
  public isEnabled(flag: FeatureFlagName, context?: FeatureFlagContext): boolean {
    const cfg = this.flagStore.get(flag);
    if (!cfg) {
      return false; // Default to disabled if unknown flag
    }

    // 1. User Tier (Highest Priority)
    if (context?.userId && cfg.userValues && context.userId in cfg.userValues) {
      const val = cfg.userValues[context.userId];
      this.logEvaluation(flag, val, 'USER', context);
      return val;
    }

    // 2. Workshop Tier
    if (context?.workshopId && cfg.workshopValues && context.workshopId in cfg.workshopValues) {
      const val = cfg.workshopValues[context.workshopId];
      this.logEvaluation(flag, val, 'WORKSHOP', context);
      return val;
    }

    // 3. Provider Tier
    if (context?.providerId && cfg.providerValues && context.providerId in cfg.providerValues) {
      const val = cfg.providerValues[context.providerId];
      this.logEvaluation(flag, val, 'PROVIDER', context);
      return val;
    }

    // 4. System Tier (Fallback)
    this.logEvaluation(flag, cfg.systemValue, 'SYSTEM', context);
    return cfg.systemValue;
  }

  private logEvaluation(
    flag: FeatureFlagName,
    value: boolean,
    evaluatedTier: string,
    context?: FeatureFlagContext
  ): void {
    StructuredLogger.info(`Evaluated FeatureFlag '${flag}': ${value} at tier [${evaluatedTier}]`, {
      component: 'FeatureFlagService',
      operation: 'isEnabled',
      result: 'SUCCESS',
      flag,
      value,
      evaluatedTier,
      context
    });
  }
}

export const featureFlagService = new FeatureFlagService();
