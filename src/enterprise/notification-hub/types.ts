/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Types & Contracts
 * Module: notification-hub/types.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * All DTOs, enums, and interfaces for the Enterprise Notification Hub.
 * The hub wraps and extends the frozen Kernel NotificationEngine.
 * It does NOT re-implement provider logic — it defines routing and orchestration.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNELS = [
  "IN_APP",
  "SMS",
  "WHATSAPP",
  "EMAIL",
  "PUSH",
  "VOICE", // Future-ready interface only
] as const;

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ---------------------------------------------------------------------------
// Notification Categories
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "SLA_ALERT"
  | "JOB_STATUS_UPDATE"
  | "APPROVAL_REQUEST"
  | "APPROVAL_DECISION"
  | "SYSTEM"
  | "DIGEST"
  | "PROMOTIONAL"
  | "BREAKDOWN_ALERT"
  | "FLEET_UPDATE"
  | "CUSTOMER_COMMUNICATION"
  | "ESCALATION";

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export interface NotificationTemplate {
  readonly templateId: string;
  readonly templateKey: string;
  readonly channel: NotificationChannel;
  readonly category: NotificationCategory;
  readonly subject?: string; // Used for EMAIL
  readonly bodyTemplate: string; // Supports {{variable}} placeholders
  readonly variables: ReadonlyArray<string>;
  readonly isActive: boolean;
  readonly version: number;
  readonly language: string; // ISO 639-1, e.g. "en", "ar"
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Notification Request (what producers submit to the hub)
// ---------------------------------------------------------------------------

export interface NotificationRequest {
  readonly requestId: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly recipientIds: ReadonlyArray<string>;
  readonly templateKey: string;
  readonly templateVariables: Readonly<Record<string, string>>;
  readonly preferredChannels?: ReadonlyArray<NotificationChannel>;
  readonly correlationId: string;
  readonly sourceSystem: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly scheduledAt?: string; // ISO-8601, for deferred delivery
  readonly expiresAt?: string; // If not delivered by this time, drop it
  readonly allowDigest: boolean;
  readonly allowBatch: boolean;
}

// ---------------------------------------------------------------------------
// Recipient Profile (resolved by preference engine)
// ---------------------------------------------------------------------------

export interface RecipientProfile {
  readonly recipientId: string;
  readonly displayName: string;
  readonly channels: Readonly<Record<NotificationChannel, string | undefined>>;
  readonly preferredLanguage: string;
  readonly timezone: string;
  readonly dndStartHour: number; // 0–23
  readonly dndEndHour: number;   // 0–23
  readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Channel Preference
// ---------------------------------------------------------------------------

export type PreferenceSource = "USER" | "ROLE" | "SYSTEM_DEFAULT";

export interface ChannelPreference {
  readonly recipientId: string;
  readonly category: NotificationCategory;
  readonly enabledChannels: ReadonlyArray<NotificationChannel>;
  readonly source: PreferenceSource;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Notification Record (created when a notification is dispatched)
// ---------------------------------------------------------------------------

export type NotificationStatus =
  | "QUEUED"
  | "BATCHED"
  | "DIGESTED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "EXPIRED"
  | "SUPPRESSED";

export interface NotificationRecord {
  readonly notificationId: string;
  readonly requestId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly subject?: string;
  readonly body: string;
  readonly status: NotificationStatus;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly failureReason?: string;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly nextRetryAt?: string;
}

// ---------------------------------------------------------------------------
// Delivery Event (emitted after each delivery attempt)
// ---------------------------------------------------------------------------

export type DeliveryEventType = "SENT" | "FAILED" | "RETRYING" | "EXPIRED" | "SUPPRESSED";

export interface DeliveryEvent {
  readonly deliveryEventId: string;
  readonly notificationId: string;
  readonly channel: NotificationChannel;
  readonly recipientId: string;
  readonly eventType: DeliveryEventType;
  readonly occurredAt: string;
  readonly details?: string;
}

// ---------------------------------------------------------------------------
// Retry Policy
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly backoffMultiplier: number;
  readonly maxDelayMs: number;
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

export interface NotificationBatch {
  readonly batchId: string;
  readonly channel: NotificationChannel;
  readonly notifications: ReadonlyArray<NotificationRecord>;
  readonly createdAt: string;
  readonly scheduledDeliveryAt: string;
  readonly status: "PENDING" | "SENT" | "FAILED";
}

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

export type DigestFrequency = "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY";

export interface DigestEntry {
  readonly notificationId: string;
  readonly summary: string;
  readonly category: NotificationCategory;
  readonly createdAt: string;
}

export interface DigestBundle {
  readonly digestId: string;
  readonly recipientId: string;
  readonly entries: ReadonlyArray<DigestEntry>;
  readonly frequency: DigestFrequency;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly sentAt?: string;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface NotificationAnalyticsSnapshot {
  readonly snapshotId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalSent: number;
  readonly totalFailed: number;
  readonly totalSuppressed: number;
  readonly byChannel: Readonly<Record<string, number>>;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly avgDeliveryAttempts: number;
  readonly successRate: number; // 0.0–1.0
  readonly generatedAt: string;
}

// ---------------------------------------------------------------------------
// Channel Provider Interface (No implementations — future injection)
// ---------------------------------------------------------------------------

export interface IChannelProvider {
  readonly channel: NotificationChannel;
  send(
    recipient: string,
    subject: string | undefined,
    body: string,
    priority: NotificationPriority,
    correlationId: string
  ): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Router Interface (public contract for notification routing)
// ---------------------------------------------------------------------------

export interface INotificationRouter {
  route(request: NotificationRequest): Promise<ReadonlyArray<NotificationRecord>>;
}
