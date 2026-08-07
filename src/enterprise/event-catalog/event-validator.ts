/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Event Validator
 * Module: event-catalog/event-validator.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Validates event payloads against the registered JSON schema for a given
 * event type and version. Uses zero external libraries — schema validation
 * is implemented inline against the platform's EventPayloadSchema model.
 *
 * The validator is stateless and side-effect free.
 * =============================================================================
 */

import type {
  EventPayloadSchema,
  JsonSchemaProperty,
  EventValidationResult,
} from "./types.ts";
import type { ISchemaRegistry } from "./schema-registry.ts";

export interface IEventValidator {
  validate(
    eventType: string,
    payload: Record<string, unknown>,
    schemaVersion?: string
  ): EventValidationResult;

  validateAgainstSchema(
    eventType: string,
    payload: Record<string, unknown>,
    schema: EventPayloadSchema,
    schemaVersion: string
  ): EventValidationResult;
}

export class EventValidator implements IEventValidator {
  constructor(private readonly schemaRegistry: ISchemaRegistry) {}

  // ---------------------------------------------------------------------------
  // Public Interface
  // ---------------------------------------------------------------------------

  /**
   * Validates a payload against the registered schema for `eventType`.
   * If `schemaVersion` is not supplied, the latest registered schema is used.
   */
  public validate(
    eventType: string,
    payload: Record<string, unknown>,
    schemaVersion?: string
  ): EventValidationResult {
    const schemaRecord = schemaVersion
      ? this.schemaRegistry.getSchemaByVersion(eventType, schemaVersion)
      : this.schemaRegistry.getLatestSchema(eventType);

    if (!schemaRecord) {
      return {
        valid: false,
        eventType,
        schemaVersion: schemaVersion ?? "unknown",
        errors: [
          `No schema registered for event type "${eventType}"${
            schemaVersion ? ` at version "${schemaVersion}"` : ""
          }. Register via SchemaRegistry.registerSchema().`,
        ],
        warnings: [],
      };
    }

    return this.validateAgainstSchema(
      eventType,
      payload,
      schemaRecord.payloadSchema,
      schemaRecord.schemaVersion
    );
  }

  /**
   * Validates a payload directly against a provided schema.
   * Exposed for callers who already hold a schema reference.
   */
  public validateAgainstSchema(
    eventType: string,
    payload: Record<string, unknown>,
    schema: EventPayloadSchema,
    schemaVersion: string
  ): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return {
        valid: false,
        eventType,
        schemaVersion,
        errors: ["Payload must be a non-null object."],
        warnings,
      };
    }

    // Check required fields
    for (const requiredField of schema.required) {
      if (!(requiredField in payload)) {
        errors.push(`Missing required field: "${requiredField}".`);
      }
    }

    // Validate each declared property
    for (const [field, propSchema] of Object.entries(schema.properties)) {
      if (!(field in payload)) {
        if (!schema.required.includes(field)) {
          // Optional field absent — valid
          continue;
        }
        // Already caught above
        continue;
      }

      const fieldErrors = this.validateProperty(field, payload[field], propSchema);
      errors.push(...fieldErrors);
    }

    // Check for extra properties when additionalProperties === false
    if (!schema.additionalProperties) {
      const declaredFields = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(payload)) {
        if (!declaredFields.has(key)) {
          warnings.push(
            `Undeclared field "${key}" present in payload. Schema does not allow additional properties.`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      eventType,
      schemaVersion,
      errors,
      warnings,
    };
  }

  // ---------------------------------------------------------------------------
  // Private: Property Validation
  // ---------------------------------------------------------------------------

  private validateProperty(
    field: string,
    value: unknown,
    schema: JsonSchemaProperty
  ): string[] {
    const errors: string[] = [];
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];

    if (value === null) {
      if (!types.includes("null")) {
        errors.push(`Field "${field}" does not accept null values.`);
      }
      return errors;
    }

    const actualType = this.resolveType(value);
    const typeMatch = types.some((t) => t === actualType || (t === "number" && actualType === "number"));

    if (!typeMatch) {
      errors.push(
        `Field "${field}" has type "${actualType}", expected ${types.map((t) => `"${t}"`).join(" | ")}.`
      );
      return errors; // Stop further checks if type is wrong
    }

    // Enum validation
    if (schema.enum) {
      if (!schema.enum.includes(value as string | number | boolean)) {
        errors.push(
          `Field "${field}" value "${value}" is not in allowed values: [${schema.enum.join(", ")}].`
        );
      }
    }

    // Numeric bounds
    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`Field "${field}" value ${value} is below minimum ${schema.minimum}.`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`Field "${field}" value ${value} is above maximum ${schema.maximum}.`);
      }
    }

    // String bounds
    if (typeof value === "string") {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(
          `Field "${field}" string length ${value.length} is below minLength ${schema.minLength}.`
        );
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(
          `Field "${field}" string length ${value.length} exceeds maxLength ${schema.maxLength}.`
        );
      }
    }

    // Array items validation
    if (Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        const itemErrors = this.validateProperty(`${field}[${index}]`, item, schema.items!);
        errors.push(...itemErrors);
      });
    }

    return errors;
  }

  private resolveType(value: unknown): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }
}
