import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowStrategyRegistry } from "../workflows/workflow-strategy-registry";
import { WarrantyWorkflowStrategy } from "../workflows/warranty/warranty-strategy";
import { AMCWorkflowStrategy } from "../workflows/amc/amc-strategy";
import { MockWarrantyProvider } from "../workflows/warranty/oem-provider";
import { AmcProvider } from "../workflows/amc/amc-provider";

describe("Business Program Framework Reusability", () => {
  let strategyRegistry: WorkflowStrategyRegistry;

  beforeEach(() => {
    strategyRegistry = new WorkflowStrategyRegistry();
  });

  it("should allow both Warranty and AMC to be registered as workflow strategies concurrently", () => {
    const provider = new MockWarrantyProvider();
    const amcProvider = new AmcProvider();
    
    const warrantyStrategy = new WarrantyWorkflowStrategy(provider);
    const amcStrategy = new AMCWorkflowStrategy(amcProvider); // Both share the ExternalProgramProvider interface 

    strategyRegistry.registerStrategy(warrantyStrategy);
    strategyRegistry.registerStrategy(amcStrategy);

    const resolvedWarranty = strategyRegistry.getStrategy("Warranty");
    const resolvedAMC = strategyRegistry.getStrategy("AMC");

    expect(resolvedWarranty).toBeDefined();
    expect(resolvedWarranty?.getWorkflowType()).toBe("Warranty");

    expect(resolvedAMC).toBeDefined();
    expect(resolvedAMC?.getWorkflowType()).toBe("AMC");
  });
});
