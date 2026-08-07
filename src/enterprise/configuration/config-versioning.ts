/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Versioning Service
 * Module: configuration/config-versioning.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Manages immutable version history for all configuration changes.
 * Single Responsibility: record and query config change history only.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  ConfigVersionRecord,
  ConfigValue,
  ConfigScope,
} from "./types.ts";

export interface IConfigVersioning {
  record(
    key: string,
    scope: ConfigScope,
    previousValue: ConfigValue,
    newValue: ConfigValue,
    changedBy: string,
    changeReason: string,
    currentVersion: number
  ): ConfigVersionRecord;

  getHistory(key: string, scope: ConfigScope): ReadonlyArray<ConfigVersionRecord>;
  getLatestVersion(key: string, scope: ConfigScope): number;
  getAllHistory(): ReadonlyArray<ConfigVersionRecord>;
}

export class ConfigVersioningService implements IConfigVersioning {
  /** In-memory version ledger. Future: replace backing store with persistent DB. */
  private readonly records: ConfigVersionRecord[] = [];

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public record(
    key: string,
    scope: ConfigScope,
    previousValue: ConfigValue,
    newValue: ConfigValue,
    changedBy: string,
    changeReason: string,
    currentVersion: number
  ): ConfigVersionRecord {
    const record: ConfigVersionRecord = Object.freeze({
      versionId: randomUUID(),
      key,
      scope,
      previousValue,
      newValue,
      changedBy,
      changedAt: new Date().toISOString(),
      changeReason,
      version: currentVersion,
    });

    this.records.push(record);
    return record;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public getHistory(key: string, scope: ConfigScope): ReadonlyArray<ConfigVersionRecord> {
    return this.records
      .filter(
        (r) =>
          r.key === key &&
          r.scope.level === scope.level &&
          r.scope.identifier === scope.identifier
      )
      .sort((a, b) => a.version - b.version);
  }

  public getLatestVersion(key: string, scope: ConfigScope): number {
    const history = this.getHistory(key, scope);
    if (history.length === 0) return 0;
    return history[history.length - 1].version;
  }

  public getAllHistory(): ReadonlyArray<ConfigVersionRecord> {
    return [...this.records].sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    );
  }
}
