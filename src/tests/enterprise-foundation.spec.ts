/**
 * =============================================================================
 * DWIP Enterprise Foundation — Integration Test Suite
 * DWIP-V1-ENT-001 Regression Tests
 *
 * Tests all three enterprise foundation modules:
 *   1. Enterprise Configuration Layer
 *   2. Enterprise Event Catalog
 *   3. Enterprise Notification Hub
 *
 * Zero interaction with frozen Kernel, Workflow, Business Programs, or Workshop modules.
 * =============================================================================
 */

// vitest is resolved via npx cache; suppress module-not-found for tsc
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { describe, it, expect, beforeEach } from "vitest";


// ── Configuration Layer
import {
  ConfigValidator,
  ConfigRegistry,
  ConfigVersioningService,
  ConfigCache,
  ConfigurationAuditService,
  ScopeResolver,
  FeatureFlagEngine,
  RuntimeOverridesService,
  ConfigLoader,
  ConfigProvider,
  PLATFORM_CONFIG_DEFINITIONS,
} from "../enterprise/configuration/index.ts";
import type { ConfigScope, ConfigResolutionContext } from "../enterprise/configuration/types.ts";

// ── Event Catalog
import {
  SchemaRegistry,
  ConsumerRegistry,
  LineageTracker,
  CatalogRegistry,
  EventValidator,
  EventVersioningService,
  EventDiscoveryService,
  EventDocumentationService,
  PLATFORM_EVENT_DEFINITIONS,
} from "../enterprise/event-catalog/index.ts";

// ── Notification Hub
import {
  ChannelRegistry,
  TemplateManager,
  PreferenceEngine,
  ChannelSelector,
  DeliveryTracker,
  RetryEngine,
  BatchEngine,
  NotificationHistoryService,
  NotificationAnalyticsService,
  NotificationRouter,
} from "../enterprise/notification-hub/index.ts";
import type {
  NotificationRequest,
  RecipientProfile,
  IChannelProvider,
  NotificationChannel,
  NotificationPriority,
} from "../enterprise/notification-hub/types.ts";
import { randomUUID } from "crypto";

// =============================================================================
// Helpers
// =============================================================================

function makeGlobalScope(): ConfigScope {
  return { level: "GLOBAL", identifier: "GLOBAL" };
}

function makeScope(level: ConfigScope["level"], id: string): ConfigScope {
  return { level, identifier: id };
}

function makeCtx(scopes: ConfigScope[]): ConfigResolutionContext {
  return { scopes };
}

function makeProvider(channel: NotificationChannel, shouldFail = false): IChannelProvider {
  return {
    channel,
    async send(_r, _s, _b, _p, _c) {
      if (shouldFail) throw new Error("Mock provider failure");
      return true;
    },
    async isAvailable() { return !shouldFail; },
  };
}

function makeRecipient(id: string): RecipientProfile {
  return {
    recipientId: id,
    displayName: `User ${id}`,
    channels: { IN_APP: id, SMS: `+91${id}`, WHATSAPP: `+91${id}`, EMAIL: `${id}@dwip.com`, PUSH: id, VOICE: undefined },
    preferredLanguage: "en",
    timezone: "Asia/Kolkata",
    dndStartHour: 23,
    dndEndHour: 6,
    isActive: true,
  };
}

function makeNotificationRequest(overrides: Partial<NotificationRequest> = {}): NotificationRequest {
  return {
    requestId: randomUUID(),
    category: "SLA_ALERT",
    priority: "HIGH",
    recipientIds: ["USR-001"],
    templateKey: "sla.warning",
    templateVariables: {
      job_card_id: "JC-1001",
      stage: "DIAGNOSTIC",
      elapsed_hours: "4",
      threshold_hours: "3",
    },
    correlationId: randomUUID(),
    sourceSystem: "WorkshopCore",
    allowDigest: false,
    allowBatch: false,
    ...overrides,
  };
}

// =============================================================================
// SECTION 1: Enterprise Configuration Layer
// =============================================================================

describe("ENT-CONFIG-001: ConfigValidator", () => {
  const validator = new ConfigValidator();

  it("accepts valid dot-notation keys", () => {
    const r = validator.validateKey("sla.diagnostic.warning_minutes");
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty keys", () => {
    const r = validator.validateKey("");
    expect(r.valid).toBe(false);
  });

  it("rejects keys with invalid characters", () => {
    const r = validator.validateKey("SLA.Diagnostic"); // uppercase
    expect(r.valid).toBe(false);
  });

  it("rejects keys starting with dots", () => {
    const r = validator.validateKey(".sla.key");
    expect(r.valid).toBe(false);
  });

  it("validates number type correctly", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "sla.diagnostic.warning_minutes")!;
    expect(validator.validateValue(def, 30).valid).toBe(true);
    expect(validator.validateValue(def, "30").valid).toBe(false);
  });

  it("validates boolean type correctly", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "feature.ai_copilot.enabled")!;
    expect(validator.validateValue(def, true).valid).toBe(true);
    expect(validator.validateValue(def, 1).valid).toBe(false);
  });

  it("validates string[] type correctly", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "notification.sla_breach.channels")!;
    expect(validator.validateValue(def, ["SMS", "IN_APP"]).valid).toBe(true);
    expect(validator.validateValue(def, "SMS").valid).toBe(false);
  });

  it("validates scope allowance", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "sla.diagnostic.warning_minutes")!;
    expect(validator.validateScopeAllowed(def, makeScope("WORKSHOP", "WS-001")).valid).toBe(true);
    expect(validator.validateScopeAllowed(def, makeScope("USER", "USR-001")).valid).toBe(false);
  });
});

