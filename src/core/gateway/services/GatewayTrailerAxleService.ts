/**
 * DWIP Enterprise Integration Gateway - GatewayTrailerAxleService
 */

import { DwipTrailerAxleDataV1 } from '../contracts/v1/ITrailerAxleContract';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayTrailerAxleService {
  async getTrailerTelemetry(providerId: string, trailerId: string): Promise<DwipTrailerAxleDataV1 | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getTrailerTelemetry(trailerId);
  }
}
