/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Channel Selector
 * Module: notification-hub/channel-selector.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7.5 (Channel Selection)
 *
 * Intelligently selects optimal delivery channels for a notification request.
 * Combines: preference engine, channel registry availability, and priority rules.
 * Single Responsibility: channel selection logic only.
 * =============================================================================
 */

import type {
  NotificationRequest,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
} from "./types.ts";
import type { IChannelRegistry } from "./channel-registry.ts";
import type { IPreferenceEngine } from "./preference-engine.ts";

export interface ChannelSelectionResult {
  readonly recipientId: string;
  readonly selectedChannels: ReadonlyArray<NotificationChannel>;
  readonly suppressedChannels: ReadonlyArray<NotificationChannel>;
  readonly suppressionReasons: Readonly<Record<string, string>>;
}

export interface IChannelSelector {
  select(
    request: NotificationRequest,
    recipientId: string
  ): ChannelSelectionResult;
}

export class ChannelSelector implements IChannelSelector {
  constructor(
    private readonly channelRegistry: IChannelRegistry,
    private readonly preferenceEngine: IPreferenceEngine
  ) {}

  /**
   * Selects channels for a specific recipient.
   *
   * Algorithm:
   * 1. Ask PreferenceEngine for enabled channels (applies DND + priority rules)
   * 2. Filter to channels that have a registered, enabled provider
   * 3. Verify recipient has an address for each channel
   * 4. Return selected + suppressed list with reasons
   */
  public select(
    request: NotificationRequest,
    recipientId: string
  ): ChannelSelectionResult {
    const suppressionReasons: Record<string, string> = {};

    // Step 1: Preference-based channel list
    const preferredChannels = this.preferenceEngine.getEnabledChannels(
      recipientId,
      request.category,
      request.priority,
      request.preferredChannels
    );

    const selected: NotificationChannel[] = [];
    const suppressed: NotificationChannel[] = [];

    for (const channel of preferredChannels) {
      // Step 2: Provider availability
      if (!this.channelRegistry.isEnabled(channel)) {
        suppressed.push(channel);
        suppressionReasons[channel] = `Channel "${channel}" has no enabled provider registered.`;
        continue;
      }

      // Step 3: Recipient has address for this channel
      const address = this.preferenceEngine.getRecipientAddress(recipientId, channel);
      if (!address) {
        suppressed.push(channel);
        suppressionReasons[channel] = `Recipient "${recipientId}" has no address for channel "${channel}".`;
        continue;
      }

      selected.push(channel);
    }

    // Safety: CRITICAL notifications must have at least one channel
    if (selected.length === 0 && request.priority === "CRITICAL") {
      // Force IN_APP as absolute fallback for CRITICAL
      if (this.channelRegistry.isEnabled("IN_APP")) {
        selected.push("IN_APP");
        delete suppressionReasons["IN_APP"];
      }
    }

    return {
      recipientId,
      selectedChannels: selected,
      suppressedChannels: suppressed,
      suppressionReasons,
    };
  }
}
