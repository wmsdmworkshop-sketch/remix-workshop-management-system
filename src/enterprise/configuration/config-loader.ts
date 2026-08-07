/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Loader
 * Module: configuration/config-loader.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8.3 (Configuration Domains)
 *
 * Bootstraps all platform-wide ConfigDefinitions and seeds default GLOBAL entries.
 * This is the single place where known config keys are declared.
 *
 * Open/Closed: to add a new config key, add a new entry to PLATFORM_CONFIG_DEFINITIONS.
 * Do NOT modify the ConfigRegistry or ScopeResolver classes.
 * =============================================================================
 */

import type { ConfigDefinition, ConfigEntry, ConfigScope } from "./types.ts";
import type { IConfigRegistry } from "./config-registry.ts";

// ---------------------------------------------------------------------------
// Platform Config Definitions
// ---------------------------------------------------------------------------

export const PLATFORM_CONFIG_DEFINITIONS: ConfigDefinition[] = [
  // ── SLA ──────────────────────────────────────────────────────────────────
  {
    key: "sla.diagnostic.warning_minutes",
    domain: "SLA",
    description: "Minutes after which a diagnostic job triggers an SLA warning.",
    valueType: "number",
    defaultValue: 30,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH", "WORKSHOP"],
    isSecret: false,
    tags: ["sla", "diagnostic"],
    definitionVersion: "1.0.0",
  },
  {
    key: "sla.total_tat.breach_hours",
    domain: "SLA",
    description: "Total TAT hours after which an SLA breach event is emitted.",
    valueType: "number",
    defaultValue: 24,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH", "WORKSHOP"],
    isSecret: false,
    tags: ["sla", "tat"],
    definitionVersion: "1.0.0",
  },
  {
    key: "sla.wip.max_hours",
    domain: "SLA",
    description: "Maximum WIP stage duration in hours before escalation.",
    valueType: "number",
    defaultValue: 8,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH", "WORKSHOP"],
    isSecret: false,
    tags: ["sla", "wip"],
    definitionVersion: "1.0.0",
  },

  // ── Approval ─────────────────────────────────────────────────────────────
  {
    key: "approval.goodwill.threshold_amount",
    domain: "APPROVAL",
    description: "Goodwill amounts above this value (INR) require manager approval.",
    valueType: "number",
    defaultValue: 5000,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH"],
    isSecret: false,
    tags: ["approval", "goodwill"],
    definitionVersion: "1.0.0",
  },
  {
    key: "approval.warranty.auto_approve_below",
    domain: "APPROVAL",
    description: "Warranty claim amounts below this (INR) can be auto-approved.",
    valueType: "number",
    defaultValue: 1000,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["approval", "warranty"],
    definitionVersion: "1.0.0",
  },

  // ── Notification ─────────────────────────────────────────────────────────
  {
    key: "notification.sla_breach.channels",
    domain: "NOTIFICATION",
    description: "Channels used for SLA breach alerts.",
    valueType: "string[]",
    defaultValue: ["SMS", "IN_APP"],
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH", "WORKSHOP", "ROLE"],
    isSecret: false,
    tags: ["notification", "sla"],
    definitionVersion: "1.0.0",
  },
  {
    key: "notification.digest.frequency",
    domain: "NOTIFICATION",
    description: "Frequency of digest email: 'DAILY' | 'WEEKLY' | 'NEVER'.",
    valueType: "string",
    defaultValue: "DAILY",
    allowedScopes: ["GLOBAL", "DEALER", "ROLE", "USER"],
    isSecret: false,
    tags: ["notification", "digest"],
    definitionVersion: "1.0.0",
  },
  {
    key: "notification.dnd.start_hour",
    domain: "NOTIFICATION",
    description: "Start of DND window (24h format, e.g. 22 = 10 PM).",
    valueType: "number",
    defaultValue: 22,
    allowedScopes: ["GLOBAL", "USER"],
    isSecret: false,
    tags: ["notification", "dnd"],
    definitionVersion: "1.0.0",
  },
  {
    key: "notification.dnd.end_hour",
    domain: "NOTIFICATION",
    description: "End of DND window (24h format, e.g. 7 = 7 AM).",
    valueType: "number",
    defaultValue: 7,
    allowedScopes: ["GLOBAL", "USER"],
    isSecret: false,
    tags: ["notification", "dnd"],
    definitionVersion: "1.0.0",
  },

  // ── Business Rules ────────────────────────────────────────────────────────
  {
    key: "rule.warranty.max_vehicle_age_months",
    domain: "BUSINESS_RULES",
    description: "Maximum vehicle age in months for warranty eligibility.",
    valueType: "number",
    defaultValue: 36,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["warranty", "policy"],
    definitionVersion: "1.0.0",
  },
  {
    key: "rule.amc.grace_period_days",
    domain: "BUSINESS_RULES",
    description: "Grace period in days for expired AMC contracts.",
    valueType: "number",
    defaultValue: 30,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["amc", "policy"],
    definitionVersion: "1.0.0",
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  {
    key: "feature.customer_portal.enabled",
    domain: "FEATURE_FLAGS",
    description: "Enables the customer self-service portal.",
    valueType: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL", "DEALER_GROUP", "DEALER", "BRANCH"],
    isSecret: false,
    tags: ["feature", "portal"],
    definitionVersion: "1.0.0",
  },
  {
    key: "feature.ai_copilot.enabled",
    domain: "FEATURE_FLAGS",
    description: "Enables the AI Copilot panel for service advisors.",
    valueType: "boolean",
    defaultValue: true,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH", "ROLE", "USER"],
    isSecret: false,
    tags: ["feature", "ai"],
    definitionVersion: "1.0.0",
  },
  {
    key: "feature.fleet_360.enabled",
    domain: "FEATURE_FLAGS",
    description: "Enables the Fleet 360 dashboard for fleet owners.",
    valueType: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH"],
    isSecret: false,
    tags: ["feature", "fleet"],
    definitionVersion: "1.0.0",
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    key: "dashboard.refresh_interval_sec",
    domain: "DASHBOARD",
    description: "Interval in seconds for dashboard auto-refresh.",
    valueType: "number",
    defaultValue: 30,
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    isSecret: false,
    tags: ["dashboard", "ui"],
    definitionVersion: "1.0.0",
  },

  // ── AI ────────────────────────────────────────────────────────────────────
  {
    key: "ai.prediction.confidence_threshold",
    domain: "AI",
    description: "Minimum confidence score (0–1) for AI predictions to be surfaced.",
    valueType: "number",
    defaultValue: 0.75,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH"],
    isSecret: false,
    tags: ["ai", "prediction"],
    definitionVersion: "1.0.0",
  },
  {
    key: "ai.recommendation.auto_execute",
    domain: "AI",
    description: "If true, AI recommendations below confidence threshold require human approval.",
    valueType: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["ai", "recommendation"],
    definitionVersion: "1.0.0",
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    key: "analytics.snapshot.interval_minutes",
    domain: "ANALYTICS",
    description: "Frequency of KPI snapshot materialization in minutes.",
    valueType: "number",
    defaultValue: 60,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["analytics", "snapshot"],
    definitionVersion: "1.0.0",
  },

  // ── Integration ───────────────────────────────────────────────────────────
  {
    key: "integration.oracle.sync_interval_min",
    domain: "INTEGRATION",
    description: "Oracle Siebel sync frequency in minutes.",
    valueType: "number",
    defaultValue: 15,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["integration", "oracle"],
    definitionVersion: "1.0.0",
  },
  {
    key: "integration.dms.enabled",
    domain: "INTEGRATION",
    description: "Enables DMS import integration.",
    valueType: "boolean",
    defaultValue: true,
    allowedScopes: ["GLOBAL", "DEALER", "BRANCH"],
    isSecret: false,
    tags: ["integration", "dms"],
    definitionVersion: "1.0.0",
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    key: "security.session.timeout_minutes",
    domain: "SECURITY",
    description: "Session idle timeout in minutes.",
    valueType: "number",
    defaultValue: 30,
    allowedScopes: ["GLOBAL", "DEALER", "ROLE"],
    isSecret: false,
    tags: ["security", "session"],
    definitionVersion: "1.0.0",
  },
  {
    key: "security.mfa.enabled",
    domain: "SECURITY",
    description: "Enforces MFA for all logins when enabled.",
    valueType: "boolean",
    defaultValue: false,
    allowedScopes: ["GLOBAL", "DEALER"],
    isSecret: false,
    tags: ["security", "mfa"],
    definitionVersion: "1.0.0",
  },
];

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export interface IConfigLoader {
  load(registry: IConfigRegistry, actorId?: string): void;
}

export class ConfigLoader implements IConfigLoader {
  private readonly definitions: ConfigDefinition[];

  constructor(definitions: ConfigDefinition[] = PLATFORM_CONFIG_DEFINITIONS) {
    this.definitions = definitions;
  }

  /**
   * Registers all config definitions into the registry.
   * Called once at application bootstrap.
   * Idempotent: safe to call multiple times; re-registration of same version is a no-op.
   */
  public load(registry: IConfigRegistry, actorId: string = "SYSTEM"): void {
    const globalScope: ConfigScope = { level: "GLOBAL", identifier: "GLOBAL" };

    for (const definition of this.definitions) {
      try {
        registry.registerDefinition(definition);

        // Seed the GLOBAL default entry so scope resolver always finds a base value
        registry.setEntry({
          key: definition.key,
          value: definition.defaultValue,
          scope: globalScope,
          domain: definition.domain,
          updatedBy: actorId,
          isActive: true,
        });
      } catch (err: any) {
        // Log but do not throw — partial load should not block startup
        console.error(
          `[ConfigLoader] Failed to register definition for key "${definition.key}": ${err.message}`
        );
      }
    }

    console.log(
      `[ConfigLoader] Loaded ${this.definitions.length} config definitions with GLOBAL defaults.`
    );
  }
}
