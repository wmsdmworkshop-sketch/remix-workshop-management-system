/**
 * DWIP Enterprise Integration Gateway - GatewayAuthenticationService
 */

import { IntegrationAuthSession } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayAuthenticationService {
  async authenticate(providerId: string): Promise<IntegrationAuthSession> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.authenticate();
  }

  async refreshToken(providerId: string, token: string): Promise<IntegrationAuthSession> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.refreshToken(token);
  }
}
