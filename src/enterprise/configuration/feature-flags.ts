/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Feature Flags Engine
 * Module: configuration/feature-flags.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8.4 (Feature Flag Categories)
 *
 * Manages feature flag definitions and evaluates flag state for a given scope.
 * Supports: Release, Experiment (with % rollout), Ops, and Permission flags.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  FeatureFlag,
  FeatureFlagState,
  FeatureFlagCategory,
  ConfigScope,
  ConfigResolutionContext,
} from "./types.ts";

export interface IFeatureFlagEngine {
  registerFlag(flag: FeatureFlag): void;
  getFlag(flagKey: string): FeatureFlag | undefined;
  listFlags(category?: FeatureFlagCategory): ReadonlyArray<FeatureFlag>;

  setState(
    flagKey: string,
    scope: ConfigScope,
    enabled: boolean,
    rolloutPercentage: number,
    setBy: string
  ): FeatureFlagState;

  evaluate(flagKey: string, context: ConfigResolutionContext, subjectId?: string): boolean;
  getState(flagKey: string, scope: ConfigScope): FeatureFlagState | undefined;
}

export class FeatureFlagEngine implements IFeatureFlagEngine {
  /** flagKey → FeatureFlag definition */
  private readonly flags = new Map<string, FeatureFlag>();

  /** `${flagKey}::${scope.level}::${scope.identifier}` → FeatureFlagState */
  private readonly states = new Map<string, FeatureFlagState>();

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  public registerFlag(flag: FeatureFlag): void {
    if (!flag.flagKey || flag.flagKey.trim().length === 0) {
      throw new Error("[FeatureFlagEngine] Flag key must not be empty.");
    }
    this.flags.set(flag.flagKey, Object.freeze({ ...flag }));
  }

  public getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }

  public listFlags(category?: FeatureFlagCategory): ReadonlyArray<FeatureFlag> {
    const all = Array.from(this.flags.values());
    return category ? all.filter((f) => f.category === category) : all;
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  public setState(
    flagKey: string,
    scope: ConfigScope,
    enabled: boolean,
    rolloutPercentage: number,
    setBy: string
  ): FeatureFlagState {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(
        `[FeatureFlagEngine] Cannot set state for unregistered flag "${flagKey}". Register it first.`
      );
    }
    if (!flag.allowedScopes.includes(scope.level)) {
      throw new Error(
        `[FeatureFlagEngine] Flag "${flagKey}" does not allow overrides at scope "${scope.level}".`
      );
    }
    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      throw new Error("[FeatureFlagEngine] rolloutPercentage must be between 0 and 100.");
    }

    const state: FeatureFlagState = Object.freeze({
      flagKey,
      scope,
      enabled,
      rolloutPercentage,
      setAt: new Date().toISOString(),
      setBy,
    });

    this.states.set(this.buildStateKey(flagKey, scope), state);
    return state;
  }

  public getState(flagKey: string, scope: ConfigScope): FeatureFlagState | undefined {
    return this.states.get(this.buildStateKey(flagKey, scope));
  }

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluates a feature flag for the given resolution context.
   * Walks context.scopes most-specific → GLOBAL, returns first match.
   *
   * For EXPERIMENT flags with a rolloutPercentage < 100, a deterministic
   * hash of `subjectId + flagKey` decides inclusion, ensuring stable
   * assignment per subject.
   *
   * Falls back to FeatureFlag.defaultEnabled if no state is configured.
   */
  public evaluate(
    flagKey: string,
    context: ConfigResolutionContext,
    subjectId?: string
  ): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      // Unknown flag defaults to false (safe default)
      return false;
    }

    // Walk context scopes most-specific → least-specific
    for (const scope of context.scopes) {
      const state = this.states.get(this.buildStateKey(flagKey, scope));
      if (state) {
        return this.applyRollout(state, subjectId);
      }
    }

    // No explicit state — fall back to definition default
    return flag.defaultEnabled;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private applyRollout(state: FeatureFlagState, subjectId?: string): boolean {
    if (!state.enabled) return false;
    if (state.rolloutPercentage >= 100) return true;
    if (state.rolloutPercentage <= 0) return false;

    // Deterministic bucket assignment using a simple hash
    const seed = `${state.flagKey}::${subjectId ?? "anonymous"}`;
    const hash = this.simpleHash(seed);
    const bucket = Math.abs(hash) % 100;
    return bucket < state.rolloutPercentage;
  }

  /** djb2-inspired deterministic hash for rollout bucketing */
  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash;
  }

  private buildStateKey(flagKey: string, scope: ConfigScope): string {
    return `${flagKey}::${scope.level}::${scope.identifier}`;
  }
}
