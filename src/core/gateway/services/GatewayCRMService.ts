/**
 * DWIP Enterprise Integration Gateway - GatewayCRMService
 */

import { DwipCustomer } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayCRMService {
  async getCustomerById(providerId: string, customerId: string): Promise<DwipCustomer | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getCustomerById(customerId);
  }

  async syncCustomer(providerId: string, customer: Partial<DwipCustomer>): Promise<DwipCustomer> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.syncCustomer(customer);
  }
}
