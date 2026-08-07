/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Configuration Audit Service
 * Module: configuration/configuration-audit.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Immutable append-only audit ledger for all configuration mutations.
 * Records every SET, UPDATE, DELETE, OVERRIDE, and TOGGLE operation with full
 * before/after provenance. Does not use or depend on Kernel's AuditEngine —
 * the Config Layer owns its own audit trail.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  ConfigAuditRecord,
  ConfigAuditAction,
  ConfigValue,
  ConfigScope,
} from "./types.ts";

export interface IConfigurationAudit {
  record(
    action: ConfigAuditAction,
    key: string,
    scope: ConfigScope,
    actorId: string,
    actorRole: string,
    correlationId: string,
    details: string,
    previousValue?: ConfigValue,
    newValue?: ConfigValue
  ): ConfigAuditRecord;

  query(options: ConfigAuditQueryOptions): ReadonlyArray<ConfigAuditRecord>;
  getAll(): ReadonlyArray<ConfigAuditRecord>;
}

export interface ConfigAuditQueryOptions {
  key?: string;
  scope?: ConfigScope;
  actorId?: string;
  action?: ConfigAuditAction;
  since?: string; // ISO-8601
  until?: string; // ISO-8601
  limit?: number;
}

export class ConfigurationAuditService implements IConfigurationAudit {
  /** Append-only ledger. Production: replace with persistent store. */
  private readonly ledger: ConfigAuditRecord[] = [];

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public record(
    action: ConfigAuditAction,
    key: string,
    scope: ConfigScope,
    actorId: string,
    actorRole: string,
    correlationId: string,
    details: string,
    previousValue?: ConfigValue,
    newValue?: ConfigValue
  ): ConfigAuditRecord {
    const auditRecord: ConfigAuditRecord = Object.freeze({
      auditId: randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      key,
      scope,
      actorId,
      actorRole,
      previousValue,
      newValue,
      correlationId,
      details,
    });

    this.ledger.push(auditRecord);
    return auditRecord;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public query(options: ConfigAuditQueryOptions): ReadonlyArray<ConfigAuditRecord> {
    let results = [...this.ledger];

    if (options.key) {
      results = results.filter((r) => r.key === options.key);
    }
    if (options.scope) {
      results = results.filter(
        (r) =>
          r.scope.level === options.scope!.level &&
          r.scope.identifier === options.scope!.identifier
      );
    }
    if (options.actorId) {
      results = results.filter((r) => r.actorId === options.actorId);
    }
    if (options.action) {
      results = results.filter((r) => r.action === options.action);
    }
    if (options.since) {
      const since = new Date(options.since).getTime();
      results = results.filter((r) => new Date(r.timestamp).getTime() >= since);
    }
    if (options.until) {
      const until = new Date(options.until).getTime();
      results = results.filter((r) => new Date(r.timestamp).getTime() <= until);
    }

    // Sort chronologically (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  public getAll(): ReadonlyArray<ConfigAuditRecord> {
    return [...this.ledger].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
