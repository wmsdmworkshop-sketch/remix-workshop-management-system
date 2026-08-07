/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Scope Resolver
 * Module: configuration/scope-resolver.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Implements the 8-level hierarchical config resolution algorithm.
 * Given a resolution context (ordered list of scopes most → least specific),
 * it walks from the most specific scope toward GLOBAL and returns the first
 * active entry found. Runtime overrides always win.
 *
 * Resolution Order (precedence, high to low):
 *   USER > ROLE > DEPARTMENT > WORKSHOP > BRANCH > DEALER > DEALER_GROUP > GLOBAL
 * =============================================================================
 */

import type {
  ConfigScope,
  ConfigEntry,
  ConfigValue,
  ConfigResolutionContext,
  ResolvedConfigValue,
  ConfigDefinition,
  ConfigScopeLevel,
} from "./types.ts";
import { CONFIG_SCOPE_LEVELS } from "./types.ts";

export interface IScopeResolver {
  resolve(
    key: string,
    context: ConfigResolutionContext,
    entries: Map<string, ConfigEntry>,
    definition: ConfigDefinition,
    overrideEntry?: ConfigEntry
  ): ResolvedConfigValue;
}

export class ScopeResolver implements IScopeResolver {
  /**
   * Resolves a config key against the provided scope context.
   *
   * Algorithm:
   *  1. If an active runtime override exists for any scope in the context → use it.
   *  2. Walk each scope in `context.scopes` (caller orders most-specific first).
   *  3. For each scope, attempt to find an active ConfigEntry.
   *  4. If found → return it.
   *  5. After exhausting explicit scopes, fall back to GLOBAL default.
   *  6. If no entry exists anywhere → return the definition default value.
   */
  public resolve(
    key: string,
    context: ConfigResolutionContext,
    entries: Map<string, ConfigEntry>,
    definition: ConfigDefinition,
    overrideEntry?: ConfigEntry
  ): ResolvedConfigValue {
    const resolvedAt = new Date().toISOString();

    // Step 1: Runtime override wins unconditionally
    if (overrideEntry && overrideEntry.isActive) {
      return {
        key,
        value: overrideEntry.value,
        resolvedAtScope: overrideEntry.scope,
        domain: definition.domain,
        fromOverride: true,
        resolvedAt,
      };
    }

    // Step 2–4: Walk scopes most-specific → least-specific
    for (const scope of context.scopes) {
      const storeKey = this.buildStoreKey(key, scope);
      const entry = entries.get(storeKey);
      if (entry && entry.isActive) {
        return {
          key,
          value: entry.value,
          resolvedAtScope: scope,
          domain: definition.domain,
          fromOverride: false,
          resolvedAt,
        };
      }
    }

    // Step 5: GLOBAL fallback (look for a GLOBAL scope entry)
    const globalScope: ConfigScope = { level: "GLOBAL", identifier: "GLOBAL" };
    const globalKey = this.buildStoreKey(key, globalScope);
    const globalEntry = entries.get(globalKey);
    if (globalEntry && globalEntry.isActive) {
      return {
        key,
        value: globalEntry.value,
        resolvedAtScope: globalScope,
        domain: definition.domain,
        fromOverride: false,
        resolvedAt,
      };
    }

    // Step 6: Definition default
    return {
      key,
      value: definition.defaultValue,
      resolvedAtScope: { level: "GLOBAL", identifier: "GLOBAL" },
      domain: definition.domain,
      fromOverride: false,
      resolvedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildStoreKey(key: string, scope: ConfigScope): string {
    return `${key}::${scope.level}::${scope.identifier}`;
  }

  /**
   * Builds a canonical scope chain from a flat identity context.
   * Returns scopes ordered from most-specific to least-specific,
   * ready to be passed as `context.scopes`.
   */
  public static buildScopeChain(identity: {
    userId?: string;
    roleId?: string;
    departmentId?: string;
    workshopId?: string;
    branchId?: string;
    dealerId?: string;
    dealerGroupId?: string;
  }): ConfigScope[] {
    const chain: ConfigScope[] = [];

    if (identity.userId) {
      chain.push({ level: "USER", identifier: `USER:${identity.userId}` });
    }
    if (identity.roleId) {
      chain.push({ level: "ROLE", identifier: `ROLE:${identity.roleId}` });
    }
    if (identity.departmentId) {
      chain.push({ level: "DEPARTMENT", identifier: `DEPT:${identity.departmentId}` });
    }
    if (identity.workshopId) {
      chain.push({ level: "WORKSHOP", identifier: `WORKSHOP:${identity.workshopId}` });
    }
    if (identity.branchId) {
      chain.push({ level: "BRANCH", identifier: `BRANCH:${identity.branchId}` });
    }
    if (identity.dealerId) {
      chain.push({ level: "DEALER", identifier: `DEALER:${identity.dealerId}` });
    }
    if (identity.dealerGroupId) {
      chain.push({ level: "DEALER_GROUP", identifier: `DG:${identity.dealerGroupId}` });
    }

    // Always append GLOBAL as final fallback
    chain.push({ level: "GLOBAL", identifier: "GLOBAL" });
    return chain;
  }
}
