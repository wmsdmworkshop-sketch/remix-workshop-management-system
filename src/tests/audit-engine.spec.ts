import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "../core/event-bus";
import { AuditEngine } from "../core/audit-engine";
import { BusinessContextFactory } from "../core/business-context";

describe("Audit Engine", () => {
  let eventBus: EventBus;
  let auditEngine: AuditEngine;
  let mockDB: any;

  beforeEach(() => {
    mockDB = { audit_logs: [] };
    eventBus = new EventBus();
    auditEngine = new AuditEngine(
      eventBus,
      () => mockDB,
      async (state) => { mockDB = state; }
    );
  });

  it("should capture events published directly to the event bus", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "JC-100" },
      { user_id: "EMP001", role: "Service Advisor" }
    );

    // Publish an event
    await eventBus.publish("JOB_CREATED", { status: "Draft" }, context);

    // Wait a tick for async handler to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    const trail = auditEngine.getAuditTrail("JC-100", "JobCard");
    expect(trail.length).toBe(1);
    expect(trail[0].topic).toBe("JOB_CREATED");
    expect(trail[0].actor_id).toBe("EMP001");
    expect(trail[0].payload_snapshot).toEqual({ status: "Draft" });
  });

  it("should support transactional outbox pattern (stage and process)", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "JC-200" },
      { user_id: "EMP002", role: "Technician" }
    );

    const txConnection = { 
      outbox: [] as any[],
      execute: async (query: string, params: any[]) => {
        // Mock the DB insert by appending the deserialized payload to the test outbox
        txConnection.outbox.push(JSON.parse(params[2]));
      }
    };
    
    // Stage the event (simulating inside a transaction)
    await eventBus.stageEvent("EVIDENCE_UPLOADED", { file: "test.pdf" }, context, txConnection);

    // Assert that the event is NOT in the audit log yet
    expect(auditEngine.getAuditTrail("JC-200").length).toBe(0);
    expect(txConnection.outbox.length).toBe(1);

    // Simulate transaction commit and outbox processing
    await eventBus.processOutbox(txConnection);

    // Wait a tick for async handler to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    const trail = auditEngine.getAuditTrail("JC-200");
    expect(trail.length).toBe(1);
    expect(trail[0].topic).toBe("EVIDENCE_UPLOADED");
    expect(trail[0].payload_snapshot).toEqual({ file: "test.pdf" });
    // Outbox should be cleared after processing
    expect(txConnection.outbox.length).toBe(0);
  });

  it("should enforce immutability on the audit trail", async () => {
    const context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "JC-300" },
      { user_id: "EMP003", role: "Manager" }
    );

    await eventBus.publish("APPROVAL_DECISION", { status: "Approved" }, context);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const trail = auditEngine.getAuditTrail("JC-300");
    const record = trail[0];
    
    expect(() => {
      // @ts-ignore
      record.topic = "TAMPERED_TOPIC";
    }).toThrow();

    expect(() => {
      record.payload_snapshot.status = "Rejected";
    }).toThrow();
  });
});
