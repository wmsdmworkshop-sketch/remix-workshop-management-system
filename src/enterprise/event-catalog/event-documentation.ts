/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Event Documentation Generator
 * Module: event-catalog/event-documentation.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Auto-generates human-readable documentation for each event in the catalog.
 * Output formats: structured DTO (for API), Markdown (for developer portal).
 * =============================================================================
 */

import type { EventDefinition, EventDocumentation, JsonSchemaProperty } from "./types.ts";
import type { IConsumerRegistry } from "./consumer-registry.ts";
import type { ILineageTracker } from "./lineage-tracker.ts";
import type { ICatalogReader } from "./event-discovery.ts";

export interface IEventDocumentation {
  generateForEvent(eventType: string): EventDocumentation | undefined;
  generateMarkdown(eventType: string): string | undefined;
  generateCatalogMarkdown(): string;
}

export class EventDocumentationService implements IEventDocumentation {
  constructor(
    private readonly catalogReader: ICatalogReader,
    private readonly consumerRegistry: IConsumerRegistry,
    private readonly lineageTracker: ILineageTracker
  ) {}

  // ---------------------------------------------------------------------------
  // Structured DTO
  // ---------------------------------------------------------------------------

  public generateForEvent(eventType: string): EventDocumentation | undefined {
    const definition = this.catalogReader.getDefinition(eventType);
    if (!definition) return undefined;

    const consumers = this.consumerRegistry
      .getConsumersByEventType(eventType)
      .map((c) => c.consumerName);

    const lineageNode = this.lineageTracker.getNode(eventType) ?? {
      eventType,
      produces: [],
      consumedBy: [],
      workflowStages: [],
    };

    const payloadFields = Object.entries(definition.payloadSchema.properties).map(
      ([field, schema]) => ({
        field,
        type: Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type,
        required: definition.payloadSchema.required.includes(field),
        description: schema.description ?? "",
      })
    );

    return {
      eventType: definition.eventType,
      catalogId: definition.catalogId,
      description: definition.description,
      producer: definition.producer,
      consumers,
      payloadFields,
      lineage: lineageNode,
      schemaVersion: definition.schemaVersion,
      tags: definition.tags,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Markdown Generation
  // ---------------------------------------------------------------------------

  public generateMarkdown(eventType: string): string | undefined {
    const doc = this.generateForEvent(eventType);
    if (!doc) return undefined;

    const definition = this.catalogReader.getDefinition(eventType)!;
    const deprecationNote = definition.isDeprecated
      ? `\n> ⚠️ **DEPRECATED** – ${definition.deprecationMessage ?? "This event has been deprecated."}\n`
      : "";

    const payloadTable = doc.payloadFields.length > 0
      ? [
          "| Field | Type | Required | Description |",
          "|:------|:-----|:--------:|:------------|",
          ...doc.payloadFields.map(
            (f) =>
              `| \`${f.field}\` | \`${f.type}\` | ${f.required ? "✅" : "–"} | ${f.description || "—"} |`
          ),
        ].join("\n")
      : "_No payload fields defined._";

    const consumerList = doc.consumers.length > 0
      ? doc.consumers.map((c) => `- ${c}`).join("\n")
      : "_No registered consumers._";

    const producedList = doc.lineage.produces.length > 0
      ? doc.lineage.produces.map((e) => `- \`${e}\``).join("\n")
      : "_None_";

    const workflowList = doc.lineage.workflowStages.length > 0
      ? doc.lineage.workflowStages.map((s) => `- ${s}`).join("\n")
      : "_Not associated with a workflow stage._";

    return `# ${doc.eventType}

**Catalog ID:** \`${doc.catalogId}\`  
**Producer:** ${doc.producer}  
**Schema Version:** \`${doc.schemaVersion}\`  
**Tags:** ${doc.tags.map((t) => `\`${t}\``).join(", ") || "—"}  
**Critical:** ${definition.isCritical ? "🔴 Yes" : "No"}
${deprecationNote}
## Description

${doc.description}

## Payload Schema

${payloadTable}

## Consumers

${consumerList}

## Produces Events

${producedList}

## Workflow Stages

${workflowList}

---
_Generated at: ${doc.generatedAt}_
`;
  }

  // ---------------------------------------------------------------------------
  // Full Catalog Markdown
  // ---------------------------------------------------------------------------

  public generateCatalogMarkdown(): string {
    const all = this.catalogReader.listDefinitions();
    const sorted = [...all].sort((a, b) => a.eventType.localeCompare(b.eventType));

    const sections = sorted.map((def) => this.generateMarkdown(def.eventType) ?? "").join("\n---\n\n");

    const header = `# DWIP Enterprise Event Catalog

> Auto-generated documentation for all platform events.  
> Total events: **${all.length}**  
> Critical events: **${all.filter((e) => e.isCritical).length}**  
> Deprecated events: **${all.filter((e) => e.isDeprecated).length}**  
> Generated at: ${new Date().toISOString()}

---

`;
    return header + sections;
  }
}