describe("ENT-CONFIG-002: ConfigRegistry", () => {
  let registry: ConfigRegistry;

  beforeEach(() => {
    registry = new ConfigRegistry();
  });

  it("registers a definition", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS[0];
    registry.registerDefinition(def);
    expect(registry.getDefinition(def.key)).toBeDefined();
  });

  it("idempotently ignores same version re-registration", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS[0];
    registry.registerDefinition(def);
    registry.registerDefinition(def); // should not throw
    expect(registry.listDefinitions()).toHaveLength(1);
  });

  it("sets and retrieves an entry", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS[0];
    registry.registerDefinition(def);
    const entry = registry.setEntry({
      key: def.key,
      value: 45,
      scope: makeGlobalScope(),
      domain: def.domain,
      updatedBy: "test",
      isActive: true,
    });
    expect(entry.value).toBe(45);
    expect(entry.version).toBe(1);
  });

  it("increments version on update", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS[0];
    registry.registerDefinition(def);
    const scope = makeGlobalScope();
    registry.setEntry({ key: def.key, value: 30, scope, domain: def.domain, updatedBy: "test", isActive: true });
    const v2 = registry.setEntry({ key: def.key, value: 45, scope, domain: def.domain, updatedBy: "test", isActive: true });
    expect(v2.version).toBe(2);
  });

  it("throws when setting entry for unregistered key", () => {
    expect(() =>
      registry.setEntry({
        key: "unknown.key",
        value: 10,
        scope: makeGlobalScope(),
        domain: "SLA",
        updatedBy: "test",
        isActive: true,
      })
    ).toThrow();
  });

  it("throws when setting entry at disallowed scope", () => {
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "sla.diagnostic.warning_minutes")!;
    registry.registerDefinition(def);
    expect(() =>
      registry.setEntry({
        key: def.key,
        value: 30,
        scope: makeScope("USER", "USR-001"),
        domain: def.domain,
        updatedBy: "test",
        isActive: true,
      })
    ).toThrow();
  });
});

describe("ENT-CONFIG-003: ScopeResolver", () => {
  it("buildScopeChain produces correct order", () => {
    const chain = ScopeResolver.buildScopeChain({
      userId: "U1",
      roleId: "ADVISOR",
      workshopId: "WS-01",
      dealerId: "DLR-01",
    });
    expect(chain[0].level).toBe("USER");
    expect(chain[1].level).toBe("ROLE");
    expect(chain[2].level).toBe("WORKSHOP");
    expect(chain[3].level).toBe("DEALER");
    expect(chain[chain.length - 1].level).toBe("GLOBAL");
  });

  it("resolves most-specific scope first", () => {
    const registry = new ConfigRegistry();
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "sla.diagnostic.warning_minutes")!;
    registry.registerDefinition(def);

    const globalScope = makeGlobalScope();
    const dealerScope = makeScope("DEALER", "DEALER:DLR-01");
    registry.setEntry({ key: def.key, value: 30, scope: globalScope, domain: def.domain, updatedBy: "sys", isActive: true });
    registry.setEntry({ key: def.key, value: 60, scope: dealerScope, domain: def.domain, updatedBy: "sys", isActive: true });

    const resolver = new ScopeResolver();
    const entryMap = new Map(
      registry.listEntries().map((e) => [`${e.key}::${e.scope.level}::${e.scope.identifier}`, e])
    );

    const result = resolver.resolve(
      def.key,
      { scopes: [dealerScope, globalScope] },
      entryMap,
      def
    );
    expect(result.value).toBe(60);
    expect(result.resolvedAtScope.level).toBe("DEALER");
  });

  it("falls back to GLOBAL when no specific scope entry exists", () => {
    const registry = new ConfigRegistry();
    const def = PLATFORM_CONFIG_DEFINITIONS.find((d) => d.key === "sla.diagnostic.warning_minutes")!;
    registry.registerDefinition(def);
    const globalScope = makeGlobalScope();
    registry.setEntry({ key: def.key, value: 30, scope: globalScope, domain: def.domain, updatedBy: "sys", isActive: true });

    const resolver = new ScopeResolver();
    const entryMap = new Map(
      registry.listEntries().map((e) => [`${e.key}::${e.scope.level}::${e.scope.identifier}`, e])
    );

    const result = resolver.resolve(
      def.key,
      { scopes: [makeScope("USER", "USER:USR-999"), globalScope] },
      entryMap,
      def
    );
    expect(result.value).toBe(30);
  });
});

