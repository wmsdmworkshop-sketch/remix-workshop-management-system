/**
 * DWIP Enterprise - Core Platform Authentication Engine
 * Sprint IL-001 Architecture
 * 
 * Features:
 * - Enterprise session token management for external connectors
 * - Token creation, validation, refresh, and expiry tracking
 * - System credential rotation hooks
 */

import { IntegrationAuthSession } from '../../integrations/common/types';

export class AuthenticationEngine {
  private static instance: AuthenticationEngine;
  private activeSessions: Map<string, IntegrationAuthSession> = new Map();

  private constructor() {
    this.seedBaselineSessions();
  }

  public static getInstance(): AuthenticationEngine {
    if (!AuthenticationEngine.instance) {
      AuthenticationEngine.instance = new AuthenticationEngine();
    }
    return AuthenticationEngine.instance;
  }

  private seedBaselineSessions(): void {
    const now = Date.now();
    this.activeSessions.set('TMSA', {
      token: 'TMSA_SIMULATED_SESSION_TOKEN_1001',
      expiresAt: new Date(now + 3600000),
      tokenType: 'Bearer',
      systemCode: 'TMSA',
      metadata: { environment: 'DEV', scope: 'read_write' }
    });
    this.activeSessions.set('DMS', {
      token: 'DMS_SIMULATED_SESSION_TOKEN_2002',
      expiresAt: new Date(now + 3600000),
      tokenType: 'Bearer',
      systemCode: 'DMS',
      metadata: { environment: 'DEV', scope: 'full_access' }
    });
    this.activeSessions.set('FLEETEDGE', {
      token: 'FE_SIMULATED_SESSION_TOKEN_3003',
      expiresAt: new Date(now + 3600000),
      tokenType: 'Bearer',
      systemCode: 'FLEETEDGE',
      metadata: { environment: 'DEV', scope: 'telematics' }
    });
  }

  public async getValidSession(systemCode: string): Promise<IntegrationAuthSession> {
    const upperCode = systemCode.toUpperCase();
    const existing = this.activeSessions.get(upperCode);
    
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return existing;
    }

    // Refresh or generate new session
    const newSession: IntegrationAuthSession = {
      token: `${upperCode}_ACTIVE_TOKEN_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
      tokenType: 'Bearer',
      systemCode: upperCode,
      metadata: { environment: 'AUTO_REFRESHED' }
    };
    this.activeSessions.set(upperCode, newSession);
    return newSession;
  }

  public async validateToken(systemCode: string, token: string): Promise<boolean> {
    const session = this.activeSessions.get(systemCode.toUpperCase());
    if (!session) return false;
    return session.token === token && session.expiresAt.getTime() > Date.now();
  }

  public async revokeSession(systemCode: string): Promise<boolean> {
    return this.activeSessions.delete(systemCode.toUpperCase());
  }

  public getAllActiveSessions(): IntegrationAuthSession[] {
    return Array.from(this.activeSessions.values());
  }
}

export const authenticationEngine = AuthenticationEngine.getInstance();
