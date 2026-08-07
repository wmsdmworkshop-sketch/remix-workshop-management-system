/**
 * =============================================================================
 * WOS Core Architecture: Notification Providers
 * Bounded Context: Core System / Notification Channels
 * Description: Abstractions and mock implementations for multi-channel message delivery.
 * =============================================================================
 */

export interface INotificationProvider {
  channel: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  send(
    recipient: string,
    message: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    correlationId: string
  ): Promise<boolean>;
}

export class InAppProvider implements INotificationProvider {
  public channel = "IN_APP" as const;
  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    console.log(`[InAppProvider] Sending message to ${recipient}: ${message}`);
    return true;
  }
}

export class SmsProvider implements INotificationProvider {
  public channel = "SMS" as const;
  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    console.log(`[SmsProvider] Sending SMS to ${recipient}: ${message}`);
    return true;
  }
}

export class WhatsAppProvider implements INotificationProvider {
  public channel = "WHATSAPP" as const;
  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    console.log(`[WhatsAppProvider] Sending WhatsApp to ${recipient}: ${message}`);
    return true;
  }
}

export class EmailProvider implements INotificationProvider {
  public channel = "EMAIL" as const;
  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    console.log(`[EmailProvider] Sending Email to ${recipient}: ${message}`);
    return true;
  }
}

export class PushProvider implements INotificationProvider {
  public channel = "PUSH" as const;
  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    console.log(`[PushProvider] Sending Push to ${recipient}: ${message}`);
    return true;
  }
}
