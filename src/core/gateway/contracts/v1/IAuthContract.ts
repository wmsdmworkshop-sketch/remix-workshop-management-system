/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IAuthContract: Authentication API Contract Interface v1
 */

import { IntegrationAuthSession } from '../../types';

export interface IAuthContractV1 {
  readonly contractVersion: 'v1';

  authenticate(credentials?: Record<string, any>): Promise<IntegrationAuthSession>;
  refreshToken(token: string): Promise<IntegrationAuthSession>;
  validateSession(token: string): Promise<boolean>;
  logout(token: string): Promise<void>;
}
