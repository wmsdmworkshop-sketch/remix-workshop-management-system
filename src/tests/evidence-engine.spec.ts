import { describe, it, expect, beforeEach } from "vitest";
import { EvidenceManagementEngine } from "../core/evidence-engine";
import { LocalStorageProvider } from "../core/storage-provider";
import { WorkflowRegistry } from "../core/workflow-registry";
import { EventBus } from "../core/event-bus";
import { BusinessContextFactory, BusinessContext } from "../core/business-context";

describe("Evidence Management Engine", () => {
  let engine: EvidenceManagementEngine;
  let eventBus: EventBus;
  let registry: WorkflowRegistry;
  let mockDB: any;
  let context: BusinessContext;

  beforeEach(() => {
    mockDB = { evidence: [] };
    eventBus = new EventBus();
    registry = new WorkflowRegistry();
    const storageProvider = new LocalStorageProvider();
    
    engine = new EvidenceManagementEngine(
      storageProvider,
      eventBus,
      registry,
      () => mockDB,
      async (state) => { mockDB = state; }
    );

    context = BusinessContextFactory.create(
      { entity_type: "JobCard", entity_id: "100" },
      { user_id: "EMP001", role: "Technician" },
      { correlation_id: "TEST-CORR-123" }
    );
  });

  it("should upload evidence and emit event", async () => {
    let eventEmitted = false;
    eventBus.subscribe("EvidenceUploaded", async (e: any) => {
      eventEmitted = true;
      expect(e.payload.evidence_type).toBe("VehiclePhoto");
    });

    const result = await engine.uploadEvidence(context, {
      workflow_type: "Retail",
      evidence_type: "VehiclePhoto",
      fileBuffer: Buffer.from("fake data"),
      metadata: {
        mime_type: "image/jpeg",
        file_size: 1024,
        original_name: "photo.jpg",
        gps_latitude: "18.5204",
        gps_longitude: "73.8567"
      }
    });

    expect(result.success).toBe(true);
    expect(result.data?.evidence_id).toBeDefined();
    expect(result.data?.storage_provider).toBe("LocalStorage");
    expect(result.data?.version).toBe(1);
    expect(result.data?.gps_latitude).toBe("18.5204");
    expect(mockDB.evidence.length).toBe(1);
    
    await new Promise(r => setTimeout(r, 10));
    expect(eventEmitted).toBe(true);
  });

  it("should correctly calculate completeness score based on workflow profile", async () => {
    const completenessBefore = engine.calculateCompleteness(context, {
      workflow_type: "Warranty",
      target_state: "WARRANTY_CLAIM_PENDING"
    });
    
    expect(completenessBefore.total_required).toBe(2);
    expect(completenessBefore.uploaded).toBe(0);
    expect(completenessBefore.missing).toContain("ECU_Diagnostic_Report");
    expect(completenessBefore.missing).toContain("DTC_Log");
    expect(completenessBefore.completion_percentage).toBe(0);

    await engine.uploadEvidence(context, {
      workflow_type: "Warranty",
      evidence_type: "ECU_Diagnostic_Report",
      fileBuffer: Buffer.from("report"),
      metadata: { mime_type: "application/pdf", file_size: 100, original_name: "report.pdf" }
    });

    const completenessPartial = engine.calculateCompleteness(context, {
      workflow_type: "Warranty",
      target_state: "WARRANTY_CLAIM_PENDING"
    });
    expect(completenessPartial.uploaded).toBe(1);
    expect(completenessPartial.completion_percentage).toBe(50);
    expect(completenessPartial.missing).not.toContain("ECU_Diagnostic_Report");
    expect(completenessPartial.missing).toContain("DTC_Log");

    await engine.uploadEvidence(context, {
      workflow_type: "Warranty",
      evidence_type: "DTC_Log",
      fileBuffer: Buffer.from("log"),
      metadata: { mime_type: "text/plain", file_size: 50, original_name: "dtc.txt" }
    });

    const completenessFull = engine.calculateCompleteness(context, {
      workflow_type: "Warranty",
      target_state: "WARRANTY_CLAIM_PENDING"
    });
    expect(completenessFull.uploaded).toBe(2);
    expect(completenessFull.completion_percentage).toBe(100);
    expect(completenessFull.missing.length).toBe(0);
  });

  it("should support evidence versioning and archive old versions", async () => {
    const v1Result = await engine.uploadEvidence(context, {
      workflow_type: "Retail",
      evidence_type: "Invoice",
      fileBuffer: Buffer.from("v1"),
      metadata: { mime_type: "application/pdf", file_size: 10, original_name: "inv.pdf" }
    });

    const v1 = v1Result.data!;
    expect(v1.version).toBe(1);
    expect(v1.lifecycle_status).toBe("Uploaded");

    let versionEventEmitted = false;
    eventBus.subscribe("EvidenceVersionCreated", async (e) => {
      versionEventEmitted = true;
    });

    const v2Result = await engine.uploadEvidence(context, {
      workflow_type: "Retail",
      evidence_type: "Invoice",
      fileBuffer: Buffer.from("v2"),
      parent_version_id: v1.evidence_id,
      revision_reason: "Customer name correction",
      metadata: { mime_type: "application/pdf", file_size: 20, original_name: "inv_v2.pdf" }
    });

    const v2 = v2Result.data!;
    expect(v2.version).toBe(2);
    expect(v2.parent_version_id).toBe(v1.evidence_id);
    expect(v2.revision_reason).toBe("Customer name correction");

    const dbV1 = mockDB.evidence.find((e: any) => e.evidence_id === v1.evidence_id);
    expect(dbV1.lifecycle_status).toBe("Archived");
    
    await new Promise(r => setTimeout(r, 10));
    expect(versionEventEmitted).toBe(true);
  });
});
