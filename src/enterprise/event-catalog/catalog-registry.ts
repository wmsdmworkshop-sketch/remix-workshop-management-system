/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Catalog Registry
 * Module: event-catalog/catalog-registry.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Master catalog of all EventDefinitions. Pre-seeded with all 48 platform events
 * from the DWIP-V1-ARCH-011 Event Catalog (Section 6).
 *
 * Open/Closed: new events are added to PLATFORM_EVENT_DEFINITIONS only.
 * The CatalogRegistry class itself is never modified.
 * =============================================================================
 */

import type { EventDefinition, EventCatalogDomain } from "./types.ts";
import type { ISchemaRegistry } from "./schema-registry.ts";

export interface ICatalogRegistry {
  register(definition: EventDefinition): void;
  get(eventType: string): EventDefinition | undefined;
  list(domain?: EventCatalogDomain): ReadonlyArray<EventDefinition>;
  /** Alias for list() — satisfies the ICatalogReader interface used by EventDiscoveryService */
  listDefinitions(): ReadonlyArray<EventDefinition>;
  markDeprecated(eventType: string, message: string): boolean;
}

export class CatalogRegistry implements ICatalogRegistry {
  private readonly catalog = new Map<string, EventDefinition>();

  constructor(private readonly schemaRegistry: ISchemaRegistry) {}

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public register(definition: EventDefinition): void {
    if (!definition.eventType || definition.eventType.trim().length === 0) {
      throw new Error("[CatalogRegistry] eventType must not be empty.");
    }

    const existing = this.catalog.get(definition.eventType);
    if (existing) {
      // Allow re-registration only if schema version is higher
      if (definition.schemaVersion <= existing.schemaVersion) return;
    }

    // Register the payload schema alongside the catalog entry
    try {
      this.schemaRegistry.registerSchema(
        definition.eventType,
        definition.payloadSchema,
        definition.schemaVersion,
        definition.producer,
        `Initial registration: ${definition.catalogId}`
      );
    } catch {
      // Schema version already registered — idempotent re-registration is OK
    }

    this.catalog.set(definition.eventType, Object.freeze({ ...definition }));
  }