describe("ENT-CONFIG-004: RuntimeOverrides", () => {
  let overrides: RuntimeOverridesService;

  beforeEach(() => {
    overrides = new RuntimeOverridesService();
  });

  it("sets and retrieves an active override", () => {
    const scope = makeGlobalScope();
    const o = overrides.set("sla.diagnostic.warning_minutes", scope, 999, "Test override", "admin-001");
    expect(o.value).toBe(999);
    expect(overrides.get("sla.diagnostic.warning_minutes", scope)?.value).toBe(999);
  });

  it("removes an override", () => {
    const scope = makeGlobalScope();
    overrides.set("sla.diagnostic.warning_minutes", scope, 999, "Test", "admin-001");
    const removed = overrides.remove("sla.diagnostic.warning_minutes", scope, "admin-001");
    expect(removed).toBe(true);
    expect(overrides.get("sla.diagnostic.warning_minutes", scope)).toBeUndefined();
  });

  it("requires a reason when setting override", () => {
    expect(() =>
      overrides.set("some.key", makeGlobalScope(), 42, "", "admin")
    ).toThrow();
  });

  it("rejects past expiry dates", () => {
    expect(() =>
      overrides.set(
        "some.key",
        makeGlobalScope(),
        42,
        "Test",
        "admin",
        "2020-01-01T00:00:00Z"
      )
    ).toThrow();
  });
});

describe("ENT-CONFIG-005: FeatureFlagEngine", () => {
  let engine: FeatureFlagEngine;

  beforeEach(() => {
    engine = new FeatureFlagEngine();
    engine.registerFlag({
      flagKey: "feature.ai_copilot.enabled",
      category: "RELEASE",
      description: "AI Copilot",
      defaultEnabled: true,
      rolloutPercentage: 100,
      allowedScopes: ["GLOBAL", "DEALER", "USER"],
      tags: ["ai"],
    });
  });

  it("evaluates default enabled flag", () => {
    const result = engine.evaluate("feature.ai_copilot.enabled", { scopes: [makeGlobalScope()] });
    expect(result).toBe(true);
  });

  it("evaluates disabled state at scope", () => {
    const scope = makeScope("DEALER", "DEALER:DLR-01");
    engine.setState("feature.ai_copilot.enabled", scope, false, 0, "admin");
    const result = engine.evaluate("feature.ai_copilot.enabled", { scopes: [scope, makeGlobalScope()] });
    expect(result).toBe(false);
  });

  it("returns false for unknown flag", () => {
    expect(engine.evaluate("unknown.flag", { scopes: [makeGlobalScope()] })).toBe(false);
  });
});

describe("ENT-CONFIG-006: ConfigProvider integration", () => {
  let provider: ConfigProvider;

  beforeEach(() => {
    const validator = new ConfigValidator();
    const registry = new ConfigRegistry(validator);
    const versioning = new ConfigVersioningService();
    const cache = new ConfigCache(60_000);
    const audit = new ConfigurationAuditService();
    const scopeResolver = new ScopeResolver();
    const featureFlags = new FeatureFlagEngine();
    const runtimeOverrides = new RuntimeOverridesService();
    const loader = new ConfigLoader();
    loader.load(registry, "SYSTEM");
    provider = new ConfigProvider(registry, scopeResolver, runtimeOverrides, cache, featureFlags);
  });

  it("resolves a GLOBAL default", async () => {
    const result = await provider.resolve("sla.diagnostic.warning_minutes", { scopes: [makeGlobalScope()] });
    expect(result.value).toBe(30);
    expect(result.fromOverride).toBe(false);
  });

  it("resolves a number with getNumber convenience", async () => {
    const val = await provider.getNumber("sla.diagnostic.warning_minutes", { scopes: [makeGlobalScope()] }, 999);
    expect(val).toBe(30);
  });

  it("returns fallback for unknown key via getNumber", async () => {
    const val = await provider.getNumber("unknown.key", { scopes: [makeGlobalScope()] }, 999);
    expect(val).toBe(999);
  });

  it("throws for unknown key via resolve", async () => {
    await expect(
      provider.resolve("unknown.key", { scopes: [makeGlobalScope()] })
    ).rejects.toThrow();
  });

  it("caches resolved values", async () => {
    const r1 = await provider.resolve("sla.diagnostic.warning_minutes", { scopes: [makeGlobalScope()] });
    const r2 = await provider.resolve("sla.diagnostic.warning_minutes", { scopes: [makeGlobalScope()] });
    expect(r1.resolvedAt).toBe(r2.resolvedAt); // Same cached object
  });
});

