/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Registry
 * Module: configuration/config-registry.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Central registry of all ConfigDefinitions (the "schema" for every config key).
 * At bootstrap the platform registers all known keys with their default values,
 * allowed scopes, and metadata. Runtime entries override defaults per scope.
 *
 * Open/Closed: new config keys are registered — the registry class itself is
 * never modified.
 * =============================================================================
 */

import type {
  ConfigDefinition,
  ConfigEntry,
  ConfigValue,
  ConfigScope,
  ConfigDomain,
  ConfigValidationResult,
} from "./types.ts";
import { CONFIG_SCOPE_LEVELS } from "./types.ts";
import { ConfigValidator, configValidator } from "./config-validator.ts";

export interface IConfigRegistry {
  registerDefinition(definition: ConfigDefinition): void;
  getDefinition(key: string): ConfigDefinition | undefined;
  listDefinitions(domain?: ConfigDomain): ReadonlyArray<ConfigDefinition>;

  setEntry(entry: Omit<ConfigEntry, "entryId" | "createdAt" | "updatedAt" | "version">): ConfigEntry;
  getEntry(key: string, scope: ConfigScope): ConfigEntry | undefined;
  listEntries(domain?: ConfigDomain): ReadonlyArray<ConfigEntry>;
  removeEntry(key: string, scope: ConfigScope): boolean;
}

export class ConfigRegistry implements IConfigRegistry {
  /** key → ConfigDefinition */
  private readonly definitions = new Map<string, ConfigDefinition>();

  /** `${key}::${scope.level}::${scope.identifier}` → ConfigEntry */
  private readonly entries = new Map<string, ConfigEntry>();

  constructor(private readonly validator: ConfigValidator = configValidator) {}

  // ---------------------------------------------------------------------------
  // Definitions
  // ---------------------------------------------------------------------------

  public registerDefinition(definition: ConfigDefinition): void {
    const keyValidation = this.validator.validateKey(definition.key);
    if (!keyValidation.valid) {
      throw new Error(
        `[ConfigRegistry] Invalid config key: ${keyValidation.errors.join("; ")}`
      );
    }
    if (this.definitions.has(definition.key)) {
      // Allow re-registration only if version is higher (idempotent upgrades)
      const existing = this.definitions.get(definition.key)!;
      if (definition.definitionVersion <= existing.definitionVersion) {
        return; // Ignore downgrades / duplicates
      }
    }
    this.definitions.set(definition.key, Object.freeze({ ...definition }));
  }

  public getDefinition(key: string): ConfigDefinition | undefined {
    return this.definitions.get(key);
  }

  public listDefinitions(domain?: ConfigDomain): ReadonlyArray<ConfigDefinition> {
    const all = Array.from(this.definitions.values());
    return domain ? all.filter((d) => d.domain === domain) : all;
  }

  // ---------------------------------------------------------------------------
  // Entries
  // ---------------------------------------------------------------------------

  public setEntry(
    entry: Omit<ConfigEntry, "entryId" | "createdAt" | "updatedAt" | "version">
  ): ConfigEntry {
    const definition = this.definitions.get(entry.key);
    if (!definition) {
      throw new Error(
        `[ConfigRegistry] Cannot set entry for unregistered key "${entry.key}". Register a definition first.`
      );
    }

    const scopeValidation = this.validator.validateScopeAllowed(definition, entry.scope);
    if (!scopeValidation.valid) {
      throw new Error(`[ConfigRegistry] ${scopeValidation.errors.join("; ")}`);
    }

    const valueValidation = this.validator.validateValue(definition, entry.value);
    if (!valueValidation.valid) {
      throw new Error(`[ConfigRegistry] ${valueValidation.errors.join("; ")}`);
    }

    const storeKey = this.buildStoreKey(entry.key, entry.scope);
    const existing = this.entries.get(storeKey);
    const now = new Date().toISOString();

    const configEntry: ConfigEntry = Object.freeze({
      entryId: existing?.entryId ?? crypto.randomUUID(),
      key: entry.key,
      value: entry.value,
      scope: entry.scope,
      domain: definition.domain,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: entry.updatedBy,
      version: (existing?.version ?? 0) + 1,
      isActive: entry.isActive,
    });

    this.entries.set(storeKey, configEntry);
    return configEntry;
  }

  public getEntry(key: string, scope: ConfigScope): ConfigEntry | undefined {
    return this.entries.get(this.buildStoreKey(key, scope));
  }

  public listEntries(domain?: ConfigDomain): ReadonlyArray<ConfigEntry> {
    const all = Array.from(this.entries.values()).filter((e) => e.isActive);
    return domain ? all.filter((e) => e.domain === domain) : all;
  }

  public removeEntry(key: string, scope: ConfigScope): boolean {
    return this.entries.delete(this.buildStoreKey(key, scope));
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private buildStoreKey(key: string, scope: ConfigScope): string {
    return `${key}::${scope.level}::${scope.identifier}`;
  }
}
