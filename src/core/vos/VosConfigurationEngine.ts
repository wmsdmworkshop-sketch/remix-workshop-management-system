/**
 * DWIP Enterprise - VOS Configuration Engine (Module 7)
 * Sprint 1 Architecture
 * 
 * Manages VOS operational policies, timeout thresholds, and deviation approval rules.
 */

import { VosConfig } from './types';

export class VosConfigurationEngine {
  private static instance: VosConfigurationEngine;
  private configs: Map<string, VosConfig> = new Map();

  private constructor() {
    this.seedBaselineConfigs();
  }

  public static getInstance(): VosConfigurationEngine {
    if (!VosConfigurationEngine.instance) {
      VosConfigurationEngine.instance = new VosConfigurationEngine();
    }
    return VosConfigurationEngine.instance;
  }

  private seedBaselineConfigs(): void {
    const now = new Date().toISOString();
    this.setConfig('vos.require_job_card_or_deviation_for_gate_out', 'true', 'Gate out requires OEM Job Card or Approved Deviation');
    this.setConfig('vos.allow_workshop_wip_before_job_card', 'true', 'Job Card must not block workshop operations');
    this.setConfig('vos.operational_readiness_required_for_milestones', 'true', 'CRM and OEM Job Card creation require Operational Readiness');
    this.setConfig('vos.default_session_timeout_hours', '48', 'Max hours allowed for an open VOS');
  }

  public setConfig(key: string, value: string, description?: string): VosConfig {
    const config: VosConfig = {
      id: `cfg_${key.replace(/[^a-z0-9]/gi, '_')}`,
      configKey: key,
      configValue: value,
      description,
      updatedAt: new Date().toISOString()
    };
    this.configs.set(key, config);
    return config;
  }

  public getConfig(key: string, defaultValue?: string): string {
    const cfg = this.configs.get(key);
    return cfg ? cfg.configValue : (defaultValue ?? '');
  }

  public getBooleanConfig(key: string, defaultValue = false): boolean {
    const val = this.getConfig(key);
    if (!val) return defaultValue;
    return val.toLowerCase() === 'true' || val === '1';
  }

  public getAllConfigs(): VosConfig[] {
    return Array.from(this.configs.values());
  }
}

export const vosConfigurationEngine = VosConfigurationEngine.getInstance();