describe("ENT-CONFIG-007: ConfigLoader bootstraps all definitions", () => {
  it("loads all platform definitions successfully", () => {
    const registry = new ConfigRegistry();
    const loader = new ConfigLoader();
    loader.load(registry, "SYSTEM");
    const defs = registry.listDefinitions();
    expect(defs.length).toBe(PLATFORM_CONFIG_DEFINITIONS.length);
  });

  it("seeds GLOBAL defaults for all definitions", () => {
    const registry = new ConfigRegistry();
    const loader = new ConfigLoader();
    loader.load(registry, "SYSTEM");
    const entries = registry.listEntries();
    expect(entries.length).toBe(PLATFORM_CONFIG_DEFINITIONS.length);
    entries.forEach((e) => expect(e.scope.level).toBe("GLOBAL"));
  });
});

// =============================================================================
// SECTION 2: Enterprise Event Catalog
// =============================================================================

describe("ENT-ECAT-001: SchemaRegistry", () => {
  let registry: SchemaRegistry;
  const schema = {
    type: "object" as const,
    properties: { id: { type: "string" as const, description: "ID" } },
    required: ["id"],
    additionalProperties: false,
  };

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  it("registers a schema", () => {
    const ver = registry.registerSchema("TEST_EVENT", schema, "1.0.0", "Test", "Initial");
    expect(ver.schemaVersion).toBe("1.0.0");
    expect(ver.isLatest).toBe(true);
  });

  it("marks previous version as not latest on new registration", () => {
    registry.registerSchema("TEST_EVENT", schema, "1.0.0", "Test", "Initial");
    registry.registerSchema("TEST_EVENT", schema, "2.0.0", "Test", "v2");
    const v1 = registry.getSchemaByVersion("TEST_EVENT", "1.0.0")!;
    expect(v1.isLatest).toBe(false);
  });

  it("prevents duplicate version registration", () => {
    registry.registerSchema("TEST_EVENT", schema, "1.0.0", "Test", "Initial");
    expect(() =>
      registry.registerSchema("TEST_EVENT", schema, "1.0.0", "Test", "Dup")
    ).toThrow();
  });

  it("returns latest schema", () => {
    registry.registerSchema("TEST_EVENT", schema, "1.0.0", "Test", "v1");
    registry.registerSchema("TEST_EVENT", schema, "1.1.0", "Test", "v2");
    const latest = registry.getLatestSchema("TEST_EVENT");
    expect(latest?.schemaVersion).toBe("1.1.0");
  });
});

