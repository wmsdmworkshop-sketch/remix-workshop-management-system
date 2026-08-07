/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Event Versioning
 * Module: event-catalog/event-versioning.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6.3 (Event Versioning Strategy)
 *
 * Enforces versioning rules:
 *  - Backward compatible changes: optional fields added to same schema version
 *  - Breaking changes: schema ID version increments
 *  - Deprecation window: 90 days from new version publication
 *  - Consumer registry: blocks deprecation if active consumers remain
 * =============================================================================
 */

import type { EventSchemaVersion, EventConsumer } from "./types.ts";
import type { ISchemaRegistry } from "./schema-registry.ts";

/** Number of days after which a deprecated schema version should be removed */
const DEPRECATION_WINDOW_DAYS = 90;

export interface VersionCompatibilityResult {
  readonly compatible: boolean;
  readonly reason: string;
  readonly oldVersion: string;
  readonly newVersion: string;
}

export interface DeprecationResult {
  readonly deprecated: boolean;
  readonly eventType: string;
  readonly version: string;
  readonly deprecatedAt: string;
  readonly scheduledRemovalAt: string;
  readonly activeConsumers: ReadonlyArray<string>;
  readonly canForceRemove: boolean;
}

export interface IEventVersioning {
  checkCompatibility(
    eventType: string,
    oldVersion: string,
    newVersion: string
  ): VersionCompatibilityResult;

  deprecateVersion(
    eventType: string,
    schemaVersion: string,
    activeConsumers: ReadonlyArray<EventConsumer>
  ): DeprecationResult;

  isWithinDeprecationWindow(deprecatedAt: string): boolean;
  getScheduledRemovalDate(deprecatedAt: string): string;
}

export class EventVersioningService implements IEventVersioning {
  constructor(private readonly schemaRegistry: ISchemaRegistry) {}

  // ---------------------------------------------------------------------------
  // Compatibility Check
  // ---------------------------------------------------------------------------

  /**
   * Checks if transitioning from oldVersion to newVersion is backward compatible.
   * Uses semver major version comparison:
   *  - Same major = backward compatible (minor/patch)
   *  - Different major = breaking change
   */
  public checkCompatibility(
    eventType: string,
    oldVersion: string,
    newVersion: string
  ): VersionCompatibilityResult {
    const oldMajor = this.extractMajor(oldVersion);
    const newMajor = this.extractMajor(newVersion);

    if (oldMajor === null || newMajor === null) {
      return {
        compatible: false,
        reason: `Invalid semver format. Both versions must follow "MAJOR.MINOR.PATCH" (e.g. "1.0.0").`,
        oldVersion,
        newVersion,
      };
    }

    if (newMajor > oldMajor) {
      return {
        compatible: false,
        reason: `Major version bump from ${oldVersion} to ${newVersion} is a breaking change. Consumers must be updated before the old version is removed.`,
        oldVersion,
        newVersion,
      };
    }

    if (newMajor < oldMajor) {
      return {
        compatible: false,
        reason: `Cannot downgrade schema version from ${oldVersion} to ${newVersion}.`,
        oldVersion,
        newVersion,
      };
    }

    return {
      compatible: true,
      reason: `Version change from ${oldVersion} to ${newVersion} is backward compatible (same major version). New optional fields may be added.`,
      oldVersion,
      newVersion,
    };
  }

  // ---------------------------------------------------------------------------
  // Deprecation
  // ---------------------------------------------------------------------------

  /**
   * Marks a schema version as deprecated.
   * Returns information about active consumers that still reference the version.
   * Does NOT modify the schema registry directly — returns a result for the
   * caller (catalog registry) to act upon.
   */
  public deprecateVersion(
    eventType: string,
    schemaVersion: string,
    activeConsumers: ReadonlyArray<EventConsumer>
  ): DeprecationResult {
    const consumerNames = activeConsumers
      .filter((c) => c.isActive && c.subscribedEventTypes.includes(eventType))
      .map((c) => c.consumerName);

    const deprecatedAt = new Date().toISOString();
    const scheduledRemovalAt = this.getScheduledRemovalDate(deprecatedAt);

    return {
      deprecated: true,
      eventType,
      version: schemaVersion,
      deprecatedAt,
      scheduledRemovalAt,
      activeConsumers: consumerNames,
      canForceRemove: consumerNames.length === 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Window Check
  // ---------------------------------------------------------------------------

  public isWithinDeprecationWindow(deprecatedAt: string): boolean {
    const elapsed = Date.now() - new Date(deprecatedAt).getTime();
    const windowMs = DEPRECATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return elapsed < windowMs;
  }

  public getScheduledRemovalDate(deprecatedAt: string): string {
    const windowMs = DEPRECATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return new Date(new Date(deprecatedAt).getTime() + windowMs).toISOString();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private extractMajor(version: string): number | null {
    const parts = version.split(".");
    if (parts.length < 1) return null;
    const major = parseInt(parts[0], 10);
    return isNaN(major) ? null : major;
  }
}
