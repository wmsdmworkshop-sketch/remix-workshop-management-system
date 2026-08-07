/**
 * DWIP Enterprise Integration Gateway - OemProviderRegistry
 * Central Provider Registry for IOemAdapter instances
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { IOemAdapter } from './IOemAdapter';
import { GenericOemAdapter } from './GenericOemAdapter';
import { GatewayException } from '../error/GatewayException';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class OemProviderRegistry {
  private static registry: Map<string, IOemAdapter> = new Map();

  static {
    OemProviderRegistry.registerDefaultProviders();
  }

  private static registerDefaultProviders(): void {
    const defaultTmsa = new GenericOemAdapter('TMSA', 'https://gateway.internal/tmsa');
    const defaultDms = new GenericOemAdapter('DMS', 'https://dms.internal/api');
    const defaultFleetEdge = new GenericOemAdapter('FLEETEDGE', 'https://fleetedge.internal/telematics');

    OemProviderRegistry.registry.set('TMSA', defaultTmsa);
    OemProviderRegistry.registry.set('DMS', defaultDms);
    OemProviderRegistry.registry.set('FLEETEDGE', defaultFleetEdge);
    OemProviderRegistry.registry.set('GENERIC_OEM', new GenericOemAdapter('GENERIC_OEM'));
  }

  public static registerProvider(adapter: IOemAdapter): void {
    OemProviderRegistry.registry.set(adapter.providerId, adapter);
    StructuredLogger.info(`Registered OEM Provider Adapter: ${adapter.providerId}`, {
      component: 'OemProviderRegistry',
      operation: 'registerProvider',
      result: 'SUCCESS',
      providerId: adapter.providerId
    });
  }

  public static getProvider(providerId: string): IOemAdapter {
    const adapter = OemProviderRegistry.registry.get(providerId);
    if (!adapter) {
      throw new GatewayException(
        `OEM Provider '${providerId}' is not registered in OemProviderRegistry.`,
        'PROVIDER_NOT_REGISTERED',
        404
      );
    }
    return adapter;
  }

  public static hasProvider(providerId: string): boolean {
    return OemProviderRegistry.registry.has(providerId);
  }

  public static getAllProviders(): IOemAdapter[] {
    return Array.from(OemProviderRegistry.registry.values());
  }

  public static clear(): void {
    OemProviderRegistry.registry.clear();
    OemProviderRegistry.registerDefaultProviders();
  }
}
