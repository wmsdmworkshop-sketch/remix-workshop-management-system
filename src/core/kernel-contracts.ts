/**
 * kernel-contracts.ts
 *
 * Defines the shared immutable contracts, metadata, and error codes
 * used across all engines in the DWIP Kernel.
 */

export const KernelErrorCode = {
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  VALIDATION_FAILED: "ERR_VALIDATION_FAILED",
  SLA_BREACHED: "ERR_SLA_BREACHED",
  TRANSITION_BLOCKED: "ERR_TRANSITION_BLOCKED",
  NOT_FOUND: "ERR_NOT_FOUND",
  CONFLICT: "ERR_CONFLICT",
  INTERNAL_ERROR: "ERR_INTERNAL_ERROR",
} as const;

export type KernelErrorCodeType = typeof KernelErrorCode[keyof typeof KernelErrorCode];

export interface EngineMetadata {
  readonly engine_name: string;
  readonly engine_version: string;
  readonly capabilities: string[];
}

/**
 * Identity context of the executing entity
 */
export interface IdentityContext {
  readonly entity_type: string;
  readonly entity_id: string;
}

/**
 * Traceability and request metadata
 */
export interface TraceabilityContext {
  readonly correlation_id: string;
  readonly timestamp: string;
  readonly request_id?: string;
  readonly source_system?: string;
}

/**
 * Actor performing the operation
 */
export interface ActorContext {
  readonly user_id: string;
  readonly role: string;
  readonly branch_id?: string;
  readonly workshop_id?: string;
}

/**
 * The unified immutable execution context for the DWIP Kernel.
 * Represents identity and traceability only.
 */
export interface BusinessContext {
  readonly identity: IdentityContext;
  readonly traceability: TraceabilityContext;
  readonly actor: ActorContext;
}

/**
 * Immutable wrapper around engine results.
 */
export interface ExecutionResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly error_code?: KernelErrorCodeType;
  readonly timestamp: string;
  readonly correlation_id: string;
}