describe("ENT-ECAT-002: EventValidator", () => {
  let schemaRegistry: SchemaRegistry;
  let validator: EventValidator;

  beforeEach(() => {
    schemaRegistry = new SchemaRegistry();
    schemaRegistry.registerSchema(
      "JOB_CARD_CREATED",
      {
        type: "object",
        properties: {
          job_card_id: { type: "string", description: "Job card ID" },
          sa_id: { type: "string", description: "SA ID" },
          amount: { type: "number", minimum: 0 },
        },
        required: ["job_card_id", "sa_id"],
        additionalProperties: false,
      },
      "1.0.0",
      "WorkshopCore",
      "Initial"
    );
    validator = new EventValidator(schemaRegistry);
  });

  it("validates a correct payload", () => {
    const result = validator.validate("JOB_CARD_CREATED", { job_card_id: "JC-001", sa_id: "SA-01" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports missing required fields", () => {
    const result = validator.validate("JOB_CARD_CREATED", { job_card_id: "JC-001" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("sa_id"))).toBe(true);
  });

  it("reports wrong type", () => {
    const result = validator.validate("JOB_CARD_CREATED", { job_card_id: 123, sa_id: "SA-01" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("job_card_id"))).toBe(true);
  });

  it("reports number below minimum", () => {
    const result = validator.validate("JOB_CARD_CREATED", { job_card_id: "JC-001", sa_id: "SA-01", amount: -5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("minimum"))).toBe(true);
  });

  it("warns on extra fields when additionalProperties=false", () => {
    const result = validator.validate("JOB_CARD_CREATED", { job_card_id: "JC-001", sa_id: "SA-01", extra: "field" });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns error for unregistered event type", () => {
    const result = validator.validate("UNKNOWN_EVENT", {});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("No schema registered");
  });
});

describe("ENT-ECAT-003: CatalogRegistry with platform events", () => {
  let schemaRegistry: SchemaRegistry;
  let catalogRegistry: CatalogRegistry;

  beforeEach(() => {
    schemaRegistry = new SchemaRegistry();
    catalogRegistry = new CatalogRegistry(schemaRegistry);
    for (const def of PLATFORM_EVENT_DEFINITIONS) {
      catalogRegistry.register(def);
    }
  });

  it("registers all platform event definitions", () => {
    const all = catalogRegistry.list();
    expect(all.length).toBe(PLATFORM_EVENT_DEFINITIONS.length);
  });

  it("retrieves event by type", () => {
    const def = catalogRegistry.get("VEHICLE_GATE_IN");
    expect(def).toBeDefined();
    expect(def?.isCritical).toBe(true);
  });

  it("filters by domain", () => {
    const workshopEvents = catalogRegistry.list("WORKSHOP_CORE");
    expect(workshopEvents.length).toBeGreaterThan(0);
    workshopEvents.forEach((e) => expect(e.domain).toBe("WORKSHOP_CORE"));
  });

  it("marks event as deprecated", () => {
    catalogRegistry.markDeprecated("VEHICLE_GATE_IN", "Use VEHICLE_REGISTERED instead.");
    const def = catalogRegistry.get("VEHICLE_GATE_IN");
    expect(def?.isDeprecated).toBe(true);
    expect(def?.deprecationMessage).toContain("VEHICLE_REGISTERED");
  });
});

describe("ENT-ECAT-004: EventVersioning", () => {
  let registry: SchemaRegistry;
  let versioning: EventVersioningService;

  beforeEach(() => {
    registry = new SchemaRegistry();
    versioning = new EventVersioningService(registry);
  });

  it("backward compatible within same major", () => {
    const result = versioning.checkCompatibility("EVT", "1.0.0", "1.1.0");
    expect(result.compatible).toBe(true);
  });

  it("breaking change across major versions", () => {
    const result = versioning.checkCompatibility("EVT", "1.0.0", "2.0.0");
    expect(result.compatible).toBe(false);
  });

  it("downgrade is incompatible", () => {
    const result = versioning.checkCompatibility("EVT", "2.0.0", "1.0.0");
    expect(result.compatible).toBe(false);
  });

  it("deprecation window is 90 days", () => {
    const deprecatedAt = new Date().toISOString();
    expect(versioning.isWithinDeprecationWindow(deprecatedAt)).toBe(true);
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    expect(versioning.isWithinDeprecationWindow(oldDate)).toBe(false);
  });
});

describe("ENT-ECAT-005: LineageTracker", () => {
  let tracker: LineageTracker;

  beforeEach(() => {
    tracker = new LineageTracker();
    tracker.register({ eventType: "VEHICLE_GATE_IN", produces: ["JOB_CARD_CREATED"], consumedBy: [], workflowStages: ["GATE_IN"] });
    tracker.register({ eventType: "JOB_CARD_CREATED", produces: ["DIAGNOSTIC_STARTED"], consumedBy: ["VEHICLE_GATE_IN"], workflowStages: ["JOB_CREATION"] });
    tracker.register({ eventType: "DIAGNOSTIC_STARTED", produces: ["DIAGNOSTIC_COMPLETED"], consumedBy: ["JOB_CARD_CREATED"], workflowStages: ["DIAGNOSTIC"] });
  });

  it("returns upstream events", () => {
    const upstream = tracker.getUpstream("JOB_CARD_CREATED");
    expect(upstream).toContain("VEHICLE_GATE_IN");
  });

  it("returns downstream events", () => {
    const downstream = tracker.getDownstream("VEHICLE_GATE_IN");
    expect(downstream).toContain("JOB_CARD_CREATED");
  });

  it("finds transitively impacted events via BFS", () => {
    const impacted = tracker.findImpactedBy("VEHICLE_GATE_IN");
    expect(impacted).toContain("JOB_CARD_CREATED");
    expect(impacted).toContain("DIAGNOSTIC_STARTED");
    expect(impacted).toContain("DIAGNOSTIC_COMPLETED");
  });
});

describe("ENT-ECAT-006: EventDiscovery", () => {
  let catalogReg: CatalogRegistry;
  let consumerReg: ConsumerRegistry;
  let discovery: EventDiscoveryService;

  beforeEach(() => {
    const schemaReg = new SchemaRegistry();
    catalogReg = new CatalogRegistry(schemaReg);
    consumerReg = new ConsumerRegistry();
    for (const def of PLATFORM_EVENT_DEFINITIONS) catalogReg.register(def);
    discovery = new EventDiscoveryService(catalogReg, consumerReg);
  });

  it("finds critical events", () => {
    const results = discovery.findCritical();
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.isCritical).toBe(true));
  });

  it("finds events by domain", () => {
    const results = discovery.findByDomain("WORKSHOP_CORE");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.domain).toBe("WORKSHOP_CORE"));
  });

  it("full-text search works", () => {
    const results = discovery.search({ searchText: "warranty" });
    expect(results.some((r) => r.eventType.toLowerCase().includes("warranty"))).toBe(true);
  });

  it("summarize returns correct totals", () => {
    const summary = discovery.summarize();
    expect(summary.totalEvents).toBe(PLATFORM_EVENT_DEFINITIONS.length);
    expect(summary.criticalEvents).toBeGreaterThan(0);
  });
});

