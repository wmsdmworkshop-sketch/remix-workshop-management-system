/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Runtime Overrides Service
 * Module: configuration/runtime-overrides.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Runtime overrides allow operators to temporarily change config values
 * without a deployment. They always take precedence over all scope levels.
 * Overrides can have an expiry time; expired overrides are auto-deactivated.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  RuntimeOverride,
  ConfigValue,
  ConfigScope,
} from "./types.ts";

export interface IRuntimeOverridesService {
  set(
    key: string,
    scope: ConfigScope,
    value: ConfigValue,
    reason: string,
    setBy: string,
    expiresAt?: string | null
  ): RuntimeOverride;

  get(key: string, scope: ConfigScope): RuntimeOverride | undefined;
  remove(key: string, scope: ConfigScope, removedBy: string): boolean;
  listActive(): ReadonlyArray<RuntimeOverride>;
  purgeExpired(): number;
}

export class RuntimeOverridesService implements IRuntimeOverridesService {
  /** `${key}::${scope.level}::${scope.identifier}` → RuntimeOverride */
  private readonly overrides = new Map<string, RuntimeOverride>();

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public set(
    key: string,
    scope: ConfigScope,
    value: ConfigValue,
    reason: string,
    setBy: string,
    expiresAt: string | null = null
  ): RuntimeOverride {
    if (!reason || reason.trim().length === 0) {
      throw new Error("[RuntimeOverrides] A reason is required when setting a runtime override.");
    }
    if (!setBy || setBy.trim().length === 0) {
      throw new Error("[RuntimeOverrides] setBy (actor ID) is required.");
    }
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      if (isNaN(expiry.getTime())) {
        throw new Error("[RuntimeOverrides] expiresAt must be a valid ISO-8601 date string.");
      }
      if (expiry <= new Date()) {
        throw new Error("[RuntimeOverrides] expiresAt must be in the future.");
      }
    }

    const override: RuntimeOverride = Object.freeze({
      overrideId: randomUUID(),
      key,
      scope,
      value,
      reason,
      setBy,
      setAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
    });

    this.overrides.set(this.buildKey(key, scope), override);
    return override;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Returns an active, non-expired runtime override for the given key + scope.
   * Returns undefined if no override exists or if it has expired.
   */
  public get(key: string, scope: ConfigScope): RuntimeOverride | undefined {
    const override = this.overrides.get(this.buildKey(key, scope));
    if (!override || !override.isActive) return undefined;

    // Lazy expiry check
    if (override.expiresAt && new Date(override.expiresAt) <= new Date()) {
      this.deactivate(key, scope);
      return undefined;
    }

    return override;
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  public remove(key: string, scope: ConfigScope, removedBy: string): boolean {
    const storeKey = this.buildKey(key, scope);
    const override = this.overrides.get(storeKey);
    if (!override) return false;

    // Replace with deactivated version (preserve history in store)
    const deactivated: RuntimeOverride = Object.freeze({
      ...override,
      isActive: false,
      reason: `${override.reason} [Removed by ${removedBy} at ${new Date().toISOString()}]`,
    });
    this.overrides.set(storeKey, deactivated);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  public listActive(): ReadonlyArray<RuntimeOverride> {
    this.purgeExpired();
    return Array.from(this.overrides.values()).filter((o) => o.isActive);
  }

  /**
   * Deactivates all expired overrides and returns the count of expired entries.
   */
  public purgeExpired(): number {
    const now = new Date();
    let purgedCount = 0;

    for (const [storeKey, override] of this.overrides) {
      if (override.isActive && override.expiresAt && new Date(override.expiresAt) <= now) {
        const expired: RuntimeOverride = Object.freeze({ ...override, isActive: false });
        this.overrides.set(storeKey, expired);
        purgedCount++;
      }
    }

    return purgedCount;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private deactivate(key: string, scope: ConfigScope): void {
    const storeKey = this.buildKey(key, scope);
    const override = this.overrides.get(storeKey);
    if (override) {
      this.overrides.set(storeKey, Object.freeze({ ...override, isActive: false }));
    }
  }

  private buildKey(key: string, scope: ConfigScope): string {
    return `${key}::${scope.level}::${scope.identifier}`;
  }
}
