/**
 * DWIP Enterprise Integration Gateway - TokenStore
 */

import { IntegrationAuthSession } from '../types';

export class TokenStore {
  private store: Map<string, IntegrationAuthSession> = new Map();

  public saveToken(providerId: string, session: IntegrationAuthSession): void {
    this.store.set(providerId, session);
  }

  public getToken(providerId: string): IntegrationAuthSession | undefined {
    return this.store.get(providerId);
  }

  public removeToken(providerId: string): void {
    this.store.delete(providerId);
  }

  public clear(): void {
    this.store.clear();
  }
}

export const tokenStore = new TokenStore();
