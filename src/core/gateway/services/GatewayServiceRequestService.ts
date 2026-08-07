/**
 * DWIP Enterprise Integration Gateway - GatewayServiceRequestService
 */

import { DwipServiceRequestV1 } from '../contracts/v1/IServiceRequestContract';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayServiceRequestService {
  async getServiceRequest(providerId: string, requestId: string): Promise<DwipServiceRequestV1 | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getServiceRequest(requestId);
  }

  async createServiceRequest(providerId: string, request: Partial<DwipServiceRequestV1>): Promise<DwipServiceRequestV1> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.createServiceRequest(request);
  }
}
