/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Preference Engine
 * Module: notification-hub/preference-engine.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7.4 (Preference Engine)
 *
 * Manages per-user and per-role channel preferences for each notification category.
 * DND (Do Not Disturb) window enforcement. Preference hierarchy: USER > ROLE > SYSTEM.
 * =============================================================================
 */

import type {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  RecipientProfile,
  ChannelPreference,
  PreferenceSource,
} from "./types.ts";

export interface IPreferenceEngine {
  setProfile(profile: RecipientProfile): void;
  getProfile(recipientId: string): RecipientProfile | undefined;

  setPreference(
    recipientId: string,
    category: NotificationCategory,
    enabledChannels: NotificationChannel[],
    source: PreferenceSource
  ): ChannelPreference;

  getPreference(
    recipientId: string,
    category: NotificationCategory
  ): ChannelPreference | undefined;

  getEnabledChannels(
    recipientId: string,
    category: NotificationCategory,
    priority: NotificationPriority,
    requestedChannels?: ReadonlyArray<NotificationChannel>
  ): ReadonlyArray<NotificationChannel>;

  isInDndWindow(recipientId: string): boolean;
  getRecipientAddress(recipientId: string, channel: NotificationChannel): string | undefined;
}

/** System-default channel preferences by category */
const DEFAULT_CHANNEL_PREFERENCES: Readonly<Record<NotificationCategory, NotificationChannel[]>> = {
  SLA_ALERT: ["IN_APP", "SMS"],
  JOB_STATUS_UPDATE: ["SMS", "WHATSAPP"],
  APPROVAL_REQUEST: ["IN_APP", "EMAIL"],
  APPROVAL_DECISION: ["IN_APP", "SMS"],
  SYSTEM: ["IN_APP"],
  DIGEST: ["EMAIL"],
  PROMOTIONAL: ["EMAIL"],
  BREAKDOWN_ALERT: ["SMS", "WHATSAPP", "IN_APP"],
  FLEET_UPDATE: ["IN_APP", "EMAIL"],
  CUSTOMER_COMMUNICATION: ["SMS", "WHATSAPP"],
  ESCALATION: ["IN_APP", "EMAIL", "SMS"],
};

export class PreferenceEngine implements IPreferenceEngine {
  /** recipientId → RecipientProfile */
  private readonly profiles = new Map<string, RecipientProfile>();

  /** `${recipientId}::${category}` → ChannelPreference */
  private readonly preferences = new Map<string, ChannelPreference>();

  // ---------------------------------------------------------------------------
  // Profile Management
  // ---------------------------------------------------------------------------

  public setProfile(profile: RecipientProfile): void {
    this.profiles.set(profile.recipientId, Object.freeze({ ...profile }));
  }

  public getProfile(recipientId: string): RecipientProfile | undefined {
    return this.profiles.get(recipientId);
  }

  // ---------------------------------------------------------------------------
  // Preference Management
  // ---------------------------------------------------------------------------

  public setPreference(
    recipientId: string,
    category: NotificationCategory,
    enabledChannels: NotificationChannel[],
    source: PreferenceSource
  ): ChannelPreference {
    const pref: ChannelPreference = Object.freeze({
      recipientId,
      category,
      enabledChannels: [...enabledChannels],
      source,
      updatedAt: new Date().toISOString(),
    });
    this.preferences.set(this.buildPrefKey(recipientId, category), pref);
    return pref;
  }

  public getPreference(
    recipientId: string,
    category: NotificationCategory
  ): ChannelPreference | undefined {
    return this.preferences.get(this.buildPrefKey(recipientId, category));
  }

  // ---------------------------------------------------------------------------
  // Channel Determination
  // ---------------------------------------------------------------------------

  /**
   * Determines the final set of channels for a notification delivery.
   * Rules:
   *   1. CRITICAL priority bypasses DND and respects all enabled channels.
   *   2. If DND is active, suppress channels except IN_APP and EMAIL.
   *   3. Apply user preference → fall back to system default.
   *   4. Intersect with requestedChannels if provided.
   */
  public getEnabledChannels(
    recipientId: string,
    category: NotificationCategory,
    priority: NotificationPriority,
    requestedChannels?: ReadonlyArray<NotificationChannel>
  ): ReadonlyArray<NotificationChannel> {
    const isCritical = priority === "CRITICAL";
    const inDnd = !isCritical && this.isInDndWindow(recipientId);

    // Determine base channels from preference or default
    const pref = this.preferences.get(this.buildPrefKey(recipientId, category));
    let channels: NotificationChannel[] = pref
      ? [...pref.enabledChannels]
      : [...(DEFAULT_CHANNEL_PREFERENCES[category] ?? ["IN_APP"])];

    // DND filter: during quiet hours, only IN_APP and EMAIL allowed
    if (inDnd) {
      channels = channels.filter((ch) => ch === "IN_APP" || ch === "EMAIL");
    }

    // Intersect with caller's requested channels (if specified)
    if (requestedChannels && requestedChannels.length > 0) {
      channels = channels.filter((ch) => requestedChannels.includes(ch));
    }

    // Always ensure IN_APP is included for HIGH/CRITICAL
    if ((priority === "HIGH" || priority === "CRITICAL") && !channels.includes("IN_APP")) {
      channels.unshift("IN_APP");
    }

    return channels;
  }

  // ---------------------------------------------------------------------------
  // DND Check
  // ---------------------------------------------------------------------------

  public isInDndWindow(recipientId: string): boolean {
    const profile = this.profiles.get(recipientId);
    if (!profile) return false; // No profile → no DND

    const nowHour = new Date().getHours();
    const { dndStartHour, dndEndHour } = profile;

    // Handle overnight window (e.g. 22 → 7)
    if (dndStartHour > dndEndHour) {
      return nowHour >= dndStartHour || nowHour < dndEndHour;
    }
    // Same-day window (e.g. 12 → 14 for midday DND)
    return nowHour >= dndStartHour && nowHour < dndEndHour;
  }

  // ---------------------------------------------------------------------------
  // Address Resolution
  // ---------------------------------------------------------------------------

  public getRecipientAddress(
    recipientId: string,
    channel: NotificationChannel
  ): string | undefined {
    const profile = this.profiles.get(recipientId);
    if (!profile) return undefined;
    return profile.channels[channel];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private buildPrefKey(recipientId: string, category: NotificationCategory): string {
    return `${recipientId}::${category}`;
  }
}
