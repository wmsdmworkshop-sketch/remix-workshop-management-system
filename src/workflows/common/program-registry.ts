import { ProgramConfig } from "./program-config";
import { ProgramCapabilities } from "./program-definition";

export class ProgramRegistry {
  private configs: Map<string, ProgramConfig> = new Map();

  register(config: ProgramConfig): void {
    const key = `${config.program_name}@${config.version}`;
    if (this.configs.has(key)) {
      throw new Error(`Program ${key} is already registered.`);
    }
    this.configs.set(key, config);
  }

  resolve(programName: string, version?: string): ProgramConfig {
    if (version) {
      const key = `${programName}@${version}`;
      const config = this.configs.get(key);
      if (!config) throw new Error(`Program ${key} not found.`);
      return config;
    }
    
    // Resolve latest version if version not provided
    let latest: ProgramConfig | null = null;
    for (const config of this.configs.values()) {
      if (config.program_name === programName) {
        if (!latest || config.version > latest.version) {
          latest = config;
        }
      }
    }
    
    if (!latest) throw new Error(`Program ${programName} not found.`);
    return latest;
  }

  list(): ProgramConfig[] {
    return Array.from(this.configs.values());
  }

  getDefinition(programName: string, version?: string): ProgramConfig {
    return this.resolve(programName, version);
  }

  getCapabilities(programName: string, version?: string): ProgramCapabilities {
    const config = this.resolve(programName, version);
    return config.capabilities;
  }
}