// =============================================================================
// SECTION 3: Enterprise Notification Hub
// =============================================================================

describe("ENT-NOTIF-001: TemplateManager", () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  it("bootstraps platform templates", () => {
    const inAppTemplates = manager.listByChannel("IN_APP");
    expect(inAppTemplates.length).toBeGreaterThan(0);
  });

  it("retrieves template by key and channel", () => {
    const template = manager.get("sla.warning", "IN_APP");
    expect(template).toBeDefined();
    expect(template?.templateKey).toBe("sla.warning");
  });

  it("renders a template with variables", () => {
    const template = manager.get("sla.warning", "IN_APP")!;
    const rendered = manager.render(template.templateId, {
      job_card_id: "JC-1001",
      stage: "DIAGNOSTIC",
      elapsed_hours: "4",
      threshold_hours: "3",
    });
    expect(rendered.body).toContain("JC-1001");
    expect(rendered.body).toContain("DIAGNOSTIC");
    expect(rendered.missingVariables).toHaveLength(0);
  });

  it("tracks missing variables in rendered output", () => {
    const template = manager.get("sla.warning", "IN_APP")!;
    const rendered = manager.render(template.templateId, { job_card_id: "JC-1001" });
    expect(rendered.missingVariables.length).toBeGreaterThan(0);
  });

  it("supports template versioning", () => {
    const template = manager.get("sla.warning", "IN_APP")!;
    const updated = manager.update(template.templateId, "New body content {{job_card_id}}");
    expect(updated.version).toBe(2);
    expect(updated.bodyTemplate).toBe("New body content {{job_card_id}}");
  });
});

describe("ENT-NOTIF-002: PreferenceEngine", () => {
  let engine: PreferenceEngine;

  beforeEach(() => {
    engine = new PreferenceEngine();
    engine.setProfile(makeRecipient("USR-001"));
  });

  it("stores and retrieves recipient profiles", () => {
    const profile = engine.getProfile("USR-001");
    expect(profile).toBeDefined();
    expect(profile?.recipientId).toBe("USR-001");
  });

  it("returns default channels when no preference set", () => {
    const channels = engine.getEnabledChannels("USR-001", "SLA_ALERT", "HIGH");
    expect(channels).toContain("IN_APP");
  });

  it("respects user preference override", () => {
    engine.setPreference("USR-001", "SLA_ALERT", ["PUSH"], "USER");
    const channels = engine.getEnabledChannels("USR-001", "SLA_ALERT", "LOW");
    expect(channels).toContain("PUSH");
  });

  it("forces IN_APP for HIGH priority", () => {
    engine.setPreference("USR-001", "SLA_ALERT", ["SMS"], "USER");
    const channels = engine.getEnabledChannels("USR-001", "SLA_ALERT", "HIGH");
    expect(channels).toContain("IN_APP");
  });

  it("resolves recipient address for channel", () => {
    const addr = engine.getRecipientAddress("USR-001", "EMAIL");
    expect(addr).toBe("USR-001@dwip.com");
  });
});

describe("ENT-NOTIF-003: ChannelSelector", () => {
  let channelRegistry: ChannelRegistry;
  let preferenceEngine: PreferenceEngine;
  let selector: ChannelSelector;

  beforeEach(() => {
    channelRegistry = new ChannelRegistry();
    channelRegistry.register(makeProvider("IN_APP"));
    channelRegistry.register(makeProvider("SMS"));
    preferenceEngine = new PreferenceEngine();
    preferenceEngine.setProfile(makeRecipient("USR-001"));
    selector = new ChannelSelector(channelRegistry, preferenceEngine);
  });

  it("selects available channels", () => {
    const result = selector.select(makeNotificationRequest(), "USR-001");
    expect(result.selectedChannels).toContain("IN_APP");
  });

  it("suppresses channels with no provider", () => {
    // Only IN_APP and SMS registered — WHATSAPP has no provider
    preferenceEngine.setPreference("USR-001", "SLA_ALERT", ["WHATSAPP"], "USER");
    const result = selector.select(makeNotificationRequest(), "USR-001");
    expect(result.suppressedChannels).toContain("WHATSAPP");
    expect(result.suppressionReasons["WHATSAPP"]).toBeDefined();
  });

  it("forces IN_APP for CRITICAL when all channels suppressed", () => {
    preferenceEngine.setPreference("USR-001", "SLA_ALERT", ["EMAIL"], "USER");
    // EMAIL provider not registered
    const result = selector.select(makeNotificationRequest({ priority: "CRITICAL" }), "USR-001");
    expect(result.selectedChannels).toContain("IN_APP");
  });
});

