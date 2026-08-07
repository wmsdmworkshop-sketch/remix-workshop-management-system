/**
 * DWIP Enterprise Integration Gateway - GatewayJobCardService
 */

import { DwipJobCard } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayJobCardService {
  async getJobCardById(providerId: string, jobCardId: string): Promise<DwipJobCard | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getJobCardById(jobCardId);
  }

  async syncJobCard(providerId: string, jobCard: Partial<DwipJobCard>): Promise<DwipJobCard> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.syncJobCard(jobCard);
  }
}
