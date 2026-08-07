/**
 * DWIP Enterprise - Core Platform Notification Engine
 * Sprint IL-001 Architecture
 * 
 * Features:
 * - Enterprise notification queue & alert broadcaster for integration events
 * - Outbound webhooks, system alerts, failure warnings, and queue retry alerts.
 */

export interface IntegrationNotification {
  id: string;
  systemCode: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export class NotificationEngine {
  private static instance: NotificationEngine;
  private notifications: IntegrationNotification[] = [];

  private constructor() {
    this.seedBaselineNotifications();
  }

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  private seedBaselineNotifications(): void {
    const now = new Date().toISOString();
    this.notifications = [
      {
        id: 'notif_101',
        systemCode: 'FLEETEDGE',
        severity: 'WARNING',
        title: 'High Latency Detected',
        message: 'FleetEdge telematics response time exceeded 2500ms threshold.',
        read: false,
        createdAt: now
      },
      {
        id: 'notif_102',
        systemCode: 'TMSA',
        severity: 'INFO',
        title: 'Master Sync Completed',
        message: 'Successfully synchronized 120 vehicle master records.',
        read: true,
        createdAt: now
      }
    ];
  }

  public notify(
    systemCode: string,
    severity: IntegrationNotification['severity'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): IntegrationNotification {
    const item: IntegrationNotification = {
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      systemCode: systemCode.toUpperCase(),
      severity,
      title,
      message,
      metadata,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(item);
    return item;
  }

  public getNotifications(unreadOnly: boolean = false): IntegrationNotification[] {
    if (unreadOnly) {
      return this.notifications.filter(n => !n.read);
    }
    return [...this.notifications];
  }

  public markAsRead(notificationId: string): boolean {
    const item = this.notifications.find(n => n.id === notificationId);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }
}

export const notificationEngine = NotificationEngine.getInstance();
