/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Notification Engine
 * Bounded Context: Core System / Notifications
 * Description: Subscribes to EventBus, manages templates, priority routing,
 *              retries, and tracking delivery through normalized tables.
 * =============================================================================
 */

import { globalEventBus, DomainEventEnvelope } from "./event-bus.js";
import { pool as db } from "../db/index.js";
import { INotificationProvider, InAppProvider, SmsProvider, WhatsAppProvider, EmailProvider, PushProvider } from "./notification-provider.js";
import crypto from "crypto";

export class NotificationEngine {
  private providers: Map<string, INotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new InAppProvider());
    this.registerProvider(new SmsProvider());
    this.registerProvider(new WhatsAppProvider());
    this.registerProvider(new EmailProvider());
    this.registerProvider(new PushProvider());
  }

  public registerProvider(provider: INotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  /**
   * Initializes the Notification Engine by subscribing to wildcard events
   * or specific configured events.
   */
  public initialize() {
    console.log("=== Initializing Enterprise Notification Engine ===");
    // Subscribing to all events to check if they have a notification configuration.
    // In a real high-throughput system, we might only subscribe to topics listed in routing config.
    globalEventBus.subscribe("*", async (envelope: DomainEventEnvelope) => {
      await this.handleEvent(envelope);
    });
  }

  private async handleEvent(envelope: DomainEventEnvelope): Promise<void> {
    const topic = envelope.topic;
    
    // 1. Fetch Routing Configuration from DB or memory.
    // Using a configuration-driven approach without hardcoded business rules.
    const routingConfig = await this.getRoutingConfig(topic);
    if (!routingConfig || routingConfig.length === 0) {
      // No notification configured for this event topic.
      return;
    }

    const eventId = envelope.eventId;
    const correlationId = envelope.correlationId;

    for (const route of routingConfig) {
      // Resolve recipients (e.g., from event payload or roles)
      const recipients = this.resolveRecipients(envelope, route.recipientType);
      
      for (const recipient of recipients) {
        // Create Dispatch Record
        const dispatchId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO tbl_notification_dispatch 
           (dispatch_id, event_id, correlation_id, recipient, template_code, priority, status)
           VALUES (?, ?, ?, ?, ?, ?, 'CREATED')`,
          [dispatchId, eventId, correlationId, recipient, route.templateCode, route.priority]
        );

        // Process Dispatch
        await this.processDispatch(dispatchId, recipient, route, envelope);
      }
    }
  }

  private async processDispatch(dispatchId: string, recipient: string, route: any, envelope: DomainEventEnvelope): Promise<void> {
    await this.updateDispatchStatus(dispatchId, "DISPATCHING");

    const template = await this.getTemplate(route.templateCode);
    if (!template) {
      await this.updateDispatchStatus(dispatchId, "FAILED");
      return;
    }

    const message = this.interpolate(template.body_template, envelope.payload);
    
    // Process Delivery via channels (primary and fallbacks)
    for (let i = 0; i < route.channels.length; i++) {
      const channel = route.channels[i];
      const deliveryId = crypto.randomUUID();
      
      await db.execute(
        `INSERT INTO tbl_notification_delivery 
         (delivery_id, dispatch_id, channel, provider, status, attempt_number)
         VALUES (?, ?, ?, ?, 'PENDING', 1)`,
        [deliveryId, dispatchId, channel, channel]
      );

      const provider = this.providers.get(channel);
      if (provider) {
        const success = await provider.send(recipient, message, route.priority, envelope.correlationId);
        
        if (success) {
          await db.execute(
            `UPDATE tbl_notification_delivery SET status = 'DELIVERED', delivered_at = CURRENT_TIMESTAMP WHERE delivery_id = ?`,
            [deliveryId]
          );
          await this.updateDispatchStatus(dispatchId, "SENT");
          return; // Stop escalation chain if successful
        } else {
          await db.execute(
            `UPDATE tbl_notification_delivery SET status = 'FAILED' WHERE delivery_id = ?`,
            [deliveryId]
          );
        }
      }
    }
    
    // If all channels fail
    await this.updateDispatchStatus(dispatchId, "FAILED");
  }

  private async updateDispatchStatus(dispatchId: string, status: string) {
    await db.execute(
      `UPDATE tbl_notification_dispatch SET status = ? WHERE dispatch_id = ?`,
      [status, dispatchId]
    );
  }

  private async getRoutingConfig(topic: string): Promise<any[]> {
    // A simplistic configurable routing table in-memory for demonstration.
    // In production, this would be fetched from `tbl_notification_routing`
    const routes: Record<string, any[]> = {
      "QC_FAILED": [
        { recipientType: "Workshop Manager", templateCode: "QC_FAIL_TPL", priority: "HIGH", channels: ["IN_APP", "SMS", "WHATSAPP", "EMAIL"] }
      ],
      "SLA_BREACH": [
        { recipientType: "Operations Supervisor", templateCode: "SLA_BREACH_TPL", priority: "CRITICAL", channels: ["IN_APP", "SMS"] }
      ]
    };
    return routes[topic] || [];
  }

  private resolveRecipients(envelope: DomainEventEnvelope, recipientType: string): string[] {
    // Dummy resolution: In a real system, this queries user registry based on roles or payload customerIds.
    // E.g., if recipientType is "Customer", it pulls phone/email from envelope.payload.customerId
    return ["user_123"];
  }

  private async getTemplate(templateCode: string): Promise<any> {
    const [rows] = await db.execute(
      `SELECT * FROM tbl_notification_templates WHERE template_code = ? AND is_active = 1`,
      [templateCode]
    ) as any[];
    return rows[0];
  }

  private interpolate(templateString: string, variables: any): string {
    return templateString.replace(/\{(\w+)\}/g, (match, key) => {
      return variables && variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}

export const globalNotificationEngine = new NotificationEngine();
