/**
 * =============================================================================
 * WOS Core Architecture: NotificationEngine Implementation
 * Bounded Context: Core System / Notifications
 * Description: Coordinates multi-channel notifications, scheduling, retries,
 *              escalation chains, and silent mode. Integrated with Circuit Breaker.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";
import { INotificationProvider } from "./notification-provider";
import { CircuitBreaker } from "./circuit-breaker";

export interface NotificationPayload {
  recipient: string;
  templateCode: string;
  variables: Record<string, string>;
  priority: "LOW" | "MEDIUM" | "HIGH";
  primaryChannel: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  escalationChannel?: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  sendAt?: Date;
  idempotencyKey?: string;
  validationRunId?: string;
}

export class NotificationEngine {
  private templates: Map<string, string> = new Map();
  private providers: Map<string, INotificationProvider> = new Map();
  public silentMode = false;

  constructor(
    public readonly eventBus: IEventBus,
    private readonly circuitBreaker?: CircuitBreaker
  ) {
    // Default templates registry
    this.templates.set("QC_FAILED", "Job Card #{jobNo} failed QC inspection due to: {reason}.");
    this.templates.set("SLA_BREACH", "CRITICAL WARNING: Job Card #{jobNo} breached SLA limit in stage {state}.");
  }

  public registerProvider(provider: INotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  public registerTemplate(code: string, body: string) {
    this.templates.set(code, body);
  }

  /**
   * Translates template variables and schedules or executes dispatch.
   */
  public async sendNotification(
    payload: NotificationPayload,
    correlationId: string
  ): Promise<boolean> {
    if (this.silentMode) {
      console.log(`[NotificationEngine] Silent Mode Active. Suppressing dispatch to ${payload.recipient}.`);
      return true;
    }

    const template = this.templates.get(payload.templateCode);
    if (!template) {
      throw new Error(`Template code "${payload.templateCode}" not found.`);
    }

    const message = this.interpolateTemplate(template, payload.variables);

    // If scheduling is requested
    if (payload.sendAt && payload.sendAt.getTime() > Date.now()) {
      const delayMs = payload.sendAt.getTime() - Date.now();
      setTimeout(
        () => this.dispatchWithEscalation(payload, message, correlationId),
        delayMs
      );
      return true;
    }

    return this.dispatchWithEscalation(payload, message, correlationId);
  }

  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), value);
    }
    return result;
  }

  /**
   * Dispatches with retry and optional fallback channel escalation.
   */
  private async dispatchWithEscalation(
    payload: NotificationPayload,
    message: string,
    correlationId: string
  ): Promise<boolean> {
    let success = await this.trySendWithRetry(payload.primaryChannel, payload.recipient, message, payload.priority, correlationId);

    if (!success && payload.escalationChannel) {
      console.warn(`[NotificationEngine] Primary channel ${payload.primaryChannel} failed. Escalating to ${payload.escalationChannel}.`);
      success = await this.trySendWithRetry(
        payload.escalationChannel,
        payload.recipient,
        `[ESCALATION] ${message}`,
        payload.priority,
        correlationId
      );

      if (success) {
        await this.eventBus.publish(
          "NOTIFICATION_ESCALATED",
          { recipient: payload.recipient, channel: payload.escalationChannel, message, correlationId, validationRunId: payload.validationRunId },
          correlationId,
          payload.validationRunId
        );
      }
    }

    if (success) {
      await this.eventBus.publish(
        "NOTIFICATION_SENT",
        { recipient: payload.recipient, channel: success ? payload.primaryChannel : payload.escalationChannel, message, correlationId, validationRunId: payload.validationRunId },
        correlationId,
        payload.validationRunId
      );
    }

    return success;
  }

  private async trySendWithRetry(
    channel: string,
    recipient: string,
    message: string,
    priority: "LOW" | "MEDIUM" | "HIGH",
    correlationId: string
  ): Promise<boolean> {
    // Check Circuit Breaker if integrated
    if (this.circuitBreaker && !this.circuitBreaker.canExecute(channel)) {
      console.warn(`[NotificationEngine] Circuit Breaker OPEN for channel "${channel}". Aborting direct send.`);
      return false;
    }

    const provider = this.providers.get(channel);
    if (!provider) {
      console.error(`[NotificationEngine] No registered provider for channel: ${channel}`);
      return false;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const ok = await provider.send(recipient, message, priority, correlationId);
        if (ok) {
          if (this.circuitBreaker) this.circuitBreaker.recordSuccess(channel);
          return true;
        }
      } catch (err) {
        attempts++;
        if (this.circuitBreaker) this.circuitBreaker.recordFailure(channel);
        if (attempts >= maxAttempts) {
          console.error(`[NotificationEngine] Failed to dispatch on channel ${channel} after ${maxAttempts} attempts:`, err);
        }
      }
    }
    return false;
  }
}