describe("ENT-NOTIF-004: DeliveryTracker", () => {
  let tracker: DeliveryTracker;

  beforeEach(() => {
    tracker = new DeliveryTracker();
  });

  function makeRecord(id = randomUUID()): any {
    return {
      notificationId: id,
      requestId: "REQ-001",
      recipientId: "USR-001",
      channel: "IN_APP" as NotificationChannel,
      category: "SLA_ALERT",
      priority: "HIGH" as NotificationPriority,
      body: "Test body",
      status: "QUEUED",
      correlationId: "COR-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 0,
      maxAttempts: 3,
    };
  }

  it("records and retrieves a notification", () => {
    const id = randomUUID();
    const rec = makeRecord(id);
    tracker.recordCreated(rec);
    expect(tracker.get(id)).toBeDefined();
  });

  it("transitions to SENT status", () => {
    const id = randomUUID();
    const rec = makeRecord(id);
    tracker.recordCreated(rec);
    const updated = tracker.recordSent(id, new Date().toISOString());
    expect(updated?.status).toBe("SENT");
  });

  it("transitions to RETRYING on first failure", () => {
    const id = randomUUID();
    const rec = makeRecord(id);
    tracker.recordCreated(rec);
    const updated = tracker.recordFailed(id, "Timeout", new Date(Date.now() + 5000).toISOString());
    expect(updated?.status).toBe("RETRYING");
  });

  it("transitions to FAILED when max attempts reached", () => {
    const id = randomUUID();
    const rec = { ...makeRecord(id), attemptCount: 3, maxAttempts: 3 };
    tracker.recordCreated(rec);
    const updated = tracker.recordFailed(id, "Final failure");
    expect(updated?.status).toBe("FAILED");
  });

  it("retrieves delivery events for a notification", () => {
    const id = randomUUID();
    const rec = makeRecord(id);
    tracker.recordCreated(rec);
    tracker.recordSent(id, new Date().toISOString());
    const events = tracker.getDeliveryEvents(id);
    expect(events.length).toBeGreaterThan(0);
  });
});


describe("ENT-NOTIF-005: NotificationRouter integration", () => {
  let router: NotificationRouter;
  let channelReg: ChannelRegistry;
  let prefEngine: PreferenceEngine;
  let delivTracker: DeliveryTracker;

  beforeEach(() => {
    channelReg = new ChannelRegistry();
    channelReg.register(makeProvider("IN_APP"));
    channelReg.register(makeProvider("SMS"));
    prefEngine = new PreferenceEngine();
    prefEngine.setProfile(makeRecipient("USR-001"));

    const templateMgr = new TemplateManager();
    delivTracker = new DeliveryTracker();
    const retryEng = new RetryEngine(delivTracker, channelReg);
    const batchEng = new BatchEngine(delivTracker, channelReg);
    const chanSelector = new ChannelSelector(channelReg, prefEngine);

    router = new NotificationRouter(
      chanSelector,
      templateMgr,
      channelReg,
      delivTracker,
      retryEng,
      batchEng,
      prefEngine
    );
  });

  it("routes a HIGH priority notification and returns records", async () => {
    const request = makeNotificationRequest({ recipientIds: ["USR-001"] });
    const records = await router.route(request);
    expect(records.length).toBeGreaterThan(0);
  });

  it("marks notification as SENT when provider succeeds", async () => {
    prefEngine.setPreference("USR-001", "SLA_ALERT", ["IN_APP"], "USER");
    const request = makeNotificationRequest({ recipientIds: ["USR-001"], allowBatch: false });
    const records = await router.route(request);
    const sentRecords = records.filter((r) => r.status === "SENT");
    expect(sentRecords.length).toBeGreaterThan(0);
  });

  it("batches LOW priority notifications when allowBatch=true", async () => {
    prefEngine.setPreference("USR-001", "SLA_ALERT", ["IN_APP"], "USER");
    const request = makeNotificationRequest({
      recipientIds: ["USR-001"],
      priority: "LOW",
      allowBatch: true,
    });
    const records = await router.route(request);
    expect(records.some((r) => r.status === "BATCHED")).toBe(true);
  });

  it("handles CRITICAL with fallback when no preferred channel available", async () => {
    prefEngine.setPreference("USR-001", "SLA_ALERT", ["EMAIL"], "USER");
    // EMAIL not registered
    const request = makeNotificationRequest({
      recipientIds: ["USR-001"],
      priority: "CRITICAL",
      allowBatch: false,
    });
    const records = await router.route(request);
    expect(records.length).toBeGreaterThan(0);
  });

  it("throws when request has no recipients", async () => {
    await expect(
      router.route(makeNotificationRequest({ recipientIds: [] }))
    ).rejects.toThrow();
  });

  it("validates requestId presence", async () => {
    await expect(
      router.route({ ...makeNotificationRequest(), requestId: "" })
    ).rejects.toThrow();
  });
});

