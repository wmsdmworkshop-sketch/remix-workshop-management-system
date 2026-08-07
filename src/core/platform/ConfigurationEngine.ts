/**
 * DWIP Enterprise - Core Platform Configuration Engine
 * Sprint IL-001 Architecture
 * 
 * Manages configuration settings for external systems:
 * System Name, Base URL, Auth Type, Timeout, Retry Count, Cache Duration, Enable/Disable, Environment.
 */

export interface IntegrationSystemConfig {
  id: string;
  code: string;
  name: string;
  baseUrl: string;
  authType: 'OAUTH2' | 'API_KEY' | 'BASIC' | 'JWT' | 'CUSTOM';
  authConfig?: Record<string, any>;
  timeoutMs: number;
  retryCount: number;
  cacheDurationSec: number;
  enabled: boolean;
  environment: 'DEV' | 'STAGING' | 'PILOT' | 'PRODUCTION';
  createdAt: string;
  updatedAt: string;
}

export class ConfigurationEngine {
  private static instance: ConfigurationEngine;
  private configs: Map<string, IntegrationSystemConfig> = new Map();

  private constructor() {
    this.seedBaselineConfigs();
  }

  public static getInstance(): ConfigurationEngine {
    if (!ConfigurationEngine.instance) {
      ConfigurationEngine.instance = new ConfigurationEngine();
    }
    return ConfigurationEngine.instance;
  }

  private seedBaselineConfigs(): void {
    const now = new Date().toISOString();
    
    this.configs.set('TMSA', {
      id: 'sys_tmsa',
      code: 'TMSA',
      name: 'TMSA Enterprise Gateway',
      baseUrl: 'https://gateway.internal/tmsa',
      authType: 'OAUTH2',
      timeoutMs: 10000,
      retryCount: 3,
      cacheDurationSec: 3600,
      enabled: true,
      environment: 'DEV',
      createdAt: now,
      updatedAt: now
    });

    this.configs.set('DMS', {
      id: 'sys_dms',
      code: 'DMS',
      name: 'Dealer Management System (DMS)',
      baseUrl: 'https://dms.internal/api',
      authType: 'API_KEY',
      timeoutMs: 8000,
      retryCount: 3,
      cacheDurationSec: 1800,
      enabled: true,
      environment: 'DEV',
      createdAt: now,
      updatedAt: now
    });

    this.configs.set('FLEETEDGE', {
      id: 'sys_fleetedge',
      code: 'FLEETEDGE',
      name: 'FleetEdge Telematics System',
      baseUrl: 'https://fleetedge.internal/telematics',
      authType: 'JWT',
      timeoutMs: 5000,
      retryCount: 5,
      cacheDurationSec: 600,
      enabled: true,
      environment: 'DEV',
      createdAt: now,
      updatedAt: now
    });
  }

  public getConfig(code: string): IntegrationSystemConfig | null {
    return this.configs.get(code.toUpperCase()) || null;
  }

  public getAllConfigs(): IntegrationSystemConfig[] {
    return Array.from(this.configs.values());
  }

  public updateConfig(code: string, updates: Partial<IntegrationSystemConfig>): IntegrationSystemConfig {
    const upperCode = code.toUpperCase();
    const existing = this.configs.get(upperCode);
    if (!existing) {
      throw new Error(`[CONFIGURATION_ENGINE] External system config '${code}' not found.`);
    }

    const updated: IntegrationSystemConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.configs.set(upperCode, updated);
    return updated;
  }

  public registerNewSystem(config: Omit<IntegrationSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): IntegrationSystemConfig {
    const upperCode = config.code.toUpperCase();
    const now = new Date().toISOString();
    const newConfig: IntegrationSystemConfig = {
      ...config,
      id: `sys_${upperCode.toLowerCase()}_${Date.now()}`,
      code: upperCode,
      createdAt: now,
      updatedAt: now
    };
    this.configs.set(upperCode, newConfig);
    return newConfig;
  }

  public toggleSystemStatus(code: string, enabled: boolean): IntegrationSystemConfig {
    return this.updateConfig(code, { enabled });
  }
}

export const configurationEngine = ConfigurationEngine.getInstance();
