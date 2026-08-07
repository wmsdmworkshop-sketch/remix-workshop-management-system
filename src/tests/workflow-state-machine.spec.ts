import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowStateMachine } from "../core/workflow-state-machine";
import { BusinessContextFactory, BusinessContext } from "../core/business-context";

describe("Workflow State Machine", () => {
  let context: BusinessContext;

  beforeEach(() => {
    context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Technician" },
      { correlation_id: "TEST-CORR-123" }
    );
  });

  it("should allow a valid transition", async () => {
    const sm = new WorkflowStateMachine({
      workflow_type: "Test",
      states: ["A", "B"],
      initial_state: "A",
      transitions: {
        "A": ["B"]
      }
    });

    const result = await sm.transition(context, {
      current_state: "A",
      target_state: "B"
    });

    expect(result.success).toBe(true);
    expect(result.data?.from).toBe("A");
    expect(result.data?.to).toBe("B");
    expect(result.correlation_id).toBe("TEST-CORR-123");
  });

  it("should block an invalid transition", async () => {
    const sm = new WorkflowStateMachine({
      workflow_type: "Test",
      states: ["A", "B", "C"],
      initial_state: "A",
      transitions: {
        "A": ["B"]
      }
    });

    const result = await sm.transition(context, {
      current_state: "A",
      target_state: "C"
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid transition from 'A' to 'C'");
  });

  it("should block transition if validation rule fails", async () => {
    const sm = new WorkflowStateMachine({
      workflow_type: "Test",
      states: ["A", "B"],
      initial_state: "A",
      transitions: {
        "A": ["B"]
      },
      validation_rules: {
        "B": async (ctx, cmd) => {
          return "Validation rule failed for B";
        }
      }
    });

    const result = await sm.transition(context, {
      current_state: "A",
      target_state: "B"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Validation rule failed for B");
  });

  it("should pass transition if validation rule passes", async () => {
    const sm = new WorkflowStateMachine({
      workflow_type: "Test",
      states: ["A", "B"],
      initial_state: "A",
      transitions: {
        "A": ["B"]
      },
      validation_rules: {
        "B": async (ctx, cmd) => {
          return true;
        }
      }
    });

    const result = await sm.transition(context, {
      current_state: "A",
      target_state: "B"
    });

    expect(result.success).toBe(true);
    expect(result.data?.to).toBe("B");
  });
});
