/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Channel Registry
 * Module: notification-hub/channel-registry.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7 (Notification Hub)
 *
 * Manages channel provider registrations (interfaces only — no implementations).
 * Providers are injected at runtime. Channels are queried by selector for routing.
 * Wraps the kernel's INotificationProvider interface with hub-level metadata.
 * =============================================================================
 */

import type {
  NotificationChannel,
  IChannelProvider,
} from "./types.ts";

export interface ChannelRegistration {
  readonly channel: NotificationChannel;
  readonly provider: IChannelProvider;
  readonly isEnabled: boolean;
  readonly registeredAt: string;
  readonly priority: number; // Lower = preferred when multiple match
}

export interface IChannelRegistry {
  register(provider: IChannelProvider, priority?: number): void;
  enable(channel: NotificationChannel): void;
  disable(channel: NotificationChannel): void;
  getProvider(channel: NotificationChannel): IChannelProvider | undefined;
  isEnabled(channel: NotificationChannel): boolean;
  listEnabled(): ReadonlyArray<ChannelRegistration>;
  listAll(): ReadonlyArray<ChannelRegistration>;
}

export class ChannelRegistry implements IChannelRegistry {
  private readonly registrations = new Map<NotificationChannel, ChannelRegistration>();

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public register(provider: IChannelProvider, priority: number = 10): void {
    const existing = this.registrations.get(provider.channel);
    const registration: ChannelRegistration = {
      channel: provider.channel,
      provider,
      isEnabled: existing?.isEnabled ?? true,
      registeredAt: new Date().toISOString(),
      priority,
    };
    this.registrations.set(provider.channel, registration);
  }

  public enable(channel: NotificationChannel): void {
    this.setEnabled(channel, true);
  }

  public disable(channel: NotificationChannel): void {
    this.setEnabled(channel, false);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public getProvider(channel: NotificationChannel): IChannelProvider | undefined {
    const reg = this.registrations.get(channel);
    return reg?.isEnabled ? reg.provider : undefined;
  }

  public isEnabled(channel: NotificationChannel): boolean {
    return this.registrations.get(channel)?.isEnabled ?? false;
  }

  public listEnabled(): ReadonlyArray<ChannelRegistration> {
    return Array.from(this.registrations.values())
      .filter((r) => r.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }

  public listAll(): ReadonlyArray<ChannelRegistration> {
    return Array.from(this.registrations.values()).sort((a, b) => a.priority - b.priority);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private setEnabled(channel: NotificationChannel, enabled: boolean): void {
    const existing = this.registrations.get(channel);
    if (!existing) {
      throw new Error(
        `[ChannelRegistry] Cannot toggle channel "${channel}": no provider registered.`
      );
    }
    this.registrations.set(channel, { ...existing, isEnabled: enabled });
  }
}
