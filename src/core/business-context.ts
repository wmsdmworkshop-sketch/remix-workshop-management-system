import { randomUUID } from "crypto";
import { 
  IdentityContext, 
  TraceabilityContext, 
  ActorContext, 
  BusinessContext, 
  ExecutionResult,
  KernelErrorCodeType
} from "./kernel-contracts";

export * from "./kernel-contracts"; // Re-export for convenience

export class BusinessContextFactory {
  /**
   * Creates a deeply frozen BusinessContext object.
   */
  public static create(
    identity: IdentityContext,
    actor: ActorContext,
    traceabilityOptions?: Partial<TraceabilityContext>
  ): BusinessContext {
    const context: BusinessContext = {
      identity: {
        entity_type: identity.entity_type,
        entity_id: identity.entity_id
      },
      actor: {
        user_id: actor.user_id,
        role: actor.role,
        branch_id: actor.branch_id,
        workshop_id: actor.workshop_id
      },
      traceability: {
        correlation_id: traceabilityOptions?.correlation_id || randomUUID(),
        timestamp: traceabilityOptions?.timestamp || new Date().toISOString(),
        request_id: traceabilityOptions?.request_id,
        source_system: traceabilityOptions?.source_system || "DWIP-Core"
      }
    };

    // Deep freeze to enforce immutability
    Object.freeze(context.identity);
    Object.freeze(context.actor);
    Object.freeze(context.traceability);
    return Object.freeze(context);
  }

  /**
   * Helper to create standard immutable success results
   */
  public static success<T>(context: BusinessContext, data: T): ExecutionResult<T> {
    return Object.freeze({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      correlation_id: context.traceability.correlation_id
    });
  }

  /**
   * Helper to create standard immutable error results
   */
  public static failure<T>(context: BusinessContext, error: string, error_code?: KernelErrorCodeType): ExecutionResult<T> {
    return Object.freeze({
      success: false,
      error,
      error_code,
      timestamp: new Date().toISOString(),
      correlation_id: context.traceability.correlation_id
    });
  }
}

/**
 * Creates a minimal immutable BusinessContext for internal system events.
 * Used by Queue, Timer, Scheduler, and Notification engines that publish
 * domain events without a user-facing actor.
 */
export function makeSystemContext(correlationId: string): BusinessContext {
  return Object.freeze({
    identity: Object.freeze({ entity_type: "SYSTEM", entity_id: "DWIP-KERNEL" }),
    actor: Object.freeze({ user_id: "SYSTEM", role: "SYSTEM" }),
    traceability: Object.freeze({
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      source_system: "DWIP-Kernel",
    }),
  });
}