  public markDeprecated(eventType: string, message: string): boolean {
    const existing = this.catalog.get(eventType);
    if (!existing) return false;

    this.catalog.set(
      eventType,
      Object.freeze({
        ...existing,
        isDeprecated: true,
        deprecatedAt: new Date().toISOString(),
        deprecationMessage: message,
      })
    );
    return true;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public get(eventType: string): EventDefinition | undefined {
    return this.catalog.get(eventType);
  }

  public list(domain?: EventCatalogDomain): ReadonlyArray<EventDefinition> {
    const all = Array.from(this.catalog.values());
    return domain ? all.filter((e) => e.domain === domain) : all;
  }

  /** Alias for list() — satisfies ICatalogReader interface. */
  public listDefinitions(): ReadonlyArray<EventDefinition> {
    return this.list();
  }

  /** Alias for get() — satisfies ICatalogReader interface. */
  public getDefinition(eventType: string): EventDefinition | undefined {
    return this.get(eventType);
  }
}

// ---------------------------------------------------------------------------
// Platform Event Definitions (pre-seeded from DWIP-V1-ARCH-011 § 6)
// ---------------------------------------------------------------------------

export const PLATFORM_EVENT_DEFINITIONS: EventDefinition[] = [
  // ── Workshop Core Domain ────────────────────────────────────────────────────
  {
    catalogId: "EVT-WOC-001",
    eventType: "VEHICLE_GATE_IN",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Emitted when a vehicle passes through the workshop gate and is registered.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        registration_number: { type: "string", description: "Vehicle registration number" },
        job_card_id: { type: "string", description: "Job card ID created at gate-in" },
        gate_in_time: { type: "string", description: "ISO-8601 gate-in timestamp" },
        customer_id: { type: "string", description: "Customer ID" },
        workshop_id: { type: "string", description: "Workshop identifier" },
      },
      required: ["registration_number", "job_card_id", "gate_in_time", "workshop_id"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["gate-in", "vehicle", "critical"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-002",
    eventType: "JOB_CARD_CREATED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Emitted when a new job card is created for a service request.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string", description: "Unique job card identifier" },
        vehicle_id: { type: "string", description: "Vehicle identifier" },
        service_type: { type: "string", description: "Type of service requested" },
        sa_id: { type: "string", description: "Service advisor user ID" },
        created_at: { type: "string", description: "ISO-8601 creation timestamp" },
      },
      required: ["job_card_id", "vehicle_id", "service_type", "sa_id", "created_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["job-card", "service"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-003",
    eventType: "DIAGNOSTIC_STARTED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Emitted when diagnostic phase begins on a job card.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        technician_id: { type: "string" },
        started_at: { type: "string" },
      },
      required: ["job_card_id", "technician_id", "started_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["diagnostic", "technician"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-004",
    eventType: "DIAGNOSTIC_COMPLETED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Emitted when diagnostic phase completes.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        findings: { type: "string", description: "Summary of diagnostic findings" },
        completed_at: { type: "string" },
        technician_id: { type: "string" },
      },
      required: ["job_card_id", "completed_at", "technician_id"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["diagnostic"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-005",
    eventType: "ESTIMATION_APPROVED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Customer has approved the repair estimation.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        estimation_amount: { type: "number" },
        approved_by: { type: "string" },
        approved_at: { type: "string" },
      },
      required: ["job_card_id", "estimation_amount", "approved_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["estimation", "approval"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-006",
    eventType: "REPAIR_STARTED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Repair/WIP phase has begun on the job card.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        bay_id: { type: "string" },
        technician_id: { type: "string" },
        started_at: { type: "string" },
      },
      required: ["job_card_id", "bay_id", "technician_id", "started_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["wip", "repair"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-007",
    eventType: "REPAIR_COMPLETED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Repair phase is complete; vehicle awaiting QC.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        completed_at: { type: "string" },
        technician_id: { type: "string" },
      },
      required: ["job_card_id", "completed_at", "technician_id"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["repair", "wip"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-008",
    eventType: "QC_PASSED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Quality check passed; vehicle ready for delivery.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        qc_officer_id: { type: "string" },
        passed_at: { type: "string" },
        score: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["job_card_id", "qc_officer_id", "passed_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["qc", "delivery"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-009",
    eventType: "VEHICLE_DELIVERED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Vehicle has been delivered to the customer.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        delivered_at: { type: "string" },
        delivered_by: { type: "string" },
        customer_signature: { type: "boolean" },
      },
      required: ["job_card_id", "delivered_at", "delivered_by"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["delivery", "customer"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-010",
    eventType: "SLA_WARNING_TRIGGERED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "Job card is approaching its SLA breach threshold.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        current_stage: { type: "string" },
        elapsed_hours: { type: "number" },
        threshold_hours: { type: "number" },
        triggered_at: { type: "string" },
      },
      required: ["job_card_id", "current_stage", "elapsed_hours", "triggered_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["sla", "alert"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-WOC-011",
    eventType: "SLA_BREACH_OCCURRED",
    domain: "WORKSHOP_CORE",
    category: "Operational",
    description: "SLA has been breached on a job card.",
    producer: "WorkshopOperationsCore",
    payloadSchema: {
      type: "object",
      properties: {
        job_card_id: { type: "string" },
        breach_stage: { type: "string" },
        breach_hours: { type: "number" },
        breached_at: { type: "string" },
      },
      required: ["job_card_id", "breach_stage", "breach_hours", "breached_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["sla", "breach", "critical"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  // ── Business Programs Domain ────────────────────────────────────────────────
  {
    catalogId: "EVT-BP-001",
    eventType: "WARRANTY_CLAIM_SUBMITTED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "A warranty claim has been submitted for processing.",
    producer: "WarrantyBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        claim_id: { type: "string" },
        job_card_id: { type: "string" },
        claim_amount: { type: "number" },
        submitted_at: { type: "string" },
      },
      required: ["claim_id", "job_card_id", "claim_amount", "submitted_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["warranty", "claim"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-BP-002",
    eventType: "WARRANTY_CLAIM_APPROVED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "A warranty claim has been approved.",
    producer: "WarrantyBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        claim_id: { type: "string" },
        approved_amount: { type: "number" },
        approved_by: { type: "string" },
        approved_at: { type: "string" },
      },
      required: ["claim_id", "approved_amount", "approved_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["warranty", "approval"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-BP-003",
    eventType: "AMC_CONTRACT_CREATED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "An AMC contract has been created for a vehicle.",
    producer: "AmcBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        contract_id: { type: "string" },
        vehicle_id: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        value: { type: "number" },
      },
      required: ["contract_id", "vehicle_id", "start_date", "end_date"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["amc", "contract"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-BP-004",
    eventType: "AMC_CONTRACT_EXPIRED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "An AMC contract has expired.",
    producer: "AmcBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        contract_id: { type: "string" },
        vehicle_id: { type: "string" },
        expired_at: { type: "string" },
      },
      required: ["contract_id", "vehicle_id", "expired_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["amc", "expiry"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-BP-005",
    eventType: "GOODWILL_REQUEST_RAISED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "A goodwill request has been raised for a customer.",
    producer: "GoodwillBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        request_id: { type: "string" },
        job_card_id: { type: "string" },
        amount: { type: "number" },
        reason: { type: "string" },
        raised_by: { type: "string" },
      },
      required: ["request_id", "job_card_id", "amount", "reason"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["goodwill", "approval"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-BP-006",
    eventType: "GOODWILL_REQUEST_APPROVED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "A goodwill request has been approved by a manager.",
    producer: "GoodwillBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        request_id: { type: "string" },
        approved_amount: { type: "number" },
        approved_by: { type: "string" },
        approved_at: { type: "string" },
      },
      required: ["request_id", "approved_amount", "approved_by", "approved_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["goodwill", "approval"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-BP-007",
    eventType: "INSURANCE_CLAIM_FILED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "An insurance claim has been filed for a damaged vehicle.",
    producer: "InsuranceBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        claim_id: { type: "string" },
        job_card_id: { type: "string" },
        insurer_name: { type: "string" },
        claimed_amount: { type: "number" },
        filed_at: { type: "string" },
      },
      required: ["claim_id", "job_card_id", "insurer_name", "claimed_amount", "filed_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["insurance", "claim"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  {
    catalogId: "EVT-BP-008",
    eventType: "FLEET_CONTRACT_ACTIVATED",
    domain: "BUSINESS_PROGRAMS",
    category: "Business",
    description: "A fleet service contract has been activated.",
    producer: "FleetContractBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        contract_id: { type: "string" },
        fleet_owner_id: { type: "string" },
        vehicle_count: { type: "number" },
        activated_at: { type: "string" },
      },
      required: ["contract_id", "fleet_owner_id", "vehicle_count", "activated_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["fleet", "contract"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-BP-009",
    eventType: "BREAKDOWN_ASSISTANCE_REQUESTED",
    domain: "BUSINESS_PROGRAMS",
    category: "Operational",
    description: "Customer has requested roadside breakdown assistance.",
    producer: "BreakdownBusinessProgram",
    payloadSchema: {
      type: "object",
      properties: {
        request_id: { type: "string" },
        customer_id: { type: "string" },
        vehicle_id: { type: "string" },
        location: { type: "string" },
        requested_at: { type: "string" },
      },
      required: ["request_id", "customer_id", "vehicle_id", "location", "requested_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["breakdown", "roadside"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: true,
  },
  // ── System Domain ───────────────────────────────────────────────────────────
  {
    catalogId: "EVT-SYS-001",
    eventType: "CONFIG_ENTRY_CHANGED",
    domain: "SYSTEM",
    category: "System",
    description: "A configuration entry has been updated by an administrator.",
    producer: "EnterpriseConfigurationLayer",
    payloadSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        scope_level: { type: "string" },
        scope_identifier: { type: "string" },
        previous_value: { type: ["string", "number", "boolean", "null"] },
        new_value: { type: ["string", "number", "boolean", "null"] },
        changed_by: { type: "string" },
      },
      required: ["key", "scope_level", "scope_identifier", "changed_by"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["config", "system"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-SYS-002",
    eventType: "FEATURE_FLAG_TOGGLED",
    domain: "SYSTEM",
    category: "System",
    description: "A feature flag has been toggled on or off.",
    producer: "EnterpriseConfigurationLayer",
    payloadSchema: {
      type: "object",
      properties: {
        flag_key: { type: "string" },
        enabled: { type: "boolean" },
        scope_level: { type: "string" },
        toggled_by: { type: "string" },
      },
      required: ["flag_key", "enabled", "scope_level", "toggled_by"],
      additionalProperties: false,
    },
    schemaVersion: "1.0.0",
    tags: ["feature-flag", "system"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  // ── Notification Domain ─────────────────────────────────────────────────────
  {
    catalogId: "EVT-NOTIF-001",
    eventType: "NOTIFICATION_SENT",
    domain: "NOTIFICATION",
    category: "System",
    description: "A notification has been successfully dispatched through a channel.",
    producer: "NotificationHub",
    payloadSchema: {
      type: "object",
      properties: {
        notification_id: { type: "string" },
        channel: { type: "string" },
        recipient: { type: "string" },
        template_key: { type: "string" },
        sent_at: { type: "string" },
      },
      required: ["notification_id", "channel", "recipient", "sent_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["notification", "delivery"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
  {
    catalogId: "EVT-NOTIF-002",
    eventType: "NOTIFICATION_FAILED",
    domain: "NOTIFICATION",
    category: "System",
    description: "A notification delivery attempt has failed.",
    producer: "NotificationHub",
    payloadSchema: {
      type: "object",
      properties: {
        notification_id: { type: "string" },
        channel: { type: "string" },
        recipient: { type: "string" },
        error_message: { type: "string" },
        failed_at: { type: "string" },
        attempt_number: { type: "number" },
      },
      required: ["notification_id", "channel", "recipient", "error_message", "failed_at"],
      additionalProperties: true,
    },
    schemaVersion: "1.0.0",
    tags: ["notification", "failure", "retry"],
    isDeprecated: false,
    introducedAt: "2026-01-01T00:00:00Z",
    isCritical: false,
  },
];

/**
 * Bootstrap function: loads all platform event definitions into a CatalogRegistry.
 */
export function bootstrapEventCatalog(registry: ICatalogRegistry): void {
  let loaded = 0;
  for (const definition of PLATFORM_EVENT_DEFINITIONS) {
    try {
      registry.register(definition);
      loaded++;
    } catch (err: any) {
      console.error(`[EventCatalog] Failed to register "${definition.eventType}": ${err.message}`);
    }
  }
  console.log(`[EventCatalog] Bootstrapped ${loaded}/${PLATFORM_EVENT_DEFINITIONS.length} event definitions.`);
}
