import { describe, it, expect, beforeEach } from "vitest";
import { ProgramRegistry } from "../workflows/common/program-registry";
import { ProgramConfig } from "../workflows/common/program-config";

describe("Program Registry Integration", () => {
  let registry: ProgramRegistry;

  beforeEach(() => {
    registry = new ProgramRegistry();
  });

  it("should successfully register and resolve a program configuration", () => {
    const warrantyConfig: ProgramConfig = {
      program_name: "Warranty",
      version: "1.0.0",
      category: "WARRANTY",
      capabilities: {
        supports_financial: true,
        supports_oem: true,
        supports_recovery: true,
        supports_settlement: true,
        supports_sla: true,
        supports_evidence: true,
        supports_approval: true
      },
      lifecycle_definition: []
    };

    registry.register(warrantyConfig);
    const resolved = registry.resolve("Warranty", "1.0.0");
    
    expect(resolved).toBeDefined();
    expect(resolved.category).toBe("WARRANTY");
  });

  it("should prevent duplicate registration", () => {
    const config: ProgramConfig = {
      program_name: "AMC",
      version: "1.0.0",
      category: "AMC",
      capabilities: {
        supports_financial: true,
        supports_oem: false,
        supports_recovery: false,
        supports_settlement: false,
        supports_sla: true,
        supports_evidence: true,
        supports_approval: true
      },
      lifecycle_definition: []
    };

    registry.register(config);
    expect(() => registry.register(config)).toThrowError("Program AMC@1.0.0 is already registered.");
  });

  it("should return capabilities for a registered program", () => {
    const config: ProgramConfig = {
      program_name: "FSB",
      version: "1.0.0",
      category: "FSB",
      capabilities: {
        supports_financial: false,
        supports_oem: true,
        supports_recovery: false,
        supports_settlement: false,
        supports_sla: true,
        supports_evidence: true,
        supports_approval: false
      },
      lifecycle_definition: []
    };

    registry.register(config);
    const caps = registry.getCapabilities("FSB");
    
    expect(caps.supports_financial).toBe(false);
    expect(caps.supports_oem).toBe(true);
  });
});
