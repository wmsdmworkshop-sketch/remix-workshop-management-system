/**
 * DWIP Enterprise - Core Platform Integration Engine
 * Sprint IL-001 Architecture
 * 
 * Central Orchestration Hub connecting DWIP Core Platform Engines to the Integration Layer.
 */

import { integrationRegistry, IIntegrationConnector } from '../../integrations';
import { apiGateway } from './ApiGateway';
import { cacheEngine } from './CacheEngine';
import { auditEngine } from './AuditEngine';
import { syncEngine } from './SyncEngine';
import { monitoringEngine } from './MonitoringEngine';
import { configurationEngine } from './ConfigurationEngine';

export class IntegrationEngine {
  private static instance: IntegrationEngine;

  private constructor() {}

  public static getInstance(): IntegrationEngine {
    if (!IntegrationEngine.instance) {
      IntegrationEngine.instance = new IntegrationEngine();
    }
    return IntegrationEngine.instance;
  }

  public getConnector(systemCode: string): IIntegrationConnector {
    return integrationRegistry.getConnector(systemCode);
  }

  public listRegisteredConnectors(): Array<{ code: string; name: string; status: string }> {
    return integrationRegistry.getAllConnectors().map(c => {
      const cfg = configurationEngine.getConfig(c.systemCode);
      return {
        code: c.systemCode,
        name: c.name,
        status: cfg?.enabled ? 'ACTIVE' : 'DISABLED'
      };
    });
  }

  public async executeExternalCall<T = any>(
    systemCode: string,
    apiName: string,
    payload?: any,
    options?: { userId?: string; branchId?: string; moduleId?: string; useCache?: boolean; cacheTtlSec?: number }
  ): Promise<{ success: boolean; data?: T; error?: string; correlationId: string }> {
    const code = systemCode.toUpperCase();
    const cacheKey = `ext_call_${code}_${apiName}_${JSON.stringify(payload || {})}`;

    if (options?.useCache) {
      const cached = await cacheEngine.get<T>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          correlationId: `cache_hit_${Date.now()}`
        };
      }
    }

    const res = await apiGateway.executeRequest<T>({
      systemCode: code,
      apiName,
      body: payload,
      userId: options?.userId,
      branchId: options?.branchId,
      moduleId: options?.moduleId
    });

    if (res.success && res.data && options?.useCache) {
      await cacheEngine.set(cacheKey, res.data, options.cacheTtlSec || 3600, `tag_${code}`);
    }

    return {
      success: res.success,
      data: res.data,
      error: res.error?.message,
      correlationId: res.correlationId
    };
  }
}

export const integrationEngine = IntegrationEngine.getInstance();
