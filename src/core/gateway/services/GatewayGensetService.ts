/**
 * DWIP Enterprise Integration Gateway - GatewayGensetService
 */

import { DwipGensetDataV1 } from '../contracts/v1/IGensetContract';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayGensetService {
  async getGensetTelemetry(providerId: string, gensetId: string): Promise<DwipGensetDataV1 | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getGensetTelemetry(gensetId);
  }
}
