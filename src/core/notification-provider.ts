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
    priority: "LOW" | "MEDIUM" | "HIGH",
    correlationId: string
  ): Promise<boolean>;
}

export class MockInAppProvider implements INotificationProvider {
  public channel = "IN_APP" as const;
  public sentLogs: { recipient: string; message: string; correlationId: string }[] = [];

  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    this.sentLogs.push({ recipient, message, correlationId });
    return true;
  }
}

export class MockSmsProvider implements INotificationProvider {
  public channel = "SMS" as const;
  public sentLogs: { recipient: string; message: string; correlationId: string }[] = [];
  public shouldFail = false;

  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error("SMS network timeout");
    }
    this.sentLogs.push({ recipient, message, correlationId });
    return true;
  }
}

export class MockWhatsAppProvider implements INotificationProvider {
  public channel = "WHATSAPP" as const;
  public sentLogs: { recipient: string; message: string; correlationId: string }[] = [];

  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    this.sentLogs.push({ recipient, message, correlationId });
    return true;
  }
}

export class MockEmailProvider implements INotificationProvider {
  public channel = "EMAIL" as const;
  public sentLogs: { recipient: string; message: string; correlationId: string }[] = [];

  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    this.sentLogs.push({ recipient, message, correlationId });
    return true;
  }
}

export class MockPushProvider implements INotificationProvider {
  public channel = "PUSH" as const;
  public sentLogs: { recipient: string; message: string; correlationId: string }[] = [];

  public async send(recipient: string, message: string, priority: string, correlationId: string): Promise<boolean> {
    this.sentLogs.push({ recipient, message, correlationId });
    return true;
  }
}
