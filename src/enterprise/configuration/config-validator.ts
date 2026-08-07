/**
 * =============================================================================
 * DWIP Enterprise Configuration Layer — Config Validator
 * Module: configuration/config-validator.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Configuration Layer)
 *
 * Validates config values against their registered definitions.
 * Single Responsibility: validation only, no persistence, no side-effects.
 * =============================================================================
 */

import type {
  ConfigDefinition,
  ConfigValue,
  ConfigValidationResult,
  ConfigScopeLevel,
  ConfigScope,
} from "./types.ts";

export interface IConfigValidator {
  validateValue(definition: ConfigDefinition, value: ConfigValue): ConfigValidationResult;
  validateScopeAllowed(definition: ConfigDefinition, scope: ConfigScope): ConfigValidationResult;
  validateKey(key: string): ConfigValidationResult;
}

export class ConfigValidator implements IConfigValidator {
  private static readonly KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
  private static readonly MAX_KEY_LENGTH = 128;
  private static readonly MAX_STRING_LENGTH = 4096;

  // ---------------------------------------------------------------------------
  // Key format validation
  // ---------------------------------------------------------------------------

  public validateKey(key: string): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!key || key.trim().length === 0) {
      errors.push("Config key must not be empty.");
    } else {
      if (key.length > ConfigValidator.MAX_KEY_LENGTH) {
        errors.push(`Config key exceeds maximum length of ${ConfigValidator.MAX_KEY_LENGTH} characters.`);
      }
      if (!ConfigValidator.KEY_PATTERN.test(key)) {
        errors.push(
          `Config key "${key}" must follow dot-notation format: lowercase alphanumeric and underscores only (e.g. "sla.diagnostic.warning_minutes").`
        );
      }
      if (key.startsWith(".") || key.endsWith(".")) {
        errors.push(`Config key "${key}" must not start or end with a dot.`);
      }
      if (key.includes("..")) {
        errors.push(`Config key "${key}" must not contain consecutive dots.`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ---------------------------------------------------------------------------
  // Value type validation
  // ---------------------------------------------------------------------------

  public validateValue(definition: ConfigDefinition, value: ConfigValue): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (value === null && !this.isNullableType(definition.valueType)) {
      errors.push(`Key "${definition.key}" does not accept null values.`);
      return { valid: false, errors, warnings };
    }

    if (value === null) {
      return { valid: true, errors, warnings };
    }

    switch (definition.valueType) {
      case "string":
        if (typeof value !== "string") {
          errors.push(`Key "${definition.key}" expects a string value, got: ${typeof value}.`);
        } else if ((value as string).length > ConfigValidator.MAX_STRING_LENGTH) {
          errors.push(`Key "${definition.key}" string value exceeds maximum length of ${ConfigValidator.MAX_STRING_LENGTH}.`);
        }
        break;

      case "number":
        if (typeof value !== "number") {
          errors.push(`Key "${definition.key}" expects a number value, got: ${typeof value}.`);
        } else if (!isFinite(value as number)) {
          errors.push(`Key "${definition.key}" must be a finite number.`);
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          errors.push(`Key "${definition.key}" expects a boolean value, got: ${typeof value}.`);
        }
        break;

      case "string[]":
        if (!Array.isArray(value)) {
          errors.push(`Key "${definition.key}" expects a string array, got: ${typeof value}.`);
        } else {
          const invalidItems = (value as unknown[]).filter((item) => typeof item !== "string");
          if (invalidItems.length > 0) {
            errors.push(`Key "${definition.key}" array contains non-string elements.`);
          }
        }
        break;

      case "json":
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`Key "${definition.key}" expects a JSON object value.`);
        }
        break;

      default:
        warnings.push(`Unknown valueType "${(definition as any).valueType}" for key "${definition.key}".`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ---------------------------------------------------------------------------
  // Scope allowance validation
  // ---------------------------------------------------------------------------

  public validateScopeAllowed(definition: ConfigDefinition, scope: ConfigScope): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!definition.allowedScopes.includes(scope.level)) {
      errors.push(
        `Key "${definition.key}" does not allow overrides at scope level "${scope.level}". ` +
          `Allowed scopes: [${definition.allowedScopes.join(", ")}].`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private isNullableType(valueType: ConfigDefinition["valueType"]): boolean {
    // All types can technically be null if not set — caller decides based on definition
    return true;
  }
}

/** Singleton export for convenience */
export const configValidator = new ConfigValidator();