describe("ENT-NOTIF-006: RetryEngine", () => {
  let delivTracker: DeliveryTracker;
  let channelReg: ChannelRegistry;
  let retryEngine: RetryEngine;

  beforeEach(() => {
    delivTracker = new DeliveryTracker();
    channelReg = new ChannelRegistry();
    retryEngine = new RetryEngine(delivTracker, channelReg);
  });

  it("schedules a retry within maxAttempts", () => {
    const record: any = {
      notificationId: "N-RETRY-001",
      channel: "SMS",
      attemptCount: 0,
      maxAttempts: 5,
      correlationId: "COR-001",
      recipientId: "USR-001",
      body: "Test",
      priority: "HIGH",
      status: "QUEUED",
    };
    delivTracker.recordCreated(record);
    const result = retryEngine.scheduleRetry(record);
    expect(result.willRetry).toBe(true);
    expect(result.nextRetryAt).toBeDefined();
  });

  it("marks as permanently failed when max attempts exceeded", () => {
    const record: any = {
      notificationId: "N-RETRY-002",
      channel: "SMS",
      attemptCount: 5,
      maxAttempts: 5,
      correlationId: "COR-001",
      recipientId: "USR-001",
      body: "Test",
      priority: "HIGH",
      status: "RETRYING",
    };
    delivTracker.recordCreated(record);
    const result = retryEngine.scheduleRetry(record);
    expect(result.willRetry).toBe(false);
  });

  it("policy override works", () => {
    retryEngine.overridePolicy("EMAIL", {
      maxAttempts: 10,
      initialDelayMs: 1000,
      backoffMultiplier: 1.5,
      maxDelayMs: 30000,
    });
    const policy = retryEngine.getPolicy("EMAIL");
    expect(policy.maxAttempts).toBe(10);
  });
});

describe("ENT-NOTIF-007: NotificationHistory", () => {
  let tracker: DeliveryTracker;
  let history: NotificationHistoryService;

  beforeEach(() => {
    tracker = new DeliveryTracker();
    history = new NotificationHistoryService(tracker);
  });

  it("queries by recipient", () => {
    const rec: any = {
      notificationId: randomUUID(),
      requestId: "REQ-001",
      recipientId: "USR-001",
      channel: "IN_APP",
      category: "SLA_ALERT",
      priority: "HIGH",
      body: "Test",
      status: "SENT",
      correlationId: "COR-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 1,
      maxAttempts: 3,
    };
    tracker.recordCreated(rec);
    tracker.recordSent(rec.notificationId, new Date().toISOString());

    const page = history.query({ recipientId: "USR-001" });
    expect(page.total).toBeGreaterThan(0);
  });

  it("paginates results correctly", () => {
    for (let i = 0; i < 10; i++) {
      const rec: any = {
        notificationId: randomUUID(),
        requestId: "REQ-001",
        recipientId: "USR-PAG",
        channel: "IN_APP",
        category: "SLA_ALERT",
        priority: "LOW",
        body: `Test ${i}`,
        status: "SENT",
        correlationId: "COR-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attemptCount: 1,
        maxAttempts: 3,
      };
      tracker.recordCreated(rec);
      tracker.recordSent(rec.notificationId, new Date().toISOString());
    }
    const page = history.query({ recipientId: "USR-PAG", limit: 5, offset: 0 });
    expect(page.records.length).toBe(5);
    expect(page.hasMore).toBe(true);
  });
});

describe("ENT-NOTIF-008: NotificationAnalytics", () => {
  let tracker: DeliveryTracker;
  let analytics: NotificationAnalyticsService;

  beforeEach(() => {
    tracker = new DeliveryTracker();
    analytics = new NotificationAnalyticsService(tracker);
  });

  it("generates a snapshot with correct totals", () => {
    const rec: any = {
      notificationId: randomUUID(),
      requestId: "REQ-001",
      recipientId: "USR-001",
      channel: "IN_APP",
      category: "SLA_ALERT",
      priority: "HIGH",
      body: "Test",
      status: "SENT",
      correlationId: "COR-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: 1,
      maxAttempts: 3,
    };
    tracker.recordCreated(rec);
    tracker.recordSent(rec.notificationId, new Date().toISOString());

    const now = new Date();
    const snapshot = analytics.generateSnapshot(
      new Date(now.getTime() - 60000).toISOString(),
      now.toISOString()
    );
    expect(snapshot.totalSent).toBe(1);
    expect(snapshot.successRate).toBe(1);
  });

  it("getRetryPattern returns a report", () => {
    const report = analytics.getRetryPattern();
    expect(report).toBeDefined();
    expect(typeof report.totalRetried).toBe("number");
  });
});
