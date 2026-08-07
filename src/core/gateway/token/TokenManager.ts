/**
 * DWIP Enterprise Integration Gateway - TokenManager
 * Manages OAuth2 JWT Bearer Tokens & Refresh Cycles
 */

import { IntegrationAuthSession } from '../types';
import { tokenStore, TokenStore } from './TokenStore';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class TokenManager {
  constructor(private store: TokenStore = tokenStore) {}

  public async getValidToken(providerId: string): Promise<string> {
    let session = this.store.getToken(providerId);

    if (!session || this.isExpired(session)) {
      session = await this.refreshToken(providerId);
    }

    return session.token;
  }

  public isExpired(session: IntegrationAuthSession): boolean {
    const now = Date.now();
    const expiry = new Date(session.expiresAt).getTime();
    return expiry - now < 60000; // Consider expired within 1 min of deadline
  }

  public async refreshToken(providerId: string): Promise<IntegrationAuthSession> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    const newSession = await adapter.authenticate();
    this.store.saveToken(providerId, newSession);
    return newSession;
  }

  public clear(providerId?: string): void {
    if (providerId) {
      this.store.removeToken(providerId);
    } else {
      this.store.clear();
    }
  }
}

export const tokenManager = new TokenManager();
