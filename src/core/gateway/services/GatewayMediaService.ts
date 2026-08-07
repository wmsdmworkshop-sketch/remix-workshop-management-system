/**
 * DWIP Enterprise Integration Gateway - GatewayMediaService
 */

import { DwipMedia } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayMediaService {
  async uploadMedia(providerId: string, media: Partial<DwipMedia>, buffer: Uint8Array): Promise<DwipMedia> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.uploadMedia(media, buffer);
  }
}
