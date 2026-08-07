import { describe, it, expect } from "vitest";
import { BusinessContextFactory } from "../core/business-context";

describe("Business Context Engine", () => {
  it("should create an immutable BusinessContext", () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "123" },
      { user_id: "USR_1", role: "Admin", branch_id: "B_1" }
    );

    expect(context.identity.entity_type).toBe("JobCard");
    expect(context.traceability.correlation_id).toBeDefined();

    // Verify immutability
    expect(() => {
      // @ts-ignore
      context.identity.entity_id = "999";
    }).toThrowError(/Cannot assign to read only property/);

    expect(() => {
      // @ts-ignore
      context.actor.user_id = "USR_2";
    }).toThrowError(/Cannot assign to read only property/);
  });

  it("should create immutable ExecutionResults", () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "123" },
      { user_id: "USR_1", role: "Admin", branch_id: "B_1" }
    );

    const success = BusinessContextFactory.success(context, { transition: "Done" });
    expect(success.success).toBe(true);
    expect(success.data?.transition).toBe("Done");
    expect(success.correlation_id).toBe(context.traceability.correlation_id);

    expect(() => {
      // @ts-ignore
      success.success = false;
    }).toThrowError(/Cannot assign to read only property/);

    const failure = BusinessContextFactory.failure(context, "Validation failed");
    expect(failure.success).toBe(false);
    expect(failure.error).toBe("Validation failed");

    expect(() => {
      // @ts-ignore
      failure.error = "Changed";
    }).toThrowError(/Cannot assign to read only property/);
  });
});
