import { pool as db } from "../../db/index";

export class ConfigurationEngine {
  private cache: Map<string, string> = new Map();

  public async getConfiguration(key: string, branchId?: string): Promise<string | null> {
    const cacheKey = branchId ? `${branchId}_${key}` : key;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (branchId) {
      const [branchConfigs] = await db.execute("SELECT config_value FROM tbl_branch_configuration WHERE branch_id = ? AND config_key = ?", [branchId, key]) as any[];
      if (branchConfigs.length > 0) {
        this.cache.set(cacheKey, branchConfigs[0].config_value);
        return branchConfigs[0].config_value;
      }
    }

    const [sysConfigs] = await db.execute("SELECT config_value FROM tbl_system_configuration WHERE config_key = ?", [key]) as any[];
    if (sysConfigs.length > 0) {
      this.cache.set(cacheKey, sysConfigs[0].config_value);
      return sysConfigs[0].config_value;
    }

    return null;
  }

  public async getFeatureFlag(key: string): Promise<boolean> {
    if (this.cache.has(`FLAG_${key}`)) {
      return this.cache.get(`FLAG_${key}`) === 'true';
    }

    const [flags] = await db.execute("SELECT is_enabled, rollout_percentage FROM tbl_feature_flag WHERE flag_key = ?", [key]) as any[];
    if (flags.length > 0) {
      const isEnabled = flags[0].is_enabled;
      // In production, we'd evaluate rollout_percentage against a hash of the user context. For simplicity, just return enabled.
      this.cache.set(`FLAG_${key}`, isEnabled ? 'true' : 'false');
      return isEnabled;
    }

    return false;
  }

  public invalidateCache() {
    this.cache.clear();
  }
}
