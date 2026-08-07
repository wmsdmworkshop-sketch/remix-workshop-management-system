/**
 * DWIP Enterprise Integration Gateway - GatewayKYCService
 */

import { DwipKycRecordV1 } from '../contracts/v1/IKycContract';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayKYCService {
  async verifyKycDocument(providerId: string, docType: string, docNumber: string): Promise<DwipKycRecordV1> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.verifyKycDocument(docType, docNumber);
  }
}
