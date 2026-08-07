/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Schema Registry
 * Module: event-catalog/schema-registry.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Maintains versioned payload schemas for each event type.
 * The schema registry is append-only: schemas are never deleted, only versioned.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  EventPayloadSchema,
  EventSchemaVersion,
} from "./types.ts";

export interface ISchemaRegistry {
  registerSchema(
    eventType: string,
    schema: EventPayloadSchema,
    schemaVersion: string,
    publishedBy: string,
    changeSummary: string
  ): EventSchemaVersion;

  getLatestSchema(eventType: string): EventSchemaVersion | undefined;
  getSchemaByVersion(eventType: string, schemaVersion: string): EventSchemaVersion | undefined;
  getAllVersions(eventType: string): ReadonlyArray<EventSchemaVersion>;
  listRegisteredEventTypes(): ReadonlyArray<string>;
}

export class SchemaRegistry implements ISchemaRegistry {
  /** eventType → ordered array of schema versions (oldest to newest) */
  private readonly schemas = new Map<string, EventSchemaVersion[]>();

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public registerSchema(
    eventType: string,
    schema: EventPayloadSchema,
    schemaVersion: string,
    publishedBy: string,
    changeSummary: string
  ): EventSchemaVersion {
    if (!eventType || eventType.trim().length === 0) {
      throw new Error("[SchemaRegistry] eventType must not be empty.");
    }
    if (!schemaVersion || schemaVersion.trim().length === 0) {
      throw new Error("[SchemaRegistry] schemaVersion must not be empty.");
    }

    const existing = this.schemas.get(eventType) ?? [];

    // Guard: prevent duplicate version registration
    if (existing.some((v) => v.schemaVersion === schemaVersion)) {
      throw new Error(
        `[SchemaRegistry] Schema version "${schemaVersion}" for event "${eventType}" is already registered.`
      );
    }

    // Mark all previous versions as no longer latest
    const updated = existing.map((v) => ({ ...v, isLatest: false }));

    const record: EventSchemaVersion = Object.freeze({
      versionId: randomUUID(),
      eventType,
      schemaVersion,
      payloadSchema: Object.freeze({ ...schema }),
      publishedAt: new Date().toISOString(),
      publishedBy,
      changeSummary,
      isLatest: true,
      isDeprecated: false,
    });

    updated.push(record);
    this.schemas.set(eventType, updated);
    return record;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public getLatestSchema(eventType: string): EventSchemaVersion | undefined {
    const versions = this.schemas.get(eventType);
    if (!versions || versions.length === 0) return undefined;
    return versions.find((v) => v.isLatest && !v.isDeprecated) ?? versions[versions.length - 1];
  }

  public getSchemaByVersion(
    eventType: string,
    schemaVersion: string
  ): EventSchemaVersion | undefined {
    const versions = this.schemas.get(eventType);
    if (!versions) return undefined;
    return versions.find((v) => v.schemaVersion === schemaVersion);
  }

  public getAllVersions(eventType: string): ReadonlyArray<EventSchemaVersion> {
    return this.schemas.get(eventType) ?? [];
  }

  public listRegisteredEventTypes(): ReadonlyArray<string> {
    return Array.from(this.schemas.keys()).sort();
  }
}
